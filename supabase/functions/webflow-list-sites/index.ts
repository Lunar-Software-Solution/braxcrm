import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body = await req.json().catch(() => ({}));
    const { action, site_id, api_token } = body;

    // For listing forms, we need the token for that specific site
    if (action === "list-forms" && site_id) {
      // Get token from database for this site
      const { data: tokenData } = await serviceClient
        .from("webflow_tokens")
        .select("api_token")
        .eq("site_id", site_id)
        .single();

      const token = api_token || tokenData?.api_token;
      if (!token) {
        return new Response(
          JSON.stringify({ error: "No API token found for this site" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const response = await fetch(`https://api.webflow.com/v2/sites/${site_id}/forms`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const error = await response.text();
        console.error("Webflow API error:", error);
        return new Response(
          JSON.stringify({ error: `Webflow API error: ${response.status}`, details: error }),
          { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const data = await response.json();
      return new Response(
        JSON.stringify({ forms: data.forms || [] }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate a token by fetching sites (used when adding a new token)
    if (action === "validate-token" && api_token) {
      const response = await fetch("https://api.webflow.com/v2/sites", {
        headers: {
          Authorization: `Bearer ${api_token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const error = await response.text();
        return new Response(
          JSON.stringify({ valid: false, error: `Invalid token: ${response.status}` }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const data = await response.json();
      return new Response(
        JSON.stringify({ valid: true, sites: data.sites || [] }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // List all configured sites from database
    if (action === "list-configured-sites") {
      const { data: tokens, error } = await serviceClient
        .from("webflow_tokens")
        .select("site_id, site_name, created_at")
        .order("created_at", { ascending: false });

      if (error) throw error;

      return new Response(
        JSON.stringify({ sites: tokens || [] }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Invalid action. Use: list-forms, validate-token, or list-configured-sites" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Error:", message);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});