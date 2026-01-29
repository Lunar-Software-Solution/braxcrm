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
  category_id: string | null;
  category_name: string | null;
  confidence: number;
  reasoning?: string;
}

async function classifyAndProcessEmail(
  supabaseUrl: string,
  authHeader: string,
  emailId: string,
  msg: GraphMessage,
  autoProcessRules: boolean = true
): Promise<{ classified: boolean; rulesApplied: boolean; error?: string }> {
  try {
    // Step 1: Classify the email
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
      }),
    });

    if (!classifyResponse.ok) {
      const errorText = await classifyResponse.text();
      console.warn("Classification failed:", errorText);
      return { classified: false, rulesApplied: false, error: `Classification failed: ${errorText}` };
    }

    const classification: ClassificationResult = await classifyResponse.json();

    // If no category matched, skip rule processing
    if (!classification.category_id) {
      return { classified: true, rulesApplied: false };
    }

    // Skip rule processing if auto-process is disabled
    if (!autoProcessRules) {
      return { classified: true, rulesApplied: false };
    }

    // Step 2: Process rules for this category
    const processResponse = await fetch(`${supabaseUrl}/functions/v1/process-email-rules`, {
      method: "POST",
      headers: {
        Authorization: authHeader,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email_id: emailId,
        category_id: classification.category_id,
        microsoft_message_id: msg.id,
      }),
    });

    if (!processResponse.ok) {
      const errorText = await processResponse.text();
      console.warn("Rule processing failed:", errorText);
      return { classified: true, rulesApplied: false, error: `Rule processing failed: ${errorText}` };
    }

    return { classified: true, rulesApplied: true };
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

    const { messages, userEmail, enableAiProcessing = true } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      throw new Error("Missing messages array");
    }

    const results = {
      peopleCreated: 0,
      emailsSynced: 0,
      emailsClassified: 0,
      rulesApplied: 0,
      errors: [] as string[],
    };

    // Cache for people to avoid duplicate lookups
    const personCache: Record<string, string | undefined> = {}; // email -> person_id

    // Track emails that need AI processing
    const emailsToProcess: Array<{ emailId: string; msg: GraphMessage }> = [];

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

        // Type assertion after null check
        const safeContactEmail = contactEmail;
        const safeContactName = contactName;

        let personId: string | undefined = personCache[safeContactEmail];

        if (!personId) {
          // Check if person exists (RLS will handle access control)
          const { data: existingPerson } = await supabase
            .from("people")
            .select("id")
            .ilike("email", safeContactEmail)
            .maybeSingle();

          if (existingPerson) {
            personId = existingPerson.id;
            personCache[safeContactEmail] = personId;
          } else {
            // Create new person
            const { data: newPerson, error: personError } = await supabase
              .from("people")
              .insert({
                name: safeContactName,
                email: safeContactEmail,
                is_auto_created: true,
                created_by: userId,
              })
              .select("id")
              .single();

            if (personError) {
              // Might be a race condition - try to fetch again
              const { data: retryPerson } = await supabase
                .from("people")
                .select("id")
                .ilike("email", safeContactEmail)
                .maybeSingle();
              
              if (retryPerson) {
                personId = retryPerson.id;
                personCache[safeContactEmail] = personId;
              }
            } else if (newPerson) {
              personId = newPerson.id;
              personCache[safeContactEmail] = personId;
              results.peopleCreated++;
            }
          }
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
            direction: isInbound ? "inbound" : "outbound",
            subject: msg.subject || null,
            body_preview: msg.bodyPreview || null,
            received_at: msg.receivedDateTime,
            is_read: msg.isRead,
            has_attachments: msg.hasAttachments,
            conversation_id: msg.conversationId || null,
            folder_id: msg.parentFolderId || null,
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
            emailsToProcess.push({ emailId: upsertedEmail.id, msg });
          }
        }
      } catch (msgError) {
        results.errors.push(`Message error: ${msgError instanceof Error ? msgError.message : "Unknown"}`);
      }
    }

    // Auto-process is always enabled now (no workspace settings)
    const autoProcessRules = true;

    // Process AI classification for unprocessed emails (limit to avoid timeout)
    const maxAiProcessing = 10; // Process max 10 emails per sync to avoid timeout
    const emailsToClassify = emailsToProcess.slice(0, maxAiProcessing);

    for (const { emailId, msg } of emailsToClassify) {
      const aiResult = await classifyAndProcessEmail(
        supabaseUrl,
        authHeader,
        emailId,
        msg,
        autoProcessRules
      );

      if (aiResult.classified) {
        results.emailsClassified++;
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
