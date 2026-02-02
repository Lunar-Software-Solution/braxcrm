import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface ExtractAttachmentsRequest {
  email_id: string;
  entity_table?: string;
  entity_id?: string;
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
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Validate user
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      throw new Error("Unauthorized");
    }

    const { email_id, entity_table, entity_id }: ExtractAttachmentsRequest = await req.json();

    if (!email_id) {
      throw new Error("Missing email_id");
    }

    // Fetch the email to get Microsoft message ID
    const { data: email, error: emailError } = await supabase
      .from("email_messages")
      .select("microsoft_message_id, has_attachments, entity_table, user_id")
      .eq("id", email_id)
      .single();

    if (emailError || !email) {
      throw new Error("Email not found");
    }

    if (!email.has_attachments) {
      return new Response(JSON.stringify({
        success: true,
        message: "No attachments to extract",
        attachments: [],
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get user's Microsoft tokens
    const { data: tokenData, error: tokenError } = await supabase
      .from("microsoft_tokens")
      .select("access_token, refresh_token, expires_at")
      .eq("user_id", email.user_id)
      .single();

    if (tokenError || !tokenData) {
      throw new Error("Microsoft account not connected");
    }

    // Check if token needs refresh
    let accessToken = tokenData.access_token;
    const expiresAt = new Date(tokenData.expires_at);
    
    if (expiresAt <= new Date()) {
      // Refresh the token
      const refreshResponse = await fetch(
        `${Deno.env.get("SUPABASE_URL")}/functions/v1/ms-auth`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
          },
          body: JSON.stringify({
            action: "refresh",
            refresh_token: tokenData.refresh_token,
            user_id: email.user_id,
          }),
        }
      );

      if (!refreshResponse.ok) {
        throw new Error("Failed to refresh Microsoft token");
      }

      const refreshData = await refreshResponse.json();
      accessToken = refreshData.access_token;
    }

    // Fetch attachments from Microsoft Graph API
    const graphResponse = await fetch(
      `https://graph.microsoft.com/v1.0/me/messages/${email.microsoft_message_id}/attachments`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!graphResponse.ok) {
      const errorText = await graphResponse.text();
      console.error("Graph API error:", graphResponse.status, errorText);
      throw new Error("Failed to fetch attachments from Microsoft");
    }

    const attachmentsData = await graphResponse.json();
    const attachments = attachmentsData.value || [];

    const extractedFiles: Array<{ id: string; file_name: string; file_path: string }> = [];

    for (const attachment of attachments) {
      // Skip inline attachments (like images in signatures)
      if (attachment.isInline) continue;

      try {
        // Get attachment content if not included
        let contentBytes = attachment.contentBytes;
        
        if (!contentBytes && attachment["@odata.type"] === "#microsoft.graph.fileAttachment") {
          // Fetch full attachment
          const attachmentResponse = await fetch(
            `https://graph.microsoft.com/v1.0/me/messages/${email.microsoft_message_id}/attachments/${attachment.id}`,
            {
              headers: {
                Authorization: `Bearer ${accessToken}`,
              },
            }
          );

          if (attachmentResponse.ok) {
            const fullAttachment = await attachmentResponse.json();
            contentBytes = fullAttachment.contentBytes;
          }
        }

        if (!contentBytes) {
          console.warn(`No content for attachment: ${attachment.name}`);
          continue;
        }

        // Decode base64 content
        const binaryContent = Uint8Array.from(atob(contentBytes), c => c.charCodeAt(0));

        // Generate storage path
        const targetEntityTable = entity_table || email.entity_table || "emails";
        const targetEntityId = entity_id || email_id;
        const filePath = `${targetEntityTable}/${targetEntityId}/${Date.now()}_${attachment.name}`;

        // Upload to storage
        const { error: uploadError } = await supabase.storage
          .from("entity-files")
          .upload(filePath, binaryContent, {
            contentType: attachment.contentType || "application/octet-stream",
            upsert: false,
          });

        if (uploadError) {
          console.error(`Failed to upload ${attachment.name}:`, uploadError);
          continue;
        }

        // Create entity_files record
        const { data: fileRecord, error: fileError } = await supabase
          .from("entity_files")
          .insert({
            entity_table: targetEntityTable,
            entity_id: targetEntityId,
            file_name: attachment.name,
            file_path: filePath,
            file_size: attachment.size || binaryContent.length,
            mime_type: attachment.contentType || "application/octet-stream",
            uploaded_by: user.id,
          })
          .select()
          .single();

        if (fileError) {
          console.error(`Failed to create file record for ${attachment.name}:`, fileError);
          continue;
        }

        extractedFiles.push({
          id: fileRecord.id,
          file_name: attachment.name,
          file_path: filePath,
        });
      } catch (attachmentError) {
        console.error(`Error processing attachment ${attachment.name}:`, attachmentError);
      }
    }

    return new Response(JSON.stringify({
      success: true,
      message: `Extracted ${extractedFiles.length} attachment(s)`,
      attachments: extractedFiles,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Extract attachments error:", message);
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: error instanceof Error && error.message === "Unauthorized" ? 401 : 500,
    });
  }
});
