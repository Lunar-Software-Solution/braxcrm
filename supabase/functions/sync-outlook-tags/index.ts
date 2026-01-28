import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface SyncTagsRequest {
  microsoft_message_id: string;
  tag_names: string[];
  workspace_id: string;
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
    const userId = claimsData.claims.sub as string;

    const { microsoft_message_id, tag_names }: SyncTagsRequest = await req.json();

    if (!microsoft_message_id || !tag_names || tag_names.length === 0) {
      throw new Error("Missing required fields");
    }

    // Get the user's Microsoft token
    const { data: tokenData, error: tokenError } = await supabase
      .from("microsoft_tokens")
      .select("access_token, refresh_token, expires_at")
      .eq("user_id", userId)
      .eq("is_primary", true)
      .single();

    if (tokenError || !tokenData) {
      throw new Error("No Microsoft token found");
    }

    // Check if token needs refresh
    let accessToken = tokenData.access_token;
    const expiresAt = new Date(tokenData.expires_at);
    
    if (expiresAt <= new Date()) {
      // Token expired, need to refresh
      const refreshResponse = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/ms-auth`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "refresh",
          refresh_token: tokenData.refresh_token,
        }),
      });

      if (!refreshResponse.ok) {
        throw new Error("Failed to refresh Microsoft token");
      }

      const refreshData = await refreshResponse.json();
      accessToken = refreshData.access_token;

      // Update the stored token
      await supabase
        .from("microsoft_tokens")
        .update({
          access_token: refreshData.access_token,
          refresh_token: refreshData.refresh_token || tokenData.refresh_token,
          expires_at: new Date(Date.now() + refreshData.expires_in * 1000).toISOString(),
        })
        .eq("user_id", userId)
        .eq("is_primary", true);
    }

    // Get the message's current categories from Outlook
    const messageResponse = await fetch(
      `https://graph.microsoft.com/v1.0/me/messages/${microsoft_message_id}?$select=categories`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!messageResponse.ok) {
      const errorText = await messageResponse.text();
      console.error("Graph API error fetching message:", errorText);
      throw new Error("Failed to fetch message from Outlook");
    }

    const messageData = await messageResponse.json();
    const existingCategories: string[] = messageData.categories || [];

    // Merge with new tags (avoid duplicates)
    const allCategories = [...new Set([...existingCategories, ...tag_names])];

    // Update the message with combined categories
    const updateResponse = await fetch(
      `https://graph.microsoft.com/v1.0/me/messages/${microsoft_message_id}`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          categories: allCategories,
        }),
      }
    );

    if (!updateResponse.ok) {
      const errorText = await updateResponse.text();
      console.error("Graph API error updating message:", errorText);
      throw new Error("Failed to update message categories in Outlook");
    }

    return new Response(JSON.stringify({
      success: true,
      categories: allCategories,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Sync outlook tags error:", message);
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: error instanceof Error && error.message === "Unauthorized" ? 401 : 500,
    });
  }
});
