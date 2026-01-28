import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface TokenData {
  access_token: string;
  refresh_token: string;
  expires_at: string;
}

async function refreshAccessToken(refreshToken: string): Promise<{
  access_token: string;
  refresh_token: string;
  expires_in: number;
}> {
  const clientId = Deno.env.get("AZURE_CLIENT_ID")!;
  const clientSecret = Deno.env.get("AZURE_CLIENT_SECRET")!;
  const tenantId = Deno.env.get("AZURE_TENANT_ID") || "common";

  const response = await fetch(
    `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: "refresh_token",
        scope: "https://graph.microsoft.com/.default offline_access",
      }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Token refresh failed: ${error}`);
  }

  return response.json();
}

async function getValidToken(
  supabase: SupabaseClient,
  userId: string
): Promise<string> {
  // Get stored tokens
  const { data: tokenData, error } = await supabase
    .from("microsoft_tokens")
    .select("access_token, refresh_token, expires_at")
    .eq("user_id", userId)
    .single();

  if (error || !tokenData) {
    throw new Error("No Microsoft tokens found. Please sign in with Microsoft.");
  }

  const tokens = tokenData as TokenData;
  const expiresAt = new Date(tokens.expires_at);
  const now = new Date();

  // If token expires in less than 5 minutes, refresh it
  if (expiresAt.getTime() - now.getTime() < 5 * 60 * 1000) {
    const newTokens = await refreshAccessToken(tokens.refresh_token);

    const newExpiresAt = new Date();
    newExpiresAt.setSeconds(newExpiresAt.getSeconds() + newTokens.expires_in);

    // Update tokens in database
    await supabase
      .from("microsoft_tokens")
      .update({
        access_token: newTokens.access_token,
        refresh_token: newTokens.refresh_token,
        expires_at: newExpiresAt.toISOString(),
      })
      .eq("user_id", userId);

    return newTokens.access_token;
  }

  return tokens.access_token;
}

async function callGraphApi(
  accessToken: string,
  endpoint: string,
  method: string = "GET",
  body?: unknown
): Promise<unknown> {
  const response = await fetch(`https://graph.microsoft.com/v1.0${endpoint}`, {
    method,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Graph API error: ${response.status} - ${error}`);
  }

  return response.json();
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify authorization
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    // Validate JWT and get user
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);

    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claimsData.claims.sub as string;

    // Parse request
    const url = new URL(req.url);
    const action = url.searchParams.get("action");

    // Get valid access token
    const accessToken = await getValidToken(supabase, userId);

    let result: unknown;

    switch (action) {
      case "list-folders": {
        result = await callGraphApi(accessToken, "/me/mailFolders");
        break;
      }

      case "list-messages": {
        const folderId = url.searchParams.get("folderId") || "inbox";
        const top = url.searchParams.get("top") || "50";
        const skip = url.searchParams.get("skip") || "0";
        const search = url.searchParams.get("search");

        let endpoint = `/me/mailFolders/${folderId}/messages?$top=${top}&$skip=${skip}&$orderby=receivedDateTime desc&$select=id,subject,bodyPreview,from,toRecipients,receivedDateTime,isRead,hasAttachments,importance,flag`;

        if (search) {
          endpoint += `&$search="${encodeURIComponent(search)}"`;
        }

        result = await callGraphApi(accessToken, endpoint);
        break;
      }

      case "get-message": {
        const messageId = url.searchParams.get("messageId");
        if (!messageId) {
          throw new Error("messageId is required");
        }
        result = await callGraphApi(
          accessToken,
          `/me/messages/${messageId}?$select=id,subject,body,from,toRecipients,ccRecipients,receivedDateTime,isRead,hasAttachments,importance,flag,attachments`
        );
        break;
      }

      case "send-message": {
        if (req.method !== "POST") {
          throw new Error("POST method required for sending messages");
        }
        const messageData = await req.json();
        result = await callGraphApi(accessToken, "/me/sendMail", "POST", {
          message: messageData,
          saveToSentItems: true,
        });
        break;
      }

      case "update-message": {
        if (req.method !== "PATCH") {
          throw new Error("PATCH method required for updating messages");
        }
        const messageId = url.searchParams.get("messageId");
        if (!messageId) {
          throw new Error("messageId is required");
        }
        const updates = await req.json();
        result = await callGraphApi(
          accessToken,
          `/me/messages/${messageId}`,
          "PATCH",
          updates
        );
        break;
      }

      case "delete-message": {
        if (req.method !== "DELETE") {
          throw new Error("DELETE method required for deleting messages");
        }
        const messageId = url.searchParams.get("messageId");
        if (!messageId) {
          throw new Error("messageId is required");
        }
        await callGraphApi(accessToken, `/me/messages/${messageId}`, "DELETE");
        result = { success: true };
        break;
      }

      case "move-message": {
        if (req.method !== "POST") {
          throw new Error("POST method required for moving messages");
        }
        const messageId = url.searchParams.get("messageId");
        if (!messageId) {
          throw new Error("messageId is required");
        }
        const { destinationId } = await req.json();
        result = await callGraphApi(
          accessToken,
          `/me/messages/${messageId}/move`,
          "POST",
          { destinationId }
        );
        break;
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Graph API error:", error);
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
