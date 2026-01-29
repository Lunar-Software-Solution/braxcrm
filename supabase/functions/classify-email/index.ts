import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

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
  person_id?: string;
  sender_id?: string;
  user_id?: string;
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
  is_person: boolean;
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

// Helper to log classification
async function logClassification(
  supabase: SupabaseClient,
  emailId: string,
  userId: string | null,
  entityTable: string | null,
  confidence: number,
  source: string,
  success: boolean,
  errorMessage: string | null,
  processingTimeMs: number
) {
  try {
    // Use service client for logging to bypass RLS
    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    
    await serviceClient.from("email_classification_logs").insert({
      email_id: emailId,
      user_id: userId,
      entity_table: entityTable,
      confidence,
      source,
      success,
      error_message: errorMessage,
      processing_time_ms: processingTimeMs,
    });
  } catch (e) {
    console.error("Failed to log classification:", e);
  }
}

// Helper to detect if sender email looks like an automated/non-person address
function detectNonPersonPattern(email: string): boolean {
  const localPart = email.split('@')[0].toLowerCase();
  const patterns = [
    /^(noreply|no-reply|donotreply|do-not-reply)$/,
    /^(mailer|auto|bounce|daemon)$/,
    /^(newsletter|news|updates|digest|weekly|daily|monthly|bulletin)$/,
    /^(system|automated|notifications|alerts|notify|alert)$/,
    /^(support|info|hello|contact|sales|team|help|service|billing|feedback|inquiries)$/,
    /^(orders?|invoice|receipt|shipping|confirmation|booking)$/,
  ];
  return patterns.some(p => p.test(localPart));
}

// Helper to create sender record
async function createSenderRecord(
  supabase: SupabaseClient,
  email: string,
  displayName: string | null,
  userId: string
): Promise<string | null> {
  try {
    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Check if sender already exists
    const { data: existingSender } = await serviceClient
      .from("senders")
      .select("id")
      .ilike("email", email)
      .maybeSingle();

    if (existingSender) {
      return existingSender.id;
    }

    // Determine sender type from email pattern
    const localPart = email.split('@')[0].toLowerCase();
    let senderType = 'automated';
    if (/^(newsletter|news|updates|digest)/.test(localPart)) {
      senderType = 'newsletter';
    } else if (/^(support|info|hello|contact|sales|team|help)/.test(localPart)) {
      senderType = 'shared_inbox';
    } else if (/^(system|automated|notifications|alerts)/.test(localPart)) {
      senderType = 'system';
    }

    const domain = email.split('@')[1]?.toLowerCase() || null;

    const { data: newSender, error } = await serviceClient
      .from("senders")
      .insert({
        email: email.toLowerCase(),
        display_name: displayName,
        sender_type: senderType,
        domain,
        is_auto_created: true,
        created_by: userId,
      })
      .select("id")
      .single();

    if (error) {
      console.error("Failed to create sender:", error);
      // Race condition - try to fetch again
      const { data: retrySender } = await serviceClient
        .from("senders")
        .select("id")
        .ilike("email", email)
        .maybeSingle();
      return retrySender?.id || null;
    }

    return newSender?.id || null;
  } catch (e) {
    console.error("Error creating sender:", e);
    return null;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

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

    const { email_id, subject, body_preview, sender_email, sender_name, person_id, sender_id, user_id }: ClassifyEmailRequest = await req.json();
    const effectiveUserId = user_id || user.id;

    if (!email_id) {
      throw new Error("Missing required field: email_id");
    }

    // If email already has a sender_id, it's already determined to be non-person
    if (sender_id) {
      // Get the sender's cached entity mapping
      const { data: sender } = await supabase
        .from("senders")
        .select("entity_table")
        .eq("id", sender_id)
        .maybeSingle();

      if (sender?.entity_table) {
        const processingTime = Date.now() - startTime;
        
        await supabase
          .from("email_messages")
          .update({
            entity_table: sender.entity_table,
            ai_confidence: 1.0,
            is_person: false,
          })
          .eq("id", email_id);

        await logClassification(
          supabase,
          email_id,
          effectiveUserId,
          sender.entity_table,
          1.0,
          "cache",
          true,
          null,
          processingTime
        );

        console.log(`Skipped AI - sender ${sender_id} already mapped to ${sender.entity_table}`);

        const result: ClassificationResult = {
          entity_table: sender.entity_table,
          is_person: false,
          confidence: 1.0,
          reasoning: "Sender already linked to this entity type",
        };

        return new Response(JSON.stringify(result), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
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
        const processingTime = Date.now() - startTime;
        
        // Update email_messages with the entity and mark as person
        await supabase
          .from("email_messages")
          .update({
            entity_table: existingMapping.entity_table,
            ai_confidence: 1.0,
            is_person: true,
          })
          .eq("id", email_id);

        // Log the cached classification
        await logClassification(
          supabase,
          email_id,
          effectiveUserId,
          existingMapping.entity_table,
          1.0,
          "cache",
          true,
          null,
          processingTime
        );

        console.log(`Skipped AI - person ${person_id} already mapped to ${existingMapping.entity_table}`);

        const result: ClassificationResult = {
          entity_table: existingMapping.entity_table,
          is_person: true,
          confidence: 1.0,
          reasoning: "Person already linked to this entity type",
        };

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
      const processingTime = Date.now() - startTime;
      await logClassification(
        supabase,
        email_id,
        effectiveUserId,
        null,
        0,
        "ai",
        true,
        "No entity rules defined",
        processingTime
      );

      const result: ClassificationResult = {
        entity_table: null,
        is_person: true, // Default to person if unknown
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

    // Enhanced prompt that also determines person vs sender
    const prompt = `You are an email classification assistant. Analyze this email and determine:
1. Which CRM entity type the sender belongs to
2. Whether the sender is a real PERSON or an automated/non-person sender

SENDER TYPE CRITERIA:
- PERSON (is_person: true): Individual humans with personal names, personal correspondence, professionals reaching out directly
- NON-PERSON (is_person: false): 
  * Automated systems (noreply, notifications, alerts, mailer-daemon)
  * Shared inboxes (support@, info@, billing@, sales@, team@)
  * Newsletters and marketing emails
  * Transaction emails (orders@, invoice@, receipts@, shipping@)
  * System notifications from services/platforms

Available Entity Types:
${entityList}

Email Details:
- From: ${sender_name} <${sender_email}>
- Subject: ${subject || "(no subject)"}
- Preview: ${body_preview || "(no content)"}

Classify the sender and determine if they are a person. Consider:
- The email address pattern (noreply@, support@, invoice@ = non-person)
- The sender name (generic company names vs personal names)
- The email content style (personalized vs templated/automated)

Respond with a JSON object containing:
- "entity_table": The exact entity table name in snake_case (e.g., "influencers", "subscriptions") or null if no good match
- "is_person": true if this is a real individual person, false if automated/system/shared inbox
- "confidence": A number between 0 and 1 indicating your confidence
- "reasoning": A brief explanation of why you chose this entity type and person/non-person classification

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
      
      const processingTime = Date.now() - startTime;
      
      if (aiResponse.status === 429) {
        await logClassification(supabase, email_id, effectiveUserId, null, 0, "ai", false, "Rate limit exceeded", processingTime);
        return new Response(JSON.stringify({ error: "Rate limit exceeded, please try again later" }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        await logClassification(supabase, email_id, effectiveUserId, null, 0, "ai", false, "AI credits exhausted", processingTime);
        return new Response(JSON.stringify({ error: "AI credits exhausted" }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      await logClassification(supabase, email_id, effectiveUserId, null, 0, "ai", false, `AI Gateway error: ${aiResponse.status}`, processingTime);
      throw new Error("AI classification failed");
    }

    const aiData = await aiResponse.json();
    const aiContent = aiData.choices?.[0]?.message?.content;

    if (!aiContent) {
      const processingTime = Date.now() - startTime;
      await logClassification(supabase, email_id, effectiveUserId, null, 0, "ai", false, "No response from AI", processingTime);
      throw new Error("No response from AI");
    }

    // Parse AI response
    let parsedResponse: { entity_table: string | null; is_person: boolean; confidence: number; reasoning: string };
    try {
      // Clean up the response (remove markdown code blocks if present)
      const cleanContent = aiContent.replace(/```json\n?|\n?```/g, "").trim();
      parsedResponse = JSON.parse(cleanContent);
    } catch (parseError) {
      console.error("Failed to parse AI response:", aiContent);
      const processingTime = Date.now() - startTime;
      await logClassification(supabase, email_id, effectiveUserId, null, 0, "ai", false, "Failed to parse AI response", processingTime);
      throw new Error("Failed to parse AI classification response");
    }

    // Validate entity_table is a valid one
    let validEntityTable: string | null = null;
    if (parsedResponse.entity_table && ENTITY_TABLES.includes(parsedResponse.entity_table)) {
      validEntityTable = parsedResponse.entity_table;
    }

    // Determine is_person - use AI result but also check pattern as fallback
    let isPerson = parsedResponse.is_person;
    if (isPerson === undefined || isPerson === null) {
      // Fallback to pattern detection if AI didn't return is_person
      isPerson = !detectNonPersonPattern(sender_email);
    }

    const result: ClassificationResult = {
      entity_table: validEntityTable,
      is_person: isPerson,
      confidence: Math.min(1, Math.max(0, parsedResponse.confidence || 0)),
      reasoning: parsedResponse.reasoning || "",
    };

    // Update the email_messages table with the classification
    const updateData: Record<string, unknown> = {
      is_person: result.is_person,
    };
    
    if (result.entity_table) {
      updateData.entity_table = result.entity_table;
      updateData.ai_confidence = result.confidence;
    }

    await supabase
      .from("email_messages")
      .update(updateData)
      .eq("id", email_id);

    // If classified as non-person and no sender_id exists, create sender record
    if (!result.is_person && !sender_id && sender_email) {
      const newSenderId = await createSenderRecord(
        supabase,
        sender_email,
        sender_name,
        effectiveUserId
      );

      if (newSenderId) {
        await supabase
          .from("email_messages")
          .update({ sender_id: newSenderId })
          .eq("id", email_id);
        
        console.log(`Created sender record ${newSenderId} for non-person email ${sender_email}`);
      }
    }

    // Log successful classification
    const processingTime = Date.now() - startTime;
    await logClassification(
      supabase,
      email_id,
      effectiveUserId,
      result.entity_table,
      result.confidence,
      "ai",
      true,
      null,
      processingTime
    );

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
