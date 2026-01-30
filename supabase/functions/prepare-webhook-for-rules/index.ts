import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface PrepareWebhookRequest {
  event_ids: string[];
  entity_table: string;
}

interface PrepareResult {
  eventId: string;
  success: boolean;
  personId?: string;
  entityId?: string;
  personCreated?: boolean;
  entityCreated?: boolean;
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

    const { event_ids, entity_table }: PrepareWebhookRequest = await req.json();

    if (!event_ids || !Array.isArray(event_ids) || event_ids.length === 0) {
      throw new Error("Missing required field: event_ids (array)");
    }
    if (!entity_table) {
      throw new Error("Missing required field: entity_table");
    }

    console.log(`Preparing ${event_ids.length} webhook events for rules with entity_table: ${entity_table}`);

    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const results: PrepareResult[] = [];

    for (const eventId of event_ids) {
      try {
        // Update status to processing
        await serviceClient
          .from("webhook_events")
          .update({ status: "processing" })
          .eq("id", eventId);

        const result = await prepareWebhookEvent(serviceClient, eventId, entity_table, userId);
        results.push({ eventId, success: true, ...result });
      } catch (e) {
        console.error(`Failed to prepare webhook event ${eventId}:`, e);
        
        // Mark as failed
        await serviceClient
          .from("webhook_events")
          .update({ 
            status: "failed",
            error_message: e instanceof Error ? e.message : "Unknown error"
          })
          .eq("id", eventId);

        results.push({
          eventId,
          success: false,
          error: e instanceof Error ? e.message : "Unknown error",
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    console.log(`Prepared ${successCount}/${event_ids.length} webhook events successfully`);

    return new Response(JSON.stringify({
      results,
      total: event_ids.length,
      successful: successCount,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Prepare webhook for rules error:", message);
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: error instanceof Error && error.message === "Unauthorized" ? 401 : 500,
    });
  }
});

// ============================
// MAIN PREPARATION LOGIC
// ============================

interface PrepareEventResult {
  personId?: string;
  entityId?: string;
  personCreated?: boolean;
  entityCreated?: boolean;
}

async function prepareWebhookEvent(
  // deno-lint-ignore no-explicit-any
  serviceClient: any,
  eventId: string,
  entityTable: string,
  userId: string
): Promise<PrepareEventResult> {
  const result: PrepareEventResult = {};

  // Get webhook event details
  const { data: event, error: eventError } = await serviceClient
    .from("webhook_events")
    .select("payload, is_person, person_id, entity_id, user_id")
    .eq("id", eventId)
    .single();

  if (eventError || !event) {
    throw new Error(`Failed to fetch webhook event: ${eventError?.message || "Not found"}`);
  }

  const isPerson = event.is_person ?? true; // Default to person
  const effectiveUserId = event.user_id || userId;
  const payload = event.payload as Record<string, unknown>;
  const data = (payload.data || payload) as Record<string, unknown>;

  // Extract contact info from payload
  const email = (data.email as string) || null;
  const name = (data.name as string) || (data.company as string) || null;
  const phone = (data.phone as string) || null;

  if (!email && !name) {
    throw new Error("Payload must contain at least 'email' or 'name' in data");
  }

  if (isPerson && email) {
    // ============================
    // PERSON-BASED FLOW
    // ============================
    let personId = event.person_id;

    // Create Person if needed
    if (!personId) {
      const personResult = await findOrCreatePerson(serviceClient, email, name, effectiveUserId);
      if (personResult) {
        personId = personResult.id;
        result.personId = personId;
        result.personCreated = personResult.created;
      }
    } else {
      result.personId = personId;
    }

    // Create Entity and link to Person if we have a person
    if (personId) {
      const entityResult = await findOrCreateEntityForPerson(
        serviceClient, 
        personId, 
        entityTable, 
        effectiveUserId,
        { name, email, phone }
      );
      if (entityResult) {
        result.entityId = entityResult.id;
        result.entityCreated = entityResult.created;
      }
    }

    // Update webhook event with person_id and entity_id
    await serviceClient
      .from("webhook_events")
      .update({
        person_id: personId,
        entity_id: result.entityId,
        entity_table: entityTable,
      })
      .eq("id", eventId);

  } else {
    // ============================
    // NON-PERSON FLOW (create entity directly)
    // ============================
    const entityResult = await createEntity(
      serviceClient,
      entityTable,
      effectiveUserId,
      { name: name || email?.split('@')[0] || 'Unknown', email, phone }
    );
    
    if (entityResult) {
      result.entityId = entityResult.id;
      result.entityCreated = entityResult.created;
    }

    // Update webhook event with entity_id
    await serviceClient
      .from("webhook_events")
      .update({
        entity_id: result.entityId,
        entity_table: entityTable,
      })
      .eq("id", eventId);
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
  userId: string,
  contactInfo: { name?: string | null; email?: string | null; phone?: string | null }
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

    // Get person details if not provided
    let email = contactInfo.email;
    let name = contactInfo.name;
    let phone = contactInfo.phone;

    if (!email) {
      const { data: person } = await serviceClient
        .from("people")
        .select("name, email, phone")
        .eq("id", personId)
        .single();

      if (person) {
        email = person.email;
        name = name || person.name;
        phone = phone || person.phone;
      }
    }

    // Check if entity exists by email
    if (email) {
      const { data: existingEntity } = await serviceClient
        .from(entityTable)
        .select("id")
        .eq("email", email)
        .maybeSingle();

      if (existingEntity) {
        // Link person to existing entity
        await serviceClient
          .from("people_entities")
          .upsert({
            person_id: personId,
            entity_id: existingEntity.id,
            entity_table: entityTable,
          }, { onConflict: "person_id,entity_id,entity_table" });

        return { id: existingEntity.id, created: false };
      }
    }

    // Create new entity
    const { data: newEntity, error: createError } = await serviceClient
      .from(entityTable)
      .insert({
        name: name || email?.split('@')[0] || 'Unknown',
        email: email,
        phone: phone,
        created_by: userId,
      })
      .select("id")
      .single();

    if (createError || !newEntity) {
      console.error("Failed to create entity:", createError);
      return null;
    }

    // Link person to new entity
    await serviceClient
      .from("people_entities")
      .upsert({
        person_id: personId,
        entity_id: newEntity.id,
        entity_table: entityTable,
      }, { onConflict: "person_id,entity_id,entity_table" });

    return { id: newEntity.id, created: true };
  } catch (e) {
    console.error("Error in findOrCreateEntityForPerson:", e);
    return null;
  }
}

async function createEntity(
  // deno-lint-ignore no-explicit-any
  serviceClient: any,
  entityTable: string,
  userId: string,
  data: { name: string; email?: string | null; phone?: string | null }
): Promise<{ id: string; created: boolean } | null> {
  try {
    // Check if entity exists by email
    if (data.email) {
      const { data: existingEntity } = await serviceClient
        .from(entityTable)
        .select("id")
        .eq("email", data.email)
        .maybeSingle();

      if (existingEntity) {
        return { id: existingEntity.id, created: false };
      }
    }

    // Create new entity
    const { data: newEntity, error } = await serviceClient
      .from(entityTable)
      .insert({
        name: data.name,
        email: data.email,
        phone: data.phone,
        created_by: userId,
      })
      .select("id")
      .single();

    if (error || !newEntity) {
      console.error("Failed to create entity:", error);
      return null;
    }

    return { id: newEntity.id, created: true };
  } catch (e) {
    console.error("Error in createEntity:", e);
    return null;
  }
}
