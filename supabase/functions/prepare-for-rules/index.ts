import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface PrepareForRulesRequest {
  email_ids: string[];
  entity_table: string;
}

interface PrepareResult {
  emailId: string;
  success: boolean;
  personId?: string;
  senderId?: string;
  entityId?: string;
  personCreated?: boolean;
  senderCreated?: boolean;
  entityCreated?: boolean;
  emailLinked?: boolean;
  error?: string;
}

// Mapping from entity_table to link table and ID field - all 10 entity types
const ENTITY_LINK_TABLES: Record<string, { table: string; idField: string }> = {
  affiliates: { table: "email_affiliates", idField: "affiliate_id" },
  resellers: { table: "email_resellers", idField: "reseller_id" },
  product_suppliers: { table: "email_product_suppliers", idField: "product_supplier_id" },
  services_suppliers: { table: "email_services_suppliers", idField: "services_supplier_id" },
  corporate_management: { table: "email_corporate_management", idField: "corporate_management_id" },
  personal_contacts: { table: "email_personal_contacts", idField: "personal_contact_id" },
  subscriptions: { table: "email_subscriptions", idField: "subscription_id" },
  marketing_sources: { table: "email_marketing_sources", idField: "marketing_source_id" },
  merchant_accounts: { table: "email_merchant_accounts", idField: "merchant_account_id" },
  logistic_suppliers: { table: "email_logistic_suppliers", idField: "logistic_supplier_id" },
};

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

    const { email_ids, entity_table }: PrepareForRulesRequest = await req.json();

    if (!email_ids || !Array.isArray(email_ids) || email_ids.length === 0) {
      throw new Error("Missing required field: email_ids (array)");
    }
    if (!entity_table) {
      throw new Error("Missing required field: entity_table");
    }

    // Validate entity_table is supported
    if (!ENTITY_LINK_TABLES[entity_table]) {
      throw new Error(`Unsupported entity_table: ${entity_table}`);
    }

    console.log(`Preparing ${email_ids.length} emails for rules queue with entity_table: ${entity_table}`);

    const results: PrepareResult[] = [];

    // Process each email
    for (const emailId of email_ids) {
      try {
        const result = await prepareEmailForRules(supabase, emailId, entity_table, userId);
        results.push({ emailId, success: true, ...result });
      } catch (e) {
        console.error(`Failed to prepare email ${emailId}:`, e);
        results.push({
          emailId,
          success: false,
          error: e instanceof Error ? e.message : "Unknown error",
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    console.log(`Prepared ${successCount}/${email_ids.length} emails successfully`);

    return new Response(JSON.stringify({
      results,
      total: email_ids.length,
      successful: successCount,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Prepare for rules error:", message);
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: error instanceof Error && error.message === "Unauthorized" ? 401 : 500,
    });
  }
});

// ============================
// MAIN PREPARATION LOGIC
// ============================

interface EnsureRecordsResult {
  personId?: string;
  senderId?: string;
  entityId?: string;
  personCreated?: boolean;
  senderCreated?: boolean;
  entityCreated?: boolean;
  emailLinked?: boolean;
}

async function prepareEmailForRules(
  // deno-lint-ignore no-explicit-any
  supabase: any,
  emailId: string,
  entityTable: string,
  userId: string
): Promise<EnsureRecordsResult> {
  const result: EnsureRecordsResult = {};

  // Get email details
  const { data: email, error: emailError } = await supabase
    .from("email_messages")
    .select("person_id, sender_id, sender_email, sender_name, user_id, is_person")
    .eq("id", emailId)
    .single();

  if (emailError || !email) {
    throw new Error(`Failed to fetch email: ${emailError?.message || "Not found"}`);
  }

  const isPerson = email.is_person ?? true; // Default to person for backwards compatibility
  const effectiveUserId = email.user_id || userId;

  const serviceClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  if (isPerson) {
    // ============================
    // PERSON-BASED FLOW
    // ============================
    let personId = email.person_id;

    // Create Person if needed
    if (!personId && email.sender_email) {
      const personResult = await findOrCreatePerson(serviceClient, email.sender_email, email.sender_name, effectiveUserId);
      if (personResult) {
        personId = personResult.id;
        result.personId = personId;
        result.personCreated = personResult.created;

        // Update email with person_id
        await serviceClient
          .from("email_messages")
          .update({ person_id: personId })
          .eq("id", emailId);
      }
    } else if (personId) {
      result.personId = personId;
    }

    // Create Entity and link to Person if we have a person
    if (personId) {
      const entityResult = await findOrCreateEntityForPerson(serviceClient, personId, entityTable, effectiveUserId);
      if (entityResult) {
        result.entityId = entityResult.id;
        result.entityCreated = entityResult.created;

        // Link email to entity
        const linked = await linkEmailToEntity(serviceClient, emailId, entityTable, entityResult.id);
        result.emailLinked = linked;
      }
    }
  } else {
    // ============================
    // SENDER-BASED FLOW (non-person)
    // ============================
    let senderId = email.sender_id;

    // Create Sender if needed
    if (!senderId && email.sender_email) {
      const newSenderId = await createSenderFromEmail(serviceClient, email.sender_email, email.sender_name, effectiveUserId);
      if (newSenderId) {
        senderId = newSenderId;
        result.senderId = senderId;
        result.senderCreated = true;

        // Update email with sender_id
        await serviceClient
          .from("email_messages")
          .update({ sender_id: senderId })
          .eq("id", emailId);
      }
    } else if (senderId) {
      result.senderId = senderId;
    }

    // Create Entity and link to Sender if we have a sender
    if (senderId) {
      const entityResult = await findOrCreateEntityForSender(serviceClient, senderId, entityTable, effectiveUserId);
      if (entityResult) {
        result.entityId = entityResult.id;
        result.entityCreated = entityResult.created;

        // Link email to entity
        const linked = await linkEmailToEntity(serviceClient, emailId, entityTable, entityResult.id);
        result.emailLinked = linked;
      }
    }
  }

  // Set entity_table to move email to Rules Queue
  const { error: updateError } = await serviceClient
    .from("email_messages")
    .update({ entity_table: entityTable })
    .eq("id", emailId);

  if (updateError) {
    console.warn(`Failed to set entity_table for email ${emailId}:`, updateError);
  }

  return result;
}

// ============================
// HELPER FUNCTIONS
// ============================

async function findOrCreatePerson(
  // deno-lint-ignore no-explicit-any
  serviceClient: any,
  email: string,
  name: string | null,
  userId: string
): Promise<{ id: string; created: boolean } | null> {
  try {
    // Check if person already exists by email
    const { data: existingPerson } = await serviceClient
      .from("people")
      .select("id")
      .ilike("email", email)
      .maybeSingle();

    if (existingPerson) {
      return { id: existingPerson.id, created: false };
    }

    // Create new person
    const { data: newPerson, error } = await serviceClient
      .from("people")
      .insert({
        name: name || email.split('@')[0],
        email: email.toLowerCase(),
        is_auto_created: true,
        created_by: userId,
      })
      .select("id")
      .single();

    if (error) {
      console.error("Failed to create person:", error);
      // Race condition - try to fetch again
      const { data: retryPerson } = await serviceClient
        .from("people")
        .select("id")
        .ilike("email", email)
        .maybeSingle();
      if (retryPerson) {
        return { id: retryPerson.id, created: false };
      }
      return null;
    }

    return newPerson ? { id: newPerson.id, created: true } : null;
  } catch (e) {
    console.error("Error in findOrCreatePerson:", e);
    return null;
  }
}

async function findOrCreateEntityForPerson(
  // deno-lint-ignore no-explicit-any
  serviceClient: any,
  personId: string,
  entityTable: string,
  userId: string
): Promise<{ id: string; created: boolean } | null> {
  try {
    // Check if person already linked to an entity of this type
    const { data: existingLink } = await serviceClient
      .from("people_entities")
      .select("entity_id")
      .eq("person_id", personId)
      .eq("entity_table", entityTable)
      .maybeSingle();

    if (existingLink?.entity_id) {
      return { id: existingLink.entity_id, created: false };
    }

    // Get person details
    const { data: person } = await serviceClient
      .from("people")
      .select("name, email, phone, notes")
      .eq("id", personId)
      .single();

    if (!person) {
      console.error("Person not found:", personId);
      return null;
    }

    // Check if entity exists by email
    const { data: existingEntity } = await serviceClient
      .from(entityTable)
      .select("id")
      .eq("email", person.email)
      .maybeSingle();

    let entityId: string;
    let created = false;

    if (existingEntity) {
      entityId = existingEntity.id;
    } else {
      // Create new entity
      const { data: newEntity, error: createError } = await serviceClient
        .from(entityTable)
        .insert({
          name: person.name,
          email: person.email,
          phone: person.phone,
          notes: person.notes,
          created_by: userId,
        })
        .select("id")
        .single();

      if (createError || !newEntity) {
        console.error("Failed to create entity:", createError);
        return null;
      }
      entityId = newEntity.id;
      created = true;
    }

    // Link person to entity
    const { error: linkError } = await serviceClient
      .from("people_entities")
      .upsert({
        person_id: personId,
        entity_id: entityId,
        entity_table: entityTable,
      }, { onConflict: "person_id,entity_id,entity_table" });

    if (linkError) {
      console.warn("Failed to link person to entity:", linkError);
    }

    return { id: entityId, created };
  } catch (e) {
    console.error("Error in findOrCreateEntityForPerson:", e);
    return null;
  }
}

async function findOrCreateEntityForSender(
  // deno-lint-ignore no-explicit-any
  serviceClient: any,
  senderId: string,
  entityTable: string,
  userId: string
): Promise<{ id: string; created: boolean } | null> {
  try {
    // Get sender info
    const { data: sender } = await serviceClient
      .from("senders")
      .select("email, display_name, entity_id, entity_table")
      .eq("id", senderId)
      .single();

    if (!sender) {
      console.error("Sender not found:", senderId);
      return null;
    }

    // If sender already linked to an entity of the same type, use it
    if (sender.entity_id && sender.entity_table === entityTable) {
      return { id: sender.entity_id, created: false };
    }

    // Find or create entity based on sender's email
    const { data: existingEntity } = await serviceClient
      .from(entityTable)
      .select("id")
      .eq("email", sender.email)
      .maybeSingle();

    let entityId: string;
    let created = false;

    if (existingEntity) {
      entityId = existingEntity.id;
    } else {
      // Create new entity from sender info
      const { data: newEntity, error: createError } = await serviceClient
        .from(entityTable)
        .insert({
          name: sender.display_name || sender.email.split('@')[0],
          email: sender.email,
          created_by: userId,
        })
        .select("id")
        .single();

      if (createError || !newEntity) {
        console.error("Failed to create entity for sender:", createError);
        return null;
      }
      entityId = newEntity.id;
      created = true;
    }

    // Update sender with entity link
    await serviceClient
      .from("senders")
      .update({
        entity_id: entityId,
        entity_table: entityTable,
      })
      .eq("id", senderId);

    return { id: entityId, created };
  } catch (e) {
    console.error("Error in findOrCreateEntityForSender:", e);
    return null;
  }
}

async function createSenderFromEmail(
  // deno-lint-ignore no-explicit-any
  serviceClient: any,
  email: string,
  displayName: string | null,
  userId: string
): Promise<string | null> {
  try {
    // Check if sender already exists
    const { data: existingSender } = await serviceClient
      .from("senders")
      .select("id")
      .ilike("email", email)
      .maybeSingle();

    if (existingSender) {
      return existingSender.id;
    }

    // Extract domain from email
    const domain = email.includes('@') ? email.split('@')[1].toLowerCase() : null;

    // Create new sender
    const { data: newSender, error } = await serviceClient
      .from("senders")
      .insert({
        email: email.toLowerCase(),
        display_name: displayName,
        domain,
        sender_type: "automated",
        is_auto_created: true,
        created_by: userId,
      })
      .select("id")
      .single();

    if (error) {
      console.error("Failed to create sender:", error);
      // Race condition - try to fetch again
      const { data: retrySender } = await serviceClient
        .from("senders")
        .select("id")
        .ilike("email", email)
        .maybeSingle();
      return retrySender?.id || null;
    }

    return newSender?.id || null;
  } catch (e) {
    console.error("Error in createSenderFromEmail:", e);
    return null;
  }
}

async function linkEmailToEntity(
  // deno-lint-ignore no-explicit-any
  serviceClient: any,
  emailId: string,
  entityTable: string,
  entityId: string
): Promise<boolean> {
  const linkConfig = ENTITY_LINK_TABLES[entityTable];
  if (!linkConfig) {
    console.warn(`No link table configured for ${entityTable}`);
    return false;
  }

  try {
    const linkData: Record<string, string> = {
      email_id: emailId,
      [linkConfig.idField]: entityId,
    };

    const { error: linkError } = await serviceClient
      .from(linkConfig.table)
      .upsert(linkData, { onConflict: `email_id,${linkConfig.idField}` });

    if (linkError) {
      console.warn(`Failed to link email to ${entityTable}:`, linkError);
      return false;
    }

    return true;
  } catch (e) {
    console.error("Error in linkEmailToEntity:", e);
    return false;
  }
}
