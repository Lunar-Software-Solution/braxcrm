import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface GraphMessage {
  id: string;
  subject?: string;
  bodyPreview?: string;
  from?: { emailAddress: { name: string; address: string } };
  toRecipients?: { emailAddress: { name: string; address: string } }[];
  receivedDateTime: string;
  isRead: boolean;
  hasAttachments: boolean;
  conversationId?: string;
  parentFolderId?: string;
}

interface ClassificationResult {
  entity_table: string | null;
  confidence: number;
  reasoning?: string;
}

// Check if person already has an entity mapping in people_entities
async function getExistingEntityMapping(
  // deno-lint-ignore no-explicit-any
  supabase: any,
  personId: string
): Promise<string | null> {
  const { data: mapping } = await supabase
    .from("people_entities")
    .select("entity_table")
    .eq("person_id", personId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  return mapping?.entity_table || null;
}

async function classifyAndProcessEmail(
  // deno-lint-ignore no-explicit-any
  supabase: any,
  supabaseUrl: string,
  authHeader: string,
  emailId: string,
  msg: GraphMessage,
  personId: string | null,
  autoProcessRules: boolean = true
): Promise<{ classified: boolean; rulesApplied: boolean; skippedAi?: boolean; error?: string }> {
  try {
    let entityTable: string | null = null;
    let confidence = 0;
    let skippedAi = false;

    // Step 1: Check if person already has an entity mapping
    if (personId) {
      const existingEntity = await getExistingEntityMapping(supabase, personId);
      if (existingEntity) {
        // Use cached entity mapping - skip AI call
        entityTable = existingEntity;
        confidence = 1.0;
        skippedAi = true;

        // Update email with known entity type
        await supabase
          .from("email_messages")
          .update({ entity_table: existingEntity, ai_confidence: 1.0 })
          .eq("id", emailId);

        console.log(`Skipped AI - person ${personId} already mapped to ${existingEntity}`);
      }
    }

    // Step 2: If no cached mapping, call AI classification
    if (!entityTable) {
      const classifyResponse = await fetch(`${supabaseUrl}/functions/v1/classify-email`, {
        method: "POST",
        headers: {
          Authorization: authHeader,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email_id: emailId,
          subject: msg.subject || "",
          body_preview: msg.bodyPreview || "",
          sender_email: msg.from?.emailAddress?.address || "",
          sender_name: msg.from?.emailAddress?.name || "",
          person_id: personId,
        }),
      });

      if (!classifyResponse.ok) {
        const errorText = await classifyResponse.text();
        console.warn("Classification failed:", errorText);
        return { classified: false, rulesApplied: false, error: `Classification failed: ${errorText}` };
      }

      const classification: ClassificationResult = await classifyResponse.json();
      entityTable = classification.entity_table;
      confidence = classification.confidence;
    }

    // If no entity matched, skip rule processing
    if (!entityTable) {
      return { classified: true, rulesApplied: false, skippedAi };
    }

    // Skip rule processing if auto-process is disabled (emails will appear in review queue)
    if (!autoProcessRules) {
      return { classified: true, rulesApplied: false, skippedAi };
    }

    // Step 3: Process entity-based rules for this entity type
    const processResponse = await fetch(`${supabaseUrl}/functions/v1/process-entity-rules`, {
      method: "POST",
      headers: {
        Authorization: authHeader,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email_id: emailId,
        entity_table: entityTable,
        microsoft_message_id: msg.id,
      }),
    });

    if (!processResponse.ok) {
      const errorText = await processResponse.text();
      console.warn("Rule processing failed:", errorText);
      return { classified: true, rulesApplied: false, skippedAi, error: `Rule processing failed: ${errorText}` };
    }

    return { classified: true, rulesApplied: true, skippedAi };
  } catch (error) {
    console.error("AI processing error:", error);
    return { 
      classified: false, 
      rulesApplied: false, 
      error: error instanceof Error ? error.message : "Unknown error" 
    };
  }
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

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabase = createClient(
      supabaseUrl,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      throw new Error("Unauthorized");
    }
    const userId = claimsData.claims.sub as string;

    // AI processing is now manual-only via the queue UI
    const { messages, userEmail } = await req.json();
    const enableAiProcessing = false;

    if (!messages || !Array.isArray(messages)) {
      throw new Error("Missing messages array");
    }

    const results = {
      emailsSynced: 0,
      emailsClassified: 0,
      emailsSkippedAi: 0,
      rulesApplied: 0,
      errors: [] as string[],
    };

    // Track emails that need AI processing
    const emailsToProcess: Array<{ emailId: string; msg: GraphMessage; personId: string | null }> = [];

    // Cache for existing people lookups (don't create, just check)
    const personCache: Record<string, string | undefined> = {};

    for (const msg of messages as GraphMessage[]) {
      try {
        // Determine direction and contact email
        const fromEmail = msg.from?.emailAddress?.address?.toLowerCase();
        const fromName = msg.from?.emailAddress?.name || fromEmail || "Unknown";
        
        const isInbound = Boolean(fromEmail && fromEmail !== userEmail?.toLowerCase());
        const contactEmail = isInbound ? fromEmail : msg.toRecipients?.[0]?.emailAddress?.address?.toLowerCase();
        const contactName = isInbound 
          ? fromName 
          : msg.toRecipients?.[0]?.emailAddress?.name || contactEmail || "Unknown";

        if (!contactEmail) {
          continue; // Skip if no contact email
        }

        const safeContactEmail = contactEmail;
        const safeContactName = contactName;

        // Only check if person exists - don't create (people are created by rules)
        let personId: string | undefined = personCache[safeContactEmail];

        if (personId === undefined) {
          const { data: existingPerson } = await supabase
            .from("people")
            .select("id")
            .ilike("email", safeContactEmail)
            .maybeSingle();

          personId = existingPerson?.id;
          personCache[safeContactEmail] = personId;
        }

        // Upsert email message - check if it already exists and is processed
        const { data: existingEmail } = await supabase
          .from("email_messages")
          .select("id, is_processed")
          .eq("microsoft_message_id", msg.id)
          .maybeSingle();

        const { data: upsertedEmail, error: emailError } = await supabase
          .from("email_messages")
          .upsert({
            microsoft_message_id: msg.id,
            person_id: personId || null,
            user_id: userId,
            direction: isInbound ? "inbound" : "outbound",
            subject: msg.subject || null,
            body_preview: msg.bodyPreview || null,
            received_at: msg.receivedDateTime,
            is_read: msg.isRead,
            has_attachments: msg.hasAttachments,
            conversation_id: msg.conversationId || null,
            folder_id: msg.parentFolderId || null,
            // Store sender info for person creation by rules
            sender_email: safeContactEmail,
            sender_name: safeContactName,
            // Only set is_processed to false for new emails
            ...(existingEmail ? {} : { is_processed: false }),
          }, {
            onConflict: "microsoft_message_id",
          })
          .select("id, is_processed")
          .single();

        if (emailError) {
          results.errors.push(`Email ${msg.id}: ${emailError.message}`);
        } else {
          results.emailsSynced++;

          // Queue for AI processing if not already processed
          if (enableAiProcessing && upsertedEmail && !upsertedEmail.is_processed) {
            emailsToProcess.push({ emailId: upsertedEmail.id, msg, personId: personId || null });
          }
        }
      } catch (msgError) {
        results.errors.push(`Message error: ${msgError instanceof Error ? msgError.message : "Unknown"}`);
      }
    }

    // Rules processing is now manual-only via the queue UI
    const autoProcessRules = false;

    // Process AI classification for unprocessed emails (limit to avoid timeout)
    const maxAiProcessing = 10; // Process max 10 emails per sync to avoid timeout
    const emailsToClassify = emailsToProcess.slice(0, maxAiProcessing);

    for (const { emailId, msg, personId } of emailsToClassify) {
      const aiResult = await classifyAndProcessEmail(
        supabase,
        supabaseUrl,
        authHeader,
        emailId,
        msg,
        personId,
        autoProcessRules
      );

      if (aiResult.classified) {
        results.emailsClassified++;
      }
      if (aiResult.skippedAi) {
        results.emailsSkippedAi++;
      }
      if (aiResult.rulesApplied) {
        results.rulesApplied++;
      }
      if (aiResult.error) {
        results.errors.push(`AI processing: ${aiResult.error}`);
      }
    }

    // Log if there are more emails pending AI processing
    if (emailsToProcess.length > maxAiProcessing) {
      console.log(`${emailsToProcess.length - maxAiProcessing} emails pending AI processing`);
    }

    return new Response(JSON.stringify(results), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Sync emails error:", message);
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: error instanceof Error && error.message === "Unauthorized" ? 401 : 400,
    });
  }
});
