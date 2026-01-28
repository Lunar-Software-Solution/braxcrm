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

function extractDomainFromEmail(email: string): string | null {
  const match = email.match(/@([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})$/);
  return match ? match[1].toLowerCase() : null;
}

function extractCompanyNameFromDomain(domain: string): string {
  const name = domain
    .replace(/\.(com|org|net|io|co|app|dev|tech|ai|xyz|info|biz)$/i, '')
    .split('.')
    .pop() || domain;
  return name.charAt(0).toUpperCase() + name.slice(1);
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

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      throw new Error("Unauthorized");
    }
    const userId = claimsData.claims.sub as string;

    const { workspaceId, messages, userEmail } = await req.json();

    if (!workspaceId || !messages || !Array.isArray(messages)) {
      throw new Error("Missing workspaceId or messages");
    }

    const results = {
      peopleCreated: 0,
      companiesCreated: 0,
      emailsSynced: 0,
      errors: [] as string[],
    };

    // Cache for companies and people to avoid duplicate lookups
    const companyCache: Record<string, string | undefined> = {}; // domain -> company_id
    const personCache: Record<string, string | undefined> = {}; // email -> person_id

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
          // Check if person exists
          const { data: existingPerson } = await supabase
            .from("people")
            .select("id")
            .eq("workspace_id", workspaceId)
            .ilike("email", safeContactEmail)
            .maybeSingle();

          if (existingPerson) {
            personId = existingPerson.id;
            personCache[safeContactEmail] = personId;
          } else {
            // Create company first if domain exists
            const domain = extractDomainFromEmail(safeContactEmail);
            let companyId: string | undefined = undefined;

            if (domain) {
              companyId = companyCache[domain];

              if (!companyId) {
                // Check if company exists
                const { data: existingCompany } = await supabase
                  .from("companies")
                  .select("id")
                  .eq("workspace_id", workspaceId)
                  .eq("domain", domain)
                  .maybeSingle();

                if (existingCompany) {
                  companyId = existingCompany.id;
                  companyCache[domain] = companyId;
                } else {
                  // Create new company
                  const companyName = extractCompanyNameFromDomain(domain);
                  const { data: newCompany, error: companyError } = await supabase
                    .from("companies")
                    .insert({
                      workspace_id: workspaceId,
                      name: companyName,
                      domain: domain,
                      created_by: userId,
                    })
                    .select("id")
                    .single();

                  if (companyError) {
                    // Might be a race condition - try to fetch again
                    const { data: retryCompany } = await supabase
                      .from("companies")
                      .select("id")
                      .eq("workspace_id", workspaceId)
                      .eq("domain", domain)
                      .maybeSingle();
                    
                    if (retryCompany) {
                      companyId = retryCompany.id;
                      companyCache[domain] = companyId;
                    }
                  } else if (newCompany) {
                    companyId = newCompany.id;
                    companyCache[domain] = companyId;
                    results.companiesCreated++;
                  }
                }
              }
            }

            // Create new person
            const { data: newPerson, error: personError } = await supabase
              .from("people")
              .insert({
                workspace_id: workspaceId,
                company_id: companyId || null,
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
                .eq("workspace_id", workspaceId)
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

        // Upsert email message
        const { error: emailError } = await supabase
          .from("email_messages")
          .upsert({
            workspace_id: workspaceId,
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
          }, {
            onConflict: "workspace_id,microsoft_message_id",
          });

        if (emailError) {
          results.errors.push(`Email ${msg.id}: ${emailError.message}`);
        } else {
          results.emailsSynced++;
        }
      } catch (msgError) {
        results.errors.push(`Message error: ${msgError instanceof Error ? msgError.message : "Unknown"}`);
      }
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
