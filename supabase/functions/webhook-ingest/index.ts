import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-webhook-signature",
};

interface WebhookPayload {
  external_id?: string;
  event_type: string;
  data: Record<string, unknown>;
}

// HMAC-SHA256 signature verification
async function verifySignature(
  payload: string,
  signature: string,
  secret: string
): Promise<boolean> {
  try {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    const signatureBuffer = await crypto.subtle.sign(
      "HMAC",
      key,
      encoder.encode(payload)
    );
    const expectedSignature = Array.from(new Uint8Array(signatureBuffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    
    return signature === expectedSignature;
  } catch (e) {
    console.error("Signature verification error:", e);
    return false;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Extract slug from URL path: /webhook-ingest/my-slug
    const url = new URL(req.url);
    const pathParts = url.pathname.split("/").filter(Boolean);
    const slug = pathParts[pathParts.length - 1];

    if (!slug || slug === "webhook-ingest") {
      return new Response(
        JSON.stringify({ error: "Missing endpoint slug in URL path" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use service role to bypass RLS for webhook ingestion
    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Look up endpoint by slug
    const { data: endpoint, error: endpointError } = await serviceClient
      .from("webhook_endpoints")
      .select("*")
      .eq("slug", slug)
      .eq("is_active", true)
      .single();

    if (endpointError || !endpoint) {
      console.error("Endpoint not found:", slug, endpointError);
      return new Response(
        JSON.stringify({ error: "Webhook endpoint not found or inactive" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get raw body for signature verification
    const rawBody = await req.text();
    
    // Verify signature if provided
    const signature = req.headers.get("x-webhook-signature");
    if (signature && endpoint.secret_key) {
      const isValid = await verifySignature(rawBody, signature, endpoint.secret_key);
      if (!isValid) {
        console.error("Invalid webhook signature for endpoint:", slug);
        return new Response(
          JSON.stringify({ error: "Invalid webhook signature" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Parse payload
    let payload: WebhookPayload;
    try {
      payload = JSON.parse(rawBody);
    } catch (e) {
      return new Response(
        JSON.stringify({ error: "Invalid JSON payload" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate required fields
    if (!payload.event_type) {
      return new Response(
        JSON.stringify({ error: "Missing required field: event_type" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check payload size (1MB limit)
    if (rawBody.length > 1024 * 1024) {
      return new Response(
        JSON.stringify({ error: "Payload too large (max 1MB)" }),
        { status: 413, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Determine entity table from payload or default
    let entityTable = endpoint.default_entity_table;
    
    // If allowed_object_types is set, validate
    if (endpoint.allowed_object_types && endpoint.allowed_object_types.length > 0) {
      const payloadEntityType = payload.data?.entity_type as string;
      if (payloadEntityType && endpoint.allowed_object_types.includes(payloadEntityType)) {
        entityTable = payloadEntityType;
      }
    }

    // Create webhook event record
    const { data: event, error: insertError } = await serviceClient
      .from("webhook_events")
      .insert({
        endpoint_id: endpoint.id,
        external_id: payload.external_id || null,
        event_type: payload.event_type,
        payload: payload,
        status: "pending",
        entity_table: entityTable,
        is_person: null, // To be determined during classification
        user_id: endpoint.created_by, // Associate with endpoint creator
      })
      .select("id")
      .single();

    if (insertError || !event) {
      console.error("Failed to create webhook event:", insertError);
      return new Response(
        JSON.stringify({ error: "Failed to store webhook event" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Webhook event created: ${event.id} for endpoint ${slug}`);

    return new Response(
      JSON.stringify({
        success: true,
        event_id: event.id,
        message: "Webhook received and queued for processing",
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Webhook ingest error:", message);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
