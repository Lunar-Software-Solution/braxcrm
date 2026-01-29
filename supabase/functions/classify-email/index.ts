import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface ClassifyEmailRequest {
  email_id: string;
  subject: string;
  body_preview: string;
  sender_email: string;
  sender_name: string;
  person_id?: string; // Optional - for checking existing entity mappings
}

interface EntityRule {
  id: string;
  entity_table: string;
  description: string | null;
  ai_prompt: string | null;
  is_active: boolean;
}

interface ClassificationResult {
  entity_table: string | null;
  confidence: number;
  reasoning: string;
}

const ENTITY_TABLES = [
  "influencers",
  "resellers",
  "product_suppliers",
  "expense_suppliers",
  "corporate_management",
  "personal_contacts",
  "subscriptions",
];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      throw new Error("Unauthorized");
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    // Validate user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error("Unauthorized");
    }

    const { email_id, subject, body_preview, sender_email, sender_name, person_id }: ClassifyEmailRequest = await req.json();

    if (!email_id) {
      throw new Error("Missing required field: email_id");
    }

    // Check if person already has an entity mapping (skip AI if so)
    if (person_id) {
      const { data: existingMapping } = await supabase
        .from("people_entities")
        .select("entity_table")
        .eq("person_id", person_id)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();

      if (existingMapping?.entity_table) {
        // Use cached result - skip AI
        const result: ClassificationResult = {
          entity_table: existingMapping.entity_table,
          confidence: 1.0,
          reasoning: "Person already linked to this entity type",
        };

        // Update email_messages with the entity
        await supabase
          .from("email_messages")
          .update({
            entity_table: existingMapping.entity_table,
            ai_confidence: 1.0,
          })
          .eq("id", email_id);

        console.log(`Skipped AI - person ${person_id} already mapped to ${existingMapping.entity_table}`);

        return new Response(JSON.stringify(result), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Fetch entity automation rules
    const { data: rules, error: rulesError } = await supabase
      .from("entity_automation_rules")
      .select("id, entity_table, description, ai_prompt, is_active")
      .eq("is_active", true)
      .order("priority", { ascending: false });

    if (rulesError) {
      console.error("Error fetching entity rules:", rulesError);
      throw new Error("Failed to fetch entity rules");
    }

    // If no rules defined, return null classification
    if (!rules || rules.length === 0) {
      const result: ClassificationResult = {
        entity_table: null,
        confidence: 0,
        reasoning: "No entity rules defined",
      };
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build entity types list from rules
    const entityList = (rules as EntityRule[])
      .map((r, i) => `${i + 1}. ${r.entity_table.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())} - ${r.ai_prompt || r.description || ""}`)
      .join("\n");

    const prompt = `You are an email classification assistant. Analyze this email and determine which CRM entity type the sender belongs to.

Available Entity Types:
${entityList}

Email Details:
- From: ${sender_name} <${sender_email}>
- Subject: ${subject || "(no subject)"}
- Preview: ${body_preview || "(no content)"}

Classify the sender into ONE of the entity types above based on the email content and sender information.

Respond with a JSON object containing:
- "entity_table": The exact entity table name in snake_case (e.g., "influencers", "product_suppliers", "personal_contacts") or null if no good match
- "confidence": A number between 0 and 1 indicating your confidence
- "reasoning": A brief explanation of why you chose this entity type

Only respond with the JSON object, no other text.`;

    // Call Lovable AI Gateway
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "You are an email classification assistant. Always respond with valid JSON." },
          { role: "user", content: prompt },
        ],
        temperature: 0.3,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("AI Gateway error:", aiResponse.status, errorText);
      
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded, please try again later" }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted" }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      throw new Error("AI classification failed");
    }

    const aiData = await aiResponse.json();
    const aiContent = aiData.choices?.[0]?.message?.content;

    if (!aiContent) {
      throw new Error("No response from AI");
    }

    // Parse AI response
    let parsedResponse: { entity_table: string | null; confidence: number; reasoning: string };
    try {
      // Clean up the response (remove markdown code blocks if present)
      const cleanContent = aiContent.replace(/```json\n?|\n?```/g, "").trim();
      parsedResponse = JSON.parse(cleanContent);
    } catch (parseError) {
      console.error("Failed to parse AI response:", aiContent);
      throw new Error("Failed to parse AI classification response");
    }

    // Validate entity_table is a valid one
    let validEntityTable: string | null = null;
    if (parsedResponse.entity_table && ENTITY_TABLES.includes(parsedResponse.entity_table)) {
      validEntityTable = parsedResponse.entity_table;
    }

    const result: ClassificationResult = {
      entity_table: validEntityTable,
      confidence: Math.min(1, Math.max(0, parsedResponse.confidence || 0)),
      reasoning: parsedResponse.reasoning || "",
    };

    // Update the email_messages table with the entity classification
    if (result.entity_table) {
      await supabase
        .from("email_messages")
        .update({
          entity_table: result.entity_table,
          ai_confidence: result.confidence,
        })
        .eq("id", email_id);
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Classify email error:", message);
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: error instanceof Error && error.message === "Unauthorized" ? 401 : 500,
    });
  }
});
