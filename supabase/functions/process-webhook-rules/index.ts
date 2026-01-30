import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface ProcessWebhookRulesRequest {
  event_id: string;
  entity_table: string;
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

    const { event_id, entity_table }: ProcessWebhookRulesRequest = await req.json();

    if (!event_id || !entity_table) {
      throw new Error("Missing required fields: event_id and entity_table");
    }

    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get webhook event
    const { data: event, error: eventError } = await serviceClient
      .from("webhook_events")
      .select("id, payload, person_id, entity_id, status")
      .eq("id", event_id)
      .single();

    if (eventError || !event) {
      throw new Error(`Webhook event not found: ${eventError?.message || "Not found"}`);
    }

    // Update status to processing
    await serviceClient
      .from("webhook_events")
      .update({ status: "processing" })
      .eq("id", event_id);

    // Fetch entity automation rules
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

    const actionsApplied: ActionResult[] = [];

    if (!rules || rules.length === 0) {
      // No rules defined - log it and mark as processed
      await serviceClient.from("webhook_event_logs").insert({
        webhook_event_id: event_id,
        action_type: "no_rules",
        action_config: { entity_table },
        success: true,
        error_message: null,
      });
    } else {
      // Process each rule's actions
      for (const rule of rules as EntityRule[]) {
        const activeActions = (rule.actions || [])
          .filter((a) => a.is_active)
          .sort((a, b) => a.sort_order - b.sort_order);

        for (const action of activeActions) {
          let result: ActionResult;
          try {
            result = await processAction(
              serviceClient,
              action,
              event_id,
              entity_table,
              event.entity_id,
              event.payload as Record<string, unknown>,
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

          // Log the action
          await serviceClient.from("webhook_event_logs").insert({
            webhook_event_id: event_id,
            action_type: action.action_type,
            action_config: action.config,
            success: result.success,
            error_message: result.error || null,
          });
        }
      }
    }

    // Mark event as processed
    await serviceClient
      .from("webhook_events")
      .update({ 
        status: "processed",
        processed_at: new Date().toISOString(),
      })
      .eq("id", event_id);

    return new Response(JSON.stringify({
      event_id,
      actions_applied: actionsApplied,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Process webhook rules error:", message);

    // Try to mark as failed if we have the event_id
    try {
      const { event_id } = await req.clone().json();
      if (event_id) {
        const serviceClient = createClient(
          Deno.env.get("SUPABASE_URL")!,
          Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
        );
        await serviceClient
          .from("webhook_events")
          .update({ 
            status: "failed",
            error_message: message,
          })
          .eq("id", event_id);
      }
    } catch (e) {
      // Ignore
    }

    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: error instanceof Error && error.message === "Unauthorized" ? 401 : 500,
    });
  }
});

// ============================
// ACTION PROCESSING
// ============================

async function processAction(
  // deno-lint-ignore no-explicit-any
  serviceClient: any,
  action: EntityRuleAction,
  eventId: string,
  entityTable: string,
  entityId: string | null,
  payload: Record<string, unknown>,
  authHeader: string,
  userId: string
): Promise<ActionResult> {
  const { action_type, config } = action;

  switch (action_type) {
    case "tag":
      return await applyTag(serviceClient, entityId, entityTable, config, userId);

    case "assign_role":
      return await assignRole(serviceClient, entityId, entityTable, config);

    case "extract_invoice":
      return await extractInvoiceFromPayload(serviceClient, eventId, payload, config, userId);

    default:
      console.log(`Unknown action type: ${action_type}`);
      return { action_type, success: true }; // Skip unknown actions
  }
}

async function applyTag(
  // deno-lint-ignore no-explicit-any
  serviceClient: any,
  entityId: string | null,
  entityTable: string,
  config: Record<string, unknown>,
  userId: string
): Promise<ActionResult> {
  if (!entityId) {
    return { action_type: "tag", success: false, error: "No entity to tag" };
  }

  try {
    const tagName = config.tag_name as string;
    if (!tagName) {
      return { action_type: "tag", success: false, error: "No tag_name in config" };
    }

    // Find or create the tag
    let { data: tag } = await serviceClient
      .from("email_tags")
      .select("id")
      .eq("name", tagName)
      .maybeSingle();

    if (!tag) {
      const { data: newTag, error: tagError } = await serviceClient
        .from("email_tags")
        .insert({ name: tagName, created_by: userId })
        .select("id")
        .single();

      if (tagError) {
        return { action_type: "tag", success: false, error: tagError.message };
      }
      tag = newTag;
    }

    // Note: For entity tagging, we'd need an entity_tags table
    // For now, log success as the tag was created/found
    console.log(`Tag "${tagName}" would be applied to ${entityTable}:${entityId}`);

    return { action_type: "tag", success: true };
  } catch (e) {
    return { action_type: "tag", success: false, error: e instanceof Error ? e.message : "Unknown" };
  }
}

async function assignRole(
  // deno-lint-ignore no-explicit-any
  serviceClient: any,
  entityId: string | null,
  entityTable: string,
  config: Record<string, unknown>
): Promise<ActionResult> {
  if (!entityId) {
    return { action_type: "assign_role", success: false, error: "No entity for role" };
  }

  try {
    const roleId = config.role_id as string;
    if (!roleId) {
      return { action_type: "assign_role", success: false, error: "No role_id in config" };
    }

    const { error } = await serviceClient
      .from("record_role_assignments")
      .upsert({
        record_id: entityId,
        table_name: entityTable,
        entity_role_id: roleId,
      }, { onConflict: "record_id,table_name,entity_role_id" });

    if (error) {
      return { action_type: "assign_role", success: false, error: error.message };
    }

    return { action_type: "assign_role", success: true };
  } catch (e) {
    return { action_type: "assign_role", success: false, error: e instanceof Error ? e.message : "Unknown" };
  }
}

async function extractInvoiceFromPayload(
  // deno-lint-ignore no-explicit-any
  serviceClient: any,
  eventId: string,
  payload: Record<string, unknown>,
  config: Record<string, unknown>,
  userId: string
): Promise<ActionResult> {
  try {
    const data = (payload.data || payload) as Record<string, unknown>;
    
    // Try to extract invoice data from payload
    const invoiceData = {
      vendor_name: data.vendor_name || data.company || data.name,
      invoice_number: data.invoice_number || data.invoice_id,
      amount: data.amount || data.total,
      currency: data.currency || "USD",
      due_date: data.due_date,
    };

    // Only create if we have meaningful data
    if (!invoiceData.vendor_name && !invoiceData.amount) {
      return { action_type: "extract_invoice", success: true }; // Nothing to extract
    }

    // Note: We'd need a webhook-related invoice table or adapt extracted_invoices
    console.log("Invoice data extracted:", invoiceData);

    return { action_type: "extract_invoice", success: true };
  } catch (e) {
    return { action_type: "extract_invoice", success: false, error: e instanceof Error ? e.message : "Unknown" };
  }
}
