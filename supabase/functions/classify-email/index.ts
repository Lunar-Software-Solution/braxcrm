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
}

interface Category {
  id: string;
  name: string;
  description: string | null;
}

interface ClassificationResult {
  category_id: string | null;
  category_name: string | null;
  confidence: number;
  reasoning: string;
}

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
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      throw new Error("Unauthorized");
    }

    const { email_id, subject, body_preview, sender_email, sender_name }: ClassifyEmailRequest = await req.json();

    if (!email_id) {
      throw new Error("Missing required field: email_id");
    }

    // Fetch all active categories
    const { data: categories, error: catError } = await supabase
      .from("email_categories")
      .select("id, name, description")
      .eq("is_active", true)
      .order("sort_order");

    if (catError) {
      console.error("Error fetching categories:", catError);
      throw new Error("Failed to fetch categories");
    }

    // If no categories defined, return null classification
    if (!categories || categories.length === 0) {
      const result: ClassificationResult = {
        category_id: null,
        category_name: null,
        confidence: 0,
        reasoning: "No categories defined",
      };
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build the prompt for AI classification
    const categoryList = (categories as Category[])
      .map((c, i) => `${i + 1}. "${c.name}"${c.description ? `: ${c.description}` : ""}`)
      .join("\n");

    const prompt = `You are an email classification assistant. Analyze the following email and classify it into ONE of the available categories.

Available Categories:
${categoryList}

Email Details:
- From: ${sender_name} <${sender_email}>
- Subject: ${subject || "(no subject)"}
- Preview: ${body_preview || "(no content)"}

Respond with a JSON object containing:
- "category_name": The exact name of the matching category (or null if none match well)
- "confidence": A number between 0 and 1 indicating your confidence
- "reasoning": A brief explanation of why you chose this category

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
    let parsedResponse: { category_name: string | null; confidence: number; reasoning: string };
    try {
      // Clean up the response (remove markdown code blocks if present)
      const cleanContent = aiContent.replace(/```json\n?|\n?```/g, "").trim();
      parsedResponse = JSON.parse(cleanContent);
    } catch (parseError) {
      console.error("Failed to parse AI response:", aiContent);
      throw new Error("Failed to parse AI classification response");
    }

    // Find the category ID from the name
    let matchedCategory: Category | null = null;
    if (parsedResponse.category_name) {
      matchedCategory = (categories as Category[]).find(
        (c) => c.name.toLowerCase() === parsedResponse.category_name?.toLowerCase()
      ) || null;
    }

    const result: ClassificationResult = {
      category_id: matchedCategory?.id || null,
      category_name: matchedCategory?.name || null,
      confidence: Math.min(1, Math.max(0, parsedResponse.confidence || 0)),
      reasoning: parsedResponse.reasoning || "",
    };

    // Store the classification result
    if (result.category_id) {
      await supabase
        .from("email_message_categories")
        .upsert({
          email_id,
          category_id: result.category_id,
          confidence: result.confidence,
          processed_at: new Date().toISOString(),
        }, { onConflict: "email_id,category_id" });

      // Update the email_messages table with the primary category
      await supabase
        .from("email_messages")
        .update({
          category_id: result.category_id,
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
