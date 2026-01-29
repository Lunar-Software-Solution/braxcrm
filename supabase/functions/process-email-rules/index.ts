import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface ProcessRulesRequest {
  email_id: string;
  category_id: string;
  microsoft_message_id?: string;
}

interface RuleAction {
  id: string;
  action_type: string;
  config: Record<string, unknown>;
  is_active: boolean;
}

interface Rule {
  id: string;
  name: string;
  priority: number;
  email_rule_actions: RuleAction[];
}

interface ActionResult {
  action_type: string;
  success: boolean;
  error?: string;
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

    // Validate user
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      throw new Error("Unauthorized");
    }
    const userId = claimsData.claims.sub as string;

    const { email_id, category_id, microsoft_message_id }: ProcessRulesRequest = await req.json();

    if (!email_id || !category_id) {
      throw new Error("Missing required fields: email_id and category_id");
    }

    // Fetch all active rules for this category, ordered by priority (highest first)
    const { data: rules, error: rulesError } = await supabase
      .from("email_rules")
      .select(`
        id,
        name,
        priority,
        email_rule_actions (
          id,
          action_type,
          config,
          is_active
        )
      `)
      .eq("category_id", category_id)
      .eq("is_active", true)
      .order("priority", { ascending: false });

    if (rulesError) {
      console.error("Error fetching rules:", rulesError);
      throw new Error("Failed to fetch rules");
    }

    if (!rules || rules.length === 0) {
      return new Response(JSON.stringify({
        email_id,
        actions_applied: [],
        message: "No active rules for this category",
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const actionsApplied: ActionResult[] = [];

    // Process each rule's actions
    for (const rule of rules as Rule[]) {
      const activeActions = rule.email_rule_actions.filter((a) => a.is_active);

      for (const action of activeActions) {
        let result: ActionResult;
        try {
          result = await processAction(
            supabase,
            action,
            email_id,
            microsoft_message_id,
            authHeader
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
          rule_id: rule.id,
          action_type: action.action_type,
          action_config: action.config,
          success: result.success,
          error_message: result.error || null,
          user_id: userId,
        });
      }
    }

    // Mark email as processed
    await supabase
      .from("email_messages")
      .update({ is_processed: true })
      .eq("id", email_id);

    return new Response(JSON.stringify({
      email_id,
      actions_applied: actionsApplied,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Process rules error:", message);
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: error instanceof Error && error.message === "Unauthorized" ? 401 : 500,
    });
  }
});

async function processAction(
  // deno-lint-ignore no-explicit-any
  supabase: any,
  action: RuleAction,
  emailId: string,
  microsoftMessageId: string | undefined,
  authHeader: string
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

      // Optionally sync to Outlook (call sync-outlook-tags function)
      if (microsoftMessageId) {
        try {
          // Fetch tag names for Outlook sync
          const { data: tags } = await supabase
            .from("email_tags")
            .select("name, outlook_category")
            .in("id", tagIds);

          if (tags && tags.length > 0) {
            const tagNames = (tags as Array<{ name: string; outlook_category: string | null }>)
              .map((t) => t.outlook_category || t.name);
            
            // Call sync-outlook-tags edge function
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
          // Don't fail the action if Outlook sync fails
        }
      }

      return { action_type: "tag", success: true };
    }

    case "assign_object_type": {
      const objectTypeIds = config.object_type_ids as string[];
      const assignToPerson = config.assign_to_person as boolean;
      const assignToEmail = config.assign_to_email as boolean;

      if (!objectTypeIds || objectTypeIds.length === 0) {
        return { action_type: "assign_object_type", success: false, error: "No object types configured" };
      }

      // Get the email to find the person_id
      const { data: email } = await supabase
        .from("email_messages")
        .select("person_id")
        .eq("id", emailId)
        .single();

      if (!email) {
        return { action_type: "assign_object_type", success: false, error: "Email not found" };
      }

      // Assign to person if configured and person exists
      if (assignToPerson && email.person_id) {
        const personEntries = objectTypeIds.map((objectTypeId) => ({
          person_id: email.person_id,
          object_type_id: objectTypeId,
          source: "email_rule",
        }));

        const { error: personError } = await supabase
          .from("person_object_types")
          .upsert(personEntries, { onConflict: "person_id,object_type_id" });

        if (personError) {
          console.warn("Failed to assign object types to person:", personError);
        }
      }

      // Assign to email if configured
      if (assignToEmail) {
        const emailEntries = objectTypeIds.map((objectTypeId) => ({
          email_id: emailId,
          object_type_id: objectTypeId,
        }));

        const { error: emailError } = await supabase
          .from("email_object_types")
          .upsert(emailEntries, { onConflict: "email_id,object_type_id" });

        if (emailError) {
          console.warn("Failed to assign object types to email:", emailError);
        }
      }

      return { action_type: "assign_object_type", success: true };
    }

    case "extract_invoice": {
      // Call the extract-invoice edge function
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

    case "extract_attachments": {
      // For now, just log this action - attachment extraction would require additional implementation
      console.log("Extract attachments action triggered for email:", emailId, "config:", config);
      return { action_type: "extract_attachments", success: true };
    }

    case "move_folder": {
      // This would call the Graph API to move the email
      // For now, log the action
      console.log("Move folder action triggered for email:", emailId, "config:", config);
      return { action_type: "move_folder", success: true };
    }

    case "mark_priority": {
      // This would call the Graph API to update email importance
      console.log("Mark priority action triggered for email:", emailId, "config:", config);
      return { action_type: "mark_priority", success: true };
    }

    case "assign_entity": {
      const entityType = config.entity_type as string;
      const createIfNotExists = config.create_if_not_exists as boolean;

      if (!entityType || !["influencer", "reseller", "supplier", "corporate_management"].includes(entityType)) {
        return { action_type: "assign_entity", success: false, error: "Invalid entity type" };
      }

      // Get email details including the person
      const { data: email } = await supabase
        .from("email_messages")
        .select("person_id, user_id")
        .eq("id", emailId)
        .single();

      if (!email) {
        return { action_type: "assign_entity", success: false, error: "Email not found" };
      }

      // Get person details
      const { data: person } = await supabase
        .from("people")
        .select("id, name, email, phone, notes")
        .eq("id", email.person_id)
        .single();

      if (!person && !createIfNotExists) {
        return { action_type: "assign_entity", success: false, error: "No person linked to email" };
      }

      if (!person) {
        return { action_type: "assign_entity", success: true }; // Nothing to do
      }

      // Determine which table to use - handle corporate_management specially (no 's' suffix)
      const tableName = entityType === "corporate_management" ? "corporate_management" : `${entityType}s`;
      const linkTable = `email_${tableName}`; // email_influencers, email_corporate_management, etc.
      const entityIdField = `${entityType}_id`; // influencer_id, corporate_management_id, etc.

      // Check if entity already exists by email
      const { data: existingEntity } = await supabase
        .from(tableName)
        .select("id")
        .eq("email", person.email)
        .maybeSingle();

      let entityId: string;

      if (existingEntity) {
        entityId = existingEntity.id;
      } else if (createIfNotExists) {
        // Create new entity - get user id for created_by
        const { data: userData } = await supabase.auth.getUser();
        const userId = userData?.user?.id;
        
        const { data: newEntity, error: createError } = await supabase
          .from(tableName)
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
          return { action_type: "assign_entity", success: false, error: createError?.message || "Failed to create entity" };
        }
        entityId = newEntity.id;
      } else {
        return { action_type: "assign_entity", success: true }; // No entity, nothing to link
      }

      // Link email to entity
      const linkData: Record<string, string> = {
        email_id: emailId,
        [entityIdField]: entityId,
      };

      const { error: linkError } = await supabase
        .from(linkTable)
        .upsert(linkData, { onConflict: `email_id,${entityIdField}` });

      if (linkError) {
        console.warn(`Failed to link email to ${entityType}:`, linkError);
      }

      return { action_type: "assign_entity", success: true };
    }

    default:
      return { action_type: action.action_type, success: false, error: "Unknown action type" };
  }
}
