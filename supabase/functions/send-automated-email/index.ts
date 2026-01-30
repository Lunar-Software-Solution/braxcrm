import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface SendEmailRequest {
  templateId: string;
  contactType: string;
  contactId: string;
  contactEmail: string;
  automationType: "sequence" | "trigger";
  automationId: string;
  enrollmentId?: string;
}

interface MergeContext {
  person?: Record<string, string>;
  entity?: Record<string, string>;
  sender?: Record<string, string>;
  current_date?: string;
}

function resolveMergeFields(template: string, context: MergeContext): string {
  return template.replace(/\{\{(\w+)\.(\w+)\}\}/g, (match, entity, field) => {
    const entityContext = context[entity as keyof MergeContext];
    if (typeof entityContext === "object" && entityContext !== null) {
      return entityContext[field] ?? match;
    }
    if (entity === "current_date" && context.current_date) {
      return context.current_date;
    }
    return match;
  });
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
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify user
    const supabaseAnon = createClient(
      supabaseUrl,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    
    const { data: { user }, error: authError } = await supabaseAnon.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body: SendEmailRequest = await req.json();
    const { templateId, contactType, contactId, contactEmail, automationType, automationId, enrollmentId } = body;

    // Get template
    const { data: template, error: templateError } = await supabase
      .from("email_templates")
      .select("*")
      .eq("id", templateId)
      .single();

    if (templateError || !template) {
      throw new Error("Template not found");
    }

    // Get contact data for merge fields
    let contactData: Record<string, string> = {};
    
    if (contactType === "people") {
      const { data: person } = await supabase
        .from("people")
        .select("name, email, title, phone, city")
        .eq("id", contactId)
        .single();
      
      if (person) {
        contactData = {
          name: person.name || "",
          email: person.email || "",
          title: person.title || "",
          phone: person.phone || "",
          city: person.city || "",
        };
      }
    } else {
      // Entity table
      const { data: entity } = await supabase
        .from(contactType)
        .select("name, email, phone")
        .eq("id", contactId)
        .single();
      
      if (entity) {
        contactData = {
          name: entity.name || "",
          email: entity.email || "",
          phone: entity.phone || "",
        };
      }
    }

    // Get sender data (user's profile)
    const { data: profile } = await supabase
      .from("profiles")
      .select("display_name, email")
      .eq("user_id", user.id)
      .single();

    // Build merge context
    const mergeContext: MergeContext = {
      person: contactType === "people" ? contactData : undefined,
      entity: contactType !== "people" ? contactData : undefined,
      sender: {
        name: profile?.display_name || user.email || "",
        email: profile?.email || user.email || "",
      },
      current_date: new Date().toLocaleDateString(),
    };

    // Resolve merge fields
    const resolvedSubject = resolveMergeFields(template.subject, mergeContext);
    const resolvedBody = resolveMergeFields(template.body_html, mergeContext);

    // Get Microsoft token for sending
    const { data: msToken, error: tokenError } = await supabase
      .from("microsoft_tokens")
      .select("access_token, refresh_token, expires_at")
      .eq("user_id", user.id)
      .eq("is_primary", true)
      .single();

    if (tokenError || !msToken) {
      // Log failure
      await supabase.from("automation_send_log").insert({
        automation_type: automationType,
        automation_id: automationId,
        enrollment_id: enrollmentId || null,
        contact_type: contactType,
        contact_id: contactId,
        contact_email: contactEmail,
        template_id: templateId,
        subject: resolvedSubject,
        status: "failed",
        error_message: "Microsoft account not connected",
        user_id: user.id,
      });

      return new Response(
        JSON.stringify({ error: "Microsoft account not connected" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if token needs refresh
    let accessToken = msToken.access_token;
    const expiresAt = new Date(msToken.expires_at);
    
    if (expiresAt <= new Date()) {
      // Token expired, need to refresh
      const clientId = Deno.env.get("AZURE_CLIENT_ID")!;
      const clientSecret = Deno.env.get("AZURE_CLIENT_SECRET")!;
      const tenantId = Deno.env.get("AZURE_TENANT_ID") || "common";

      const tokenResponse = await fetch(
        `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
        {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            client_id: clientId,
            client_secret: clientSecret,
            refresh_token: msToken.refresh_token,
            grant_type: "refresh_token",
          }),
        }
      );

      if (!tokenResponse.ok) {
        await supabase.from("automation_send_log").insert({
          automation_type: automationType,
          automation_id: automationId,
          enrollment_id: enrollmentId || null,
          contact_type: contactType,
          contact_id: contactId,
          contact_email: contactEmail,
          template_id: templateId,
          subject: resolvedSubject,
          status: "failed",
          error_message: "Failed to refresh Microsoft token",
          user_id: user.id,
        });

        return new Response(
          JSON.stringify({ error: "Failed to refresh Microsoft token" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const tokens = await tokenResponse.json();
      accessToken = tokens.access_token;

      // Update token in database
      await supabase
        .from("microsoft_tokens")
        .update({
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token || msToken.refresh_token,
          expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
        })
        .eq("user_id", user.id)
        .eq("is_primary", true);
    }

    // Send email via Microsoft Graph API
    const emailPayload = {
      message: {
        subject: resolvedSubject,
        body: {
          contentType: "HTML",
          content: resolvedBody,
        },
        toRecipients: [
          {
            emailAddress: {
              address: contactEmail,
            },
          },
        ],
      },
      saveToSentItems: true,
    };

    const graphResponse = await fetch(
      "https://graph.microsoft.com/v1.0/me/sendMail",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(emailPayload),
      }
    );

    if (!graphResponse.ok) {
      const errorText = await graphResponse.text();
      console.error("Graph API error:", errorText);

      await supabase.from("automation_send_log").insert({
        automation_type: automationType,
        automation_id: automationId,
        enrollment_id: enrollmentId || null,
        contact_type: contactType,
        contact_id: contactId,
        contact_email: contactEmail,
        template_id: templateId,
        subject: resolvedSubject,
        status: "failed",
        error_message: `Graph API error: ${graphResponse.status}`,
        user_id: user.id,
      });

      return new Response(
        JSON.stringify({ error: "Failed to send email via Microsoft Graph" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Log success
    await supabase.from("automation_send_log").insert({
      automation_type: automationType,
      automation_id: automationId,
      enrollment_id: enrollmentId || null,
      contact_type: contactType,
      contact_id: contactId,
      contact_email: contactEmail,
      template_id: templateId,
      subject: resolvedSubject,
      status: "sent",
      sent_at: new Date().toISOString(),
      user_id: user.id,
    });

    return new Response(
      JSON.stringify({ success: true, subject: resolvedSubject }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in send-automated-email:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
