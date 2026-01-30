import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ENTITY_TABLES = [
  "influencers",
  "resellers",
  "product_suppliers",
  "expense_suppliers",
  "corporate_management",
  "personal_contacts",
  "subscriptions",
  "marketing_sources",
  "merchant_accounts",
  "logistic_suppliers",
];

interface ClassifyRequest {
  event_id: string;
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

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      throw new Error("Unauthorized");
    }

    const { event_id }: ClassifyRequest = await req.json();

    if (!event_id) {
      throw new Error("Missing event_id");
    }

    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get the webhook event
    const { data: event, error: eventError } = await serviceClient
      .from("webhook_events")
      .select("id, payload, event_type, endpoint_id")
      .eq("id", event_id)
      .single();

    if (eventError || !event) {
      throw new Error(`Event not found: ${eventError?.message}`);
    }

    // Get the endpoint for default entity table
    const { data: endpoint } = await serviceClient
      .from("webhook_endpoints")
      .select("default_entity_table, allowed_object_types")
      .eq("id", event.endpoint_id)
      .single();

    const payload = event.payload as Record<string, unknown>;
    const data = (payload.data || payload) as Record<string, unknown>;

    // Build classification prompt
    const prompt = buildClassificationPrompt(event.event_type, data, endpoint);

    // Call Lovable AI Gateway
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${Deno.env.get("LOVABLE_API_KEY")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `You are a CRM classification assistant. Analyze webhook payloads and determine:
1. entity_table: Which CRM entity type this belongs to (one of: ${ENTITY_TABLES.join(", ")})
2. is_person: Whether this represents a real person (true) or an automated/system record (false)

Respond ONLY with valid JSON: {"entity_table": "...", "is_person": true/false, "confidence": 0.0-1.0}`
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.1,
        max_tokens: 200,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("AI Gateway error:", errorText);
      throw new Error("AI classification failed");
    }

    const aiResult = await aiResponse.json();
    const content = aiResult.choices?.[0]?.message?.content || "";

    // Parse AI response
    let classification: { entity_table: string; is_person: boolean; confidence: number };
    try {
      // Extract JSON from response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("No JSON in response");
      classification = JSON.parse(jsonMatch[0]);
    } catch {
      console.error("Failed to parse AI response:", content);
      // Fallback to endpoint default or subscriptions
      classification = {
        entity_table: endpoint?.default_entity_table || "subscriptions",
        is_person: detectIsPerson(data),
        confidence: 0.5,
      };
    }

    // Validate entity_table
    if (!ENTITY_TABLES.includes(classification.entity_table)) {
      classification.entity_table = endpoint?.default_entity_table || "subscriptions";
      classification.confidence = Math.min(classification.confidence, 0.6);
    }

    // Update the webhook event
    const { error: updateError } = await serviceClient
      .from("webhook_events")
      .update({
        entity_table: classification.entity_table,
        is_person: classification.is_person,
        ai_confidence: classification.confidence,
      })
      .eq("id", event_id);

    if (updateError) {
      throw new Error(`Failed to update event: ${updateError.message}`);
    }

    return new Response(JSON.stringify({
      event_id,
      ...classification,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Classify webhook error:", message);
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: error instanceof Error && error.message === "Unauthorized" ? 401 : 500,
    });
  }
});

function buildClassificationPrompt(
  eventType: string,
  data: Record<string, unknown>,
  endpoint: { default_entity_table: string | null; allowed_object_types: string[] | null } | null
): string {
  const hints: string[] = [];
  
  if (endpoint?.default_entity_table) {
    hints.push(`Default entity type: ${endpoint.default_entity_table}`);
  }
  if (endpoint?.allowed_object_types?.length) {
    hints.push(`Allowed types: ${endpoint.allowed_object_types.join(", ")}`);
  }

  return `Event Type: ${eventType}
${hints.length ? hints.join("\n") + "\n" : ""}
Payload Data:
${JSON.stringify(data, null, 2)}

Classify this webhook payload.`;
}

function detectIsPerson(data: Record<string, unknown>): boolean {
  // Simple heuristics
  const hasPersonalInfo = !!(data.email || data.phone || data.name);
  const looksAutomated = !!(
    data.system || 
    data.automated || 
    data.bot ||
    (typeof data.name === "string" && /system|bot|auto|noreply/i.test(data.name))
  );
  
  return hasPersonalInfo && !looksAutomated;
}
