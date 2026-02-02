import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-webhook-signature, x-api-key",
};

interface DocumentImportPayload {
  external_id: string;
  document_type?: string;
  file_url: string;
  entity_hint?: {
    entity_table: string;
    entity_email?: string;
    entity_name?: string;
  };
  metadata?: Record<string, unknown>;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    // Get endpoint slug from URL
    const url = new URL(req.url);
    const pathParts = url.pathname.split("/");
    const slug = pathParts[pathParts.length - 1];

    // Look up the endpoint
    const { data: endpoint, error: endpointError } = await supabase
      .from("webhook_endpoints")
      .select("*")
      .eq("slug", slug)
      .eq("is_active", true)
      .single();

    if (endpointError || !endpoint) {
      return new Response(JSON.stringify({ error: "Endpoint not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify signature if secret is configured
    if (endpoint.secret) {
      const signature = req.headers.get("x-webhook-signature");
      if (!signature) {
        return new Response(JSON.stringify({ error: "Missing signature" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Verify HMAC signature
      const body = await req.text();
      const encoder = new TextEncoder();
      const key = await crypto.subtle.importKey(
        "raw",
        encoder.encode(endpoint.secret),
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign"]
      );
      const signatureBytes = await crypto.subtle.sign("HMAC", key, encoder.encode(body));
      const expectedSignature = Array.from(new Uint8Array(signatureBytes))
        .map(b => b.toString(16).padStart(2, "0"))
        .join("");

      if (signature !== expectedSignature) {
        return new Response(JSON.stringify({ error: "Invalid signature" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Re-parse body
      const payload: DocumentImportPayload = JSON.parse(body);
      return await processImport(supabase, endpoint, payload);
    }

    const payload: DocumentImportPayload = await req.json();
    return await processImport(supabase, endpoint, payload);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Document import error:", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function processImport(
  supabase: any,
  endpoint: { id: string; user_id: string },
  payload: DocumentImportPayload
) {
  // Create import event record
  const { data: importEvent, error: createError } = await supabase
    .from("document_import_events")
    .insert({
      endpoint_id: endpoint.id,
      external_id: payload.external_id,
      source_system: payload.metadata?.source_system || "external",
      document_type: payload.document_type,
      file_url: payload.file_url,
      metadata: payload.metadata || {},
      status: "downloading",
      entity_table: payload.entity_hint?.entity_table,
      user_id: endpoint.user_id,
    })
    .select()
    .single();

  if (createError) {
    console.error("Failed to create import event:", createError);
    return new Response(JSON.stringify({ error: "Failed to create import event" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    // Download the file
    const fileResponse = await fetch(payload.file_url);
    if (!fileResponse.ok) {
      throw new Error(`Failed to download file: ${fileResponse.status}`);
    }

    const fileData = await fileResponse.arrayBuffer();
    const contentType = fileResponse.headers.get("content-type") || "application/octet-stream";
    
    // Extract filename from URL or generate one
    const urlPath = new URL(payload.file_url).pathname;
    const fileName = urlPath.split("/").pop() || `import_${payload.external_id}`;

    // Upload to storage
    const filePath = `imports/${endpoint.id}/${Date.now()}_${fileName}`;
    const { error: uploadError } = await supabase.storage
      .from("entity-files")
      .upload(filePath, fileData, {
        contentType,
        upsert: false,
      });

    if (uploadError) {
      throw new Error(`Failed to upload file: ${uploadError.message}`);
    }

    // Update import event with file path
    await supabase
      .from("document_import_events")
      .update({ file_path: filePath, status: "processing" })
      .eq("id", importEvent.id);

    // Try to match entity if hint provided
    let entityId: string | null = null;
    if (payload.entity_hint?.entity_table) {
      const { entity_table, entity_email, entity_name } = payload.entity_hint;
      
      let query = supabase.from(entity_table as string).select("id");
      
      if (entity_email) {
        query = query.eq("email", entity_email);
      } else if (entity_name) {
        query = query.ilike("name", `%${entity_name}%`);
      }

      const { data: entities } = await query.limit(1);
      if (entities && entities.length > 0) {
        entityId = entities[0].id;
      }
    }

    // Create entity_files record
    const { data: entityFile, error: fileRecordError } = await supabase
      .from("entity_files")
      .insert({
        entity_table: payload.entity_hint?.entity_table || "imports",
        entity_id: entityId || importEvent.id,
        file_name: fileName,
        file_path: filePath,
        file_size: fileData.byteLength,
        mime_type: contentType,
        uploaded_by: endpoint.user_id,
      })
      .select()
      .single();

    if (fileRecordError) {
      console.error("Failed to create entity_files record:", fileRecordError);
    }

    // Extract document data using AI
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (LOVABLE_API_KEY && entityFile) {
      try {
        // Call extract-document function
        const extractResponse = await fetch(
          `${Deno.env.get("SUPABASE_URL")}/functions/v1/extract-document`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
            },
            body: JSON.stringify({
              file_id: entityFile.id,
              entity_table: payload.entity_hint?.entity_table,
              entity_id: entityId,
              document_type: payload.document_type,
            }),
          }
        );

        if (extractResponse.ok) {
          const extractResult = await extractResponse.json();
          
          // Update import event with extracted document reference
          await supabase
            .from("document_import_events")
            .update({
              status: "completed",
              entity_id: entityId,
              extracted_doc_id: extractResult.data?.id,
              processed_at: new Date().toISOString(),
            })
            .eq("id", importEvent.id);

          return new Response(JSON.stringify({
            success: true,
            import_id: importEvent.id,
            extracted_document: extractResult.data,
          }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      } catch (extractError) {
        console.error("Extraction error:", extractError);
      }
    }

    // If extraction failed or not available, still mark as completed
    await supabase
      .from("document_import_events")
      .update({
        status: "completed",
        entity_id: entityId,
        processed_at: new Date().toISOString(),
      })
      .eq("id", importEvent.id);

    return new Response(JSON.stringify({
      success: true,
      import_id: importEvent.id,
      file_path: filePath,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    
    // Update import event with error
    await supabase
      .from("document_import_events")
      .update({
        status: "failed",
        error_message: message,
        processed_at: new Date().toISOString(),
      })
      .eq("id", importEvent.id);

    return new Response(JSON.stringify({ error: message, import_id: importEvent.id }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
}
