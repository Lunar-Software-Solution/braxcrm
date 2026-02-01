import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-api-key, x-connection-id",
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Only allow GET requests
  if (req.method !== "GET") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get API key and connection ID from headers
    const apiKey = req.headers.get("x-api-key");
    const connectionId = req.headers.get("x-connection-id");

    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "Missing x-api-key header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!connectionId) {
      return new Response(
        JSON.stringify({ error: "Missing x-connection-id header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate connection and API key
    const { data: connection, error: connError } = await supabase
      .from("messaging_connections")
      .select("id, user_id, is_active, api_secret")
      .eq("connection_id", connectionId)
      .single();

    if (connError || !connection) {
      return new Response(
        JSON.stringify({ error: "Invalid connection_id" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate API secret
    if (connection.api_secret !== apiKey) {
      return new Response(
        JSON.stringify({ error: "Invalid API key" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!connection.is_active) {
      return new Response(
        JSON.stringify({ error: "Connection is inactive" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse query parameters
    const url = new URL(req.url);
    const search = url.searchParams.get("search");
    const phone = url.searchParams.get("phone");
    const updatedSince = url.searchParams.get("updated_since");
    const limitParam = url.searchParams.get("limit");
    const offsetParam = url.searchParams.get("offset");

    // Validate and set pagination defaults
    let limit = limitParam ? parseInt(limitParam, 10) : 100;
    let offset = offsetParam ? parseInt(offsetParam, 10) : 0;

    // Enforce limits
    if (isNaN(limit) || limit < 1) limit = 100;
    if (limit > 500) limit = 500;
    if (isNaN(offset) || offset < 0) offset = 0;

    // Build query for people associated with this user
    let query = supabase
      .from("people")
      .select("id, name, email, phone, avatar_url, updated_at", { count: "exact" })
      .eq("created_by", connection.user_id)
      .order("name");

    // Apply optional filters
    if (search) {
      const searchPattern = `%${search}%`;
      query = query.or(`name.ilike.${searchPattern},email.ilike.${searchPattern},phone.ilike.${searchPattern}`);
    }

    if (phone) {
      query = query.eq("phone", phone);
    }

    if (updatedSince) {
      // Validate ISO 8601 format
      const date = new Date(updatedSince);
      if (isNaN(date.getTime())) {
        return new Response(
          JSON.stringify({ error: "Invalid updated_since format. Use ISO 8601 (e.g., 2026-01-15T00:00:00Z)" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      query = query.gte("updated_at", updatedSince);
    }

    // Apply pagination
    query = query.range(offset, offset + limit - 1);

    // Execute query
    const { data: people, error: queryError, count } = await query;

    if (queryError) {
      console.error("Query error:", queryError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch people" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        total: count || 0,
        limit,
        offset,
        people: people || [],
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Messaging people error:", error);
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
