import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const action = url.searchParams.get("action");

  const clientId = Deno.env.get("AZURE_CLIENT_ID")!;
  const clientSecret = Deno.env.get("AZURE_CLIENT_SECRET")!;
  const tenantId = Deno.env.get("AZURE_TENANT_ID") || "common";
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  try {
    switch (action) {
      case "authorize": {
        // Step 1: Generate authorization URL
        const redirectUri = url.searchParams.get("redirect_uri");
        if (!redirectUri) {
          throw new Error("redirect_uri is required");
        }

        const state = crypto.randomUUID();
        const scopes = [
          "openid",
          "profile",
          "email",
          "offline_access",
          "User.Read",
          "Mail.Read",
          "Mail.ReadWrite",
          "Mail.Send",
        ].join(" ");

        const authUrl = new URL(
          `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/authorize`
        );
        authUrl.searchParams.set("client_id", clientId);
        authUrl.searchParams.set("response_type", "code");
        authUrl.searchParams.set("redirect_uri", redirectUri);
        authUrl.searchParams.set("scope", scopes);
        authUrl.searchParams.set("state", state);
        authUrl.searchParams.set("response_mode", "query");
        // prompt=consent removed after initial setup

        return new Response(
          JSON.stringify({ url: authUrl.toString(), state }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "callback": {
        // Step 2: Exchange code for tokens
        const code = url.searchParams.get("code");
        const redirectUri = url.searchParams.get("redirect_uri");

        if (!code || !redirectUri) {
          throw new Error("code and redirect_uri are required");
        }

        // Exchange code for tokens
        const tokenResponse = await fetch(
          `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
          {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
              client_id: clientId,
              client_secret: clientSecret,
              code,
              redirect_uri: redirectUri,
              grant_type: "authorization_code",
            }),
          }
        );

        if (!tokenResponse.ok) {
          const error = await tokenResponse.text();
          throw new Error(`Token exchange failed: ${error}`);
        }

        const tokens = await tokenResponse.json();

        // Get user info from Microsoft Graph
        const userResponse = await fetch("https://graph.microsoft.com/v1.0/me", {
          headers: { Authorization: `Bearer ${tokens.access_token}` },
        });

        if (!userResponse.ok) {
          const error = await userResponse.text();
          throw new Error(`Failed to get user info: ${error}`);
        }

        const msUser = await userResponse.json();

        // Create or update user in Supabase using service role
        const supabase = createClient(supabaseUrl, supabaseServiceKey, {
          auth: { autoRefreshToken: false, persistSession: false },
        });

        // Check if user exists by email
        const { data: existingUsers } = await supabase.auth.admin.listUsers();
        let userId: string;
        let isNewUser = false;

        const existingUser = existingUsers?.users?.find(
          (u) => u.email === msUser.mail || u.email === msUser.userPrincipalName
        );

        if (existingUser) {
          userId = existingUser.id;
        } else {
          // Create new user
          const { data: newUser, error: createError } =
            await supabase.auth.admin.createUser({
              email: msUser.mail || msUser.userPrincipalName,
              email_confirm: true,
              user_metadata: {
                full_name: msUser.displayName,
                avatar_url: null,
                provider: "azure",
                microsoft_id: msUser.id,
              },
            });

          if (createError) throw createError;
          userId = newUser.user.id;
          isNewUser = true;
        }

        // Store Microsoft tokens
        const expiresAt = new Date();
        expiresAt.setSeconds(expiresAt.getSeconds() + tokens.expires_in);

        await supabase.from("microsoft_tokens").upsert({
          user_id: userId,
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          expires_at: expiresAt.toISOString(),
        });

        // Generate a Supabase session for this user
        const { data: session, error: sessionError } =
          await supabase.auth.admin.generateLink({
            type: "magiclink",
            email: msUser.mail || msUser.userPrincipalName,
          });

        if (sessionError) throw sessionError;

        // Extract token from the magic link
        const magicLinkUrl = new URL(session.properties.action_link);
        const token = magicLinkUrl.searchParams.get("token");
        const tokenType = magicLinkUrl.searchParams.get("type");

        return new Response(
          JSON.stringify({
            token,
            token_type: tokenType,
            email: msUser.mail || msUser.userPrincipalName,
            user: {
              id: userId,
              email: msUser.mail || msUser.userPrincipalName,
              name: msUser.displayName,
            },
            is_new_user: isNewUser,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }
  } catch (error) {
    console.error("MS Auth error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
