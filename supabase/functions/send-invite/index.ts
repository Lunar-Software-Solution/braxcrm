import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface InviteRequest {
  email: string;
  name?: string;
  resend?: boolean;
  invitationId?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const brevoApiKey = Deno.env.get("BREVO_API_KEY");

    if (!brevoApiKey) {
      throw new Error("BREVO_API_KEY is not configured");
    }

    // Validate user is admin
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = claimsData.claims.sub as string;

    // Check if user is admin
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleData) {
      return new Response(
        JSON.stringify({ error: "Only admins can invite users" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { email, name, resend, invitationId }: InviteRequest = await req.json();

    if (!email) {
      return new Response(
        JSON.stringify({ error: "Email is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use service role for admin operations
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // Check for existing pending invitation if not a resend
    if (!resend) {
      const { data: existingInvite } = await adminClient
        .from("invitations")
        .select("id")
        .eq("email", email)
        .eq("status", "pending")
        .maybeSingle();

      if (existingInvite) {
        return new Response(
          JSON.stringify({ error: "An invitation is already pending for this email" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Check if user already exists in auth
    const { data: existingUsers } = await adminClient.auth.admin.listUsers();
    const userExists = existingUsers?.users?.some(u => u.email?.toLowerCase() === email.toLowerCase());

    if (userExists) {
      // User already registered - update invitation to accepted if it exists
      if (resend && invitationId) {
        await adminClient
          .from("invitations")
          .update({ 
            status: "accepted",
            accepted_at: new Date().toISOString(),
          })
          .eq("id", invitationId);
        
        return new Response(
          JSON.stringify({ success: true, message: "User has already registered. Invitation marked as accepted." }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      return new Response(
        JSON.stringify({ error: "A user with this email is already registered" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    const { data: inviteData, error: inviteError } = await adminClient.auth.admin.generateLink({
      type: "invite",
      email,
      options: {
        redirectTo: `${req.headers.get("origin") || "https://graph-mail-crm.lovable.app"}/login`,
      },
    });

    if (inviteError) {
      console.error("Failed to generate invite link:", inviteError);
      throw new Error(`Failed to generate invite: ${inviteError.message}`);
    }

    const inviteLink = inviteData.properties?.action_link;

    // Send email via Brevo
    const brevoResponse = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "accept": "application/json",
        "api-key": brevoApiKey,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        sender: {
          name: "CRM",
          email: "noreply@braxtech.net",
        },
        to: [{ email, name: name || email }],
        subject: "You've been invited to CRM",
        htmlContent: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #1a1a2e;">You're Invited!</h1>
            <p>Hello${name ? ` ${name}` : ""},</p>
            <p>You've been invited to join CRM. Click the button below to set up your account:</p>
            <p style="text-align: center; margin: 30px 0;">
              <a href="${inviteLink}" 
                 style="background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                Accept Invitation
              </a>
            </p>
            <p style="color: #666; font-size: 14px;">
              If you didn't expect this invitation, you can safely ignore this email.
            </p>
          </div>
        `,
      }),
    });

    if (!brevoResponse.ok) {
      const errorText = await brevoResponse.text();
      console.error("Brevo API error:", errorText);
      throw new Error(`Failed to send email: ${errorText}`);
    }

    // Store or update invitation in database
    if (resend && invitationId) {
      // Update existing invitation
      await adminClient
        .from("invitations")
        .update({ 
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        })
        .eq("id", invitationId);
    } else {
      // Create new invitation record
      await adminClient.from("invitations").insert({
        email,
        name: name || null,
        invited_by: userId,
        status: "pending",
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      });
    }

    console.log("Invitation sent successfully to:", email);

    return new Response(
      JSON.stringify({ success: true, message: "Invitation sent" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in send-invite:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
