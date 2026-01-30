import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface ProcessEntityRulesRequest {
  email_id: string;
  entity_table: string;
  microsoft_message_id?: string;
}

interface EntityRuleAction {
  id: string;
  action_type: string;
  config: Record<string, unknown>;
  is_active: boolean;
  sort_order: number;
}

interface EntityRule {
  id: string;
  entity_table: string;
  description: string | null;
  priority: number;
  actions: EntityRuleAction[];
}

interface ActionResult {
  action_type: string;
  success: boolean;
  error?: string;
}

// Mapping from entity_table to link table and ID field - all 8 entity types
const ENTITY_LINK_TABLES: Record<string, { table: string; idField: string }> = {
  influencers: { table: "email_influencers", idField: "influencer_id" },
  resellers: { table: "email_resellers", idField: "reseller_id" },
  product_suppliers: { table: "email_product_suppliers", idField: "product_supplier_id" },
  expense_suppliers: { table: "email_expense_suppliers", idField: "expense_supplier_id" },
  corporate_management: { table: "email_corporate_management", idField: "corporate_management_id" },
  personal_contacts: { table: "email_personal_contacts", idField: "personal_contact_id" },
  subscriptions: { table: "email_subscriptions", idField: "subscription_id" },
  marketing_sources: { table: "email_marketing_sources", idField: "marketing_source_id" },
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

    const { email_id, entity_table, microsoft_message_id }: ProcessEntityRulesRequest = await req.json();

    if (!email_id || !entity_table) {
      throw new Error("Missing required fields: email_id and entity_table");
    }

    // ============================
    // STEP 1: Auto-create Person/Sender and Entity records BEFORE processing rules
    // ============================
    console.log(`Ensuring records exist for email ${email_id} in entity table ${entity_table}`);
    const ensureResult = await ensureRecordsExist(supabase, email_id, entity_table, userId);
    console.log("Ensure records result:", ensureResult);

    // ============================
    // STEP 2: Fetch and process rules (existing logic)
    // ============================
    const { data: rules, error: rulesError } = await supabase
      .from("entity_automation_rules")
      .select(`
        id,
        entity_table,
        description,
        priority,
        actions:entity_rule_actions (
          id,
          action_type,
          config,
          is_active,
          sort_order
        )
      `)
      .eq("entity_table", entity_table)
      .eq("is_active", true)
      .order("priority", { ascending: false });

    if (rulesError) {
      console.error("Error fetching entity rules:", rulesError);
      throw new Error("Failed to fetch entity rules");
    }

    if (!rules || rules.length === 0) {
      // No rules defined - log it and mark as processed
      await supabase.from("email_rule_logs").insert({
        email_id: email_id,
        rule_id: null,
        action_type: "no_rules",
        action_config: { entity_table, auto_created: ensureResult },
        success: true,
        error_message: null,
        user_id: userId,
      });
      
      await supabase
        .from("email_messages")
        .update({ is_processed: true })
        .eq("id", email_id);

      return new Response(JSON.stringify({
        email_id,
        actions_applied: [],
        auto_created: ensureResult,
        message: "No active rules for this entity type",
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const actionsApplied: ActionResult[] = [];
    let totalActiveActions = 0;

    // Process each rule's actions
    for (const rule of rules as EntityRule[]) {
      const activeActions = (rule.actions || [])
        .filter((a) => a.is_active)
        .sort((a, b) => a.sort_order - b.sort_order);

      totalActiveActions += activeActions.length;

      for (const action of activeActions) {
        let result: ActionResult;
        try {
          result = await processAction(
            supabase,
            action,
            email_id,
            entity_table,
            microsoft_message_id,
            authHeader,
            userId
          );
        } catch (actionError) {
          console.error(`Action ${action.action_type} failed:`, actionError);
          result = {
            action_type: action.action_type,
            success: false,
            error: actionError instanceof Error ? actionError.message : "Unknown error",
          };
        }
        
        actionsApplied.push(result);

        // Log the action to the database
        await supabase.from("email_rule_logs").insert({
          email_id: email_id,
          rule_id: null,
          action_type: action.action_type,
          action_config: action.config,
          success: result.success,
          error_message: result.error || null,
          user_id: userId,
        });
      }
    }

    // If rules exist but no active actions, log that
    if (totalActiveActions === 0) {
      await supabase.from("email_rule_logs").insert({
        email_id: email_id,
        rule_id: null,
        action_type: "no_actions",
        action_config: { entity_table, auto_created: ensureResult },
        success: true,
        error_message: null,
        user_id: userId,
      });
    }

    // Mark email as processed
    await supabase
      .from("email_messages")
      .update({ is_processed: true })
      .eq("id", email_id);

    return new Response(JSON.stringify({
      email_id,
      actions_applied: actionsApplied,
      auto_created: ensureResult,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Process entity rules error:", message);
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: error instanceof Error && error.message === "Unauthorized" ? 401 : 500,
    });
  }
});

// ============================
// AUTO-CREATION LOGIC
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

async function ensureRecordsExist(
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
    console.error("Failed to fetch email:", emailError);
    return result;
  }

  const isPerson = email.is_person ?? true; // Default to person for backwards compatibility
  const effectiveUserId = email.user_id || userId;

  if (isPerson) {
    // ============================
    // PERSON-BASED FLOW
    // ============================
    let personId = email.person_id;

    // Create Person if needed
    if (!personId && email.sender_email) {
      const personResult = await findOrCreatePerson(supabase, email.sender_email, email.sender_name, effectiveUserId);
      if (personResult) {
        personId = personResult.id;
        result.personId = personId;
        result.personCreated = personResult.created;
        
        // Update email with person_id
        await supabase
          .from("email_messages")
          .update({ person_id: personId })
          .eq("id", emailId);
      }
    } else if (personId) {
      result.personId = personId;
    }

    // Create Entity and link to Person if we have a person
    if (personId) {
      const entityResult = await findOrCreateEntityForPerson(supabase, personId, entityTable, effectiveUserId);
      if (entityResult) {
        result.entityId = entityResult.id;
        result.entityCreated = entityResult.created;
        
        // Link email to entity
        const linked = await linkEmailToEntity(supabase, emailId, entityTable, entityResult.id);
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
      const newSenderId = await createSenderFromEmail(supabase, email.sender_email, email.sender_name, effectiveUserId);
      if (newSenderId) {
        senderId = newSenderId;
        result.senderId = senderId;
        result.senderCreated = true;
        
        // Update email with sender_id
        await supabase
          .from("email_messages")
          .update({ sender_id: senderId })
          .eq("id", emailId);
      }
    } else if (senderId) {
      result.senderId = senderId;
    }

    // Create Entity and link to Sender if we have a sender
    if (senderId) {
      const entityResult = await findOrCreateEntityForSender(supabase, senderId, entityTable, effectiveUserId);
      if (entityResult) {
        result.entityId = entityResult.id;
        result.entityCreated = entityResult.created;
        
        // Link email to entity
        const linked = await linkEmailToEntity(supabase, emailId, entityTable, entityResult.id);
        result.emailLinked = linked;
      }
    }
  }

  return result;
}

async function findOrCreatePerson(
  // deno-lint-ignore no-explicit-any
  supabase: any,
  email: string,
  name: string | null,
  userId: string
): Promise<{ id: string; created: boolean } | null> {
  try {
    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

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
  supabase: any,
  personId: string,
  entityTable: string,
  userId: string
): Promise<{ id: string; created: boolean } | null> {
  try {
    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

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
  supabase: any,
  senderId: string,
  entityTable: string,
  userId: string
): Promise<{ id: string; created: boolean } | null> {
  try {
    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

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

async function linkEmailToEntity(
  // deno-lint-ignore no-explicit-any
  supabase: any,
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
    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

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

// ============================
// RULE ACTION PROCESSING
// ============================

async function processAction(
  // deno-lint-ignore no-explicit-any
  supabase: any,
  action: EntityRuleAction,
  emailId: string,
  entityTable: string,
  microsoftMessageId: string | undefined,
  authHeader: string,
  userId: string
): Promise<ActionResult> {
  const config = action.config;

  switch (action.action_type) {
    case "visibility": {
      const groupId = config.visibility_group_id as string;
      if (!groupId) {
        return { action_type: "visibility", success: false, error: "No visibility group configured" };
      }

      const { error } = await supabase
        .from("email_messages")
        .update({ visibility_group_id: groupId })
        .eq("id", emailId);

      if (error) {
        return { action_type: "visibility", success: false, error: error.message };
      }
      return { action_type: "visibility", success: true };
    }

    case "tag": {
      const tagIds = config.tag_ids as string[];
      if (!tagIds || tagIds.length === 0) {
        return { action_type: "tag", success: false, error: "No tags configured" };
      }

      // Create email_message_tags entries
      const tagEntries = tagIds.map((tagId) => ({
        email_id: emailId,
        tag_id: tagId,
      }));

      const { error } = await supabase
        .from("email_message_tags")
        .upsert(tagEntries, { onConflict: "email_id,tag_id" });

      if (error) {
        return { action_type: "tag", success: false, error: error.message };
      }

      // Optionally sync to Outlook
      if (microsoftMessageId) {
        try {
          const { data: tags } = await supabase
            .from("email_tags")
            .select("name, outlook_category")
            .in("id", tagIds);

          if (tags && tags.length > 0) {
            const tagNames = (tags as Array<{ name: string; outlook_category: string | null }>)
              .map((t) => t.outlook_category || t.name);
            
            await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/sync-outlook-tags`, {
              method: "POST",
              headers: {
                Authorization: authHeader,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                microsoft_message_id: microsoftMessageId,
                tag_names: tagNames,
              }),
            });
          }
        } catch (syncError) {
          console.warn("Outlook tag sync failed:", syncError);
        }
      }

      return { action_type: "tag", success: true };
    }

    case "extract_invoice": {
      try {
        const response = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/extract-invoice`, {
          method: "POST",
          headers: {
            Authorization: authHeader,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email_id: emailId,
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          return { action_type: "extract_invoice", success: false, error: errorText };
        }

        return { action_type: "extract_invoice", success: true };
      } catch (error) {
        return { 
          action_type: "extract_invoice", 
          success: false, 
          error: error instanceof Error ? error.message : "Unknown error" 
        };
      }
    }

    case "mark_priority": {
      const priority = config.priority as string;
      console.log("Mark priority action triggered for email:", emailId, "priority:", priority);
      // Would call Graph API to update email importance
      return { action_type: "mark_priority", success: true };
    }

    case "assign_role": {
      const roleId = config.role_id as string;
      if (!roleId) {
        return { action_type: "assign_role", success: false, error: "No role configured" };
      }

      // Get the email to check is_person flag
      const { data: email } = await supabase
        .from("email_messages")
        .select("person_id, sender_id, is_person")
        .eq("id", emailId)
        .single();

      // Use is_person flag to determine which record type to use
      const isPerson = email?.is_person ?? true; // Default to person for backwards compatibility

      // For sender-based emails (is_person = false), use sender's entity
      if (!isPerson && email?.sender_id) {
        const { data: sender } = await supabase
          .from("senders")
          .select("entity_id, entity_table")
          .eq("id", email.sender_id)
          .maybeSingle();

        if (sender?.entity_id && sender?.entity_table === entityTable) {
          // Create record role assignment for the sender's entity
          const { error } = await supabase
            .from("record_role_assignments")
            .upsert({
              record_id: sender.entity_id,
              table_name: entityTable,
              entity_role_id: roleId,
            }, { onConflict: "record_id,table_name,entity_role_id" });

          if (error) {
            return { action_type: "assign_role", success: false, error: error.message };
          }
          return { action_type: "assign_role", success: true };
        }
      }

      if (!email?.person_id) {
        return { action_type: "assign_role", success: false, error: "No person or sender linked to email" };
      }

      // Get entity record ID from people_entities
      const { data: peopleEntity } = await supabase
        .from("people_entities")
        .select("entity_id")
        .eq("person_id", email.person_id)
        .eq("entity_table", entityTable)
        .maybeSingle();

      if (!peopleEntity?.entity_id) {
        return { action_type: "assign_role", success: false, error: "No entity linked to person" };
      }

      // Create record role assignment
      const { error } = await supabase
        .from("record_role_assignments")
        .upsert({
          record_id: peopleEntity.entity_id,
          table_name: entityTable,
          entity_role_id: roleId,
        }, { onConflict: "record_id,table_name,entity_role_id" });

      if (error) {
        return { action_type: "assign_role", success: false, error: error.message };
      }

      return { action_type: "assign_role", success: true };
    }

    default:
      return { action_type: action.action_type, success: false, error: "Unknown action type" };
  }
}

// Helper to create sender record from email info
async function createSenderFromEmail(
  // deno-lint-ignore no-explicit-any
  supabase: any,
  email: string,
  displayName: string | null,
  userId: string
): Promise<string | null> {
  try {
    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Check if sender already exists
    const { data: existingSender } = await serviceClient
      .from("senders")
      .select("id")
      .ilike("email", email)
      .maybeSingle();

    if (existingSender) {
      return existingSender.id;
    }

    // Determine sender type from email pattern
    const localPart = email.split('@')[0].toLowerCase();
    let senderType = 'automated';
    if (/^(newsletter|news|updates|digest)/.test(localPart)) {
      senderType = 'newsletter';
    } else if (/^(support|info|hello|contact|sales|team|help)/.test(localPart)) {
      senderType = 'shared_inbox';
    } else if (/^(system|automated|notifications|alerts)/.test(localPart)) {
      senderType = 'system';
    }

    const domain = email.split('@')[1]?.toLowerCase() || null;

    const { data: newSender, error } = await serviceClient
      .from("senders")
      .insert({
        email: email.toLowerCase(),
        display_name: displayName,
        sender_type: senderType,
        domain,
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
    console.error("Error creating sender:", e);
    return null;
  }
}

