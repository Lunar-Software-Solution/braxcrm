import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface WebflowSubmission {
  _id?: string;
  id?: string;
  submittedAt?: string;
  dateSubmitted?: string;
  displayData?: Record<string, string>;
  formResponse?: Record<string, string>;
  [key: string]: unknown;
}

interface WebflowFormResponse {
  formSubmissions: WebflowSubmission[];
  pagination: {
    limit: number;
    offset: number;
    total: number;
  };
}

interface SyncConfig {
  id: string;
  site_id: string;
  form_id: string | null;
  form_name: string | null;
  endpoint_id: string | null;
  last_synced_at: string | null;
  is_active: boolean;
  created_by: string;
}

// Get API token for a site from database
async function getApiTokenForSite(
  serviceClient: any,
  siteId: string
): Promise<string | null> {
  const { data } = await serviceClient
    .from("webflow_tokens")
    .select("api_token")
    .eq("site_id", siteId)
    .single();
  
  return data?.api_token || null;
}

// Fetch form submissions from Webflow API
async function fetchFormSubmissions(
  siteId: string,
  formId: string,
  apiToken: string,
  sinceDate?: string
): Promise<WebflowSubmission[]> {
  const submissions: WebflowSubmission[] = [];
  let offset = 0;
  const limit = 100;
  let hasMore = true;

  console.log(`Fetching submissions for site ${siteId}, form ${formId}, sinceDate: ${sinceDate || 'none (fetching all)'}`);

  while (hasMore) {
    // IMPORTANT: The v2 API requires site_id in the path
    const url = new URL(`https://api.webflow.com/v2/sites/${siteId}/forms/${formId}/submissions`);
    url.searchParams.set("limit", String(limit));
    url.searchParams.set("offset", String(offset));

    console.log(`Fetching: ${url.toString()}`);

    const response = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${apiToken}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const error = await response.text();
      console.error(`Webflow API error for form ${formId}:`, error);
      throw new Error(`Webflow API error: ${response.status} - ${error}`);
    }

    const data = await response.json();
    console.log(`Webflow API response: ${JSON.stringify(data, null, 2)}`);
    
    // The API returns "formSubmissions" array
    const rawSubmissions = data.formSubmissions || [];
    console.log(`Raw submissions count: ${rawSubmissions.length}, pagination: ${JSON.stringify(data.pagination)}`);
    
    // Filter by date if sinceDate is provided - use dateSubmitted field
    const filtered = sinceDate
      ? rawSubmissions.filter((s: WebflowSubmission) => {
          const submittedDate = s.dateSubmitted || s.submittedAt;
          return submittedDate && new Date(submittedDate as string) > new Date(sinceDate);
        })
      : rawSubmissions;
    
    console.log(`After date filter: ${filtered.length} submissions`);
    submissions.push(...filtered);

    // Check if we need to fetch more
    const totalFromApi = data.pagination?.total || 0;
    if (rawSubmissions.length < limit || offset + limit >= totalFromApi) {
      hasMore = false;
    } else {
      offset += limit;
    }

    // Rate limit protection: 60 requests per minute
    if (hasMore) {
      await new Promise((r) => setTimeout(r, 100));
    }
  }

  console.log(`Total submissions fetched: ${submissions.length}`);
  return submissions;
}

// Fetch all forms for a site
async function fetchSiteForms(
  siteId: string,
  apiToken: string
): Promise<Array<{ id: string; displayName: string }>> {
  const response = await fetch(`https://api.webflow.com/v2/sites/${siteId}/forms`, {
    headers: {
      Authorization: `Bearer ${apiToken}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const error = await response.text();
    console.error(`Webflow API error fetching forms:`, error);
    throw new Error(`Webflow API error: ${response.status}`);
  }

  const data = await response.json();
  return data.forms || [];
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Parse request body for manual trigger options
    let body: { config_id?: string; manual?: boolean } = {};
    try {
      body = await req.json();
    } catch {
      // Empty body is fine for cron calls
    }

    // Fetch active sync configurations
    let query = serviceClient
      .from("webflow_sync_config")
      .select("*")
      .eq("is_active", true);
    
    if (body.config_id) {
      query = query.eq("id", body.config_id);
    }

    const { data: configs, error: configError } = await query;

    if (configError) {
      console.error("Error fetching sync configs:", configError);
      throw new Error("Failed to fetch sync configurations");
    }

    if (!configs || configs.length === 0) {
      console.log("No active Webflow sync configurations found");
      return new Response(
        JSON.stringify({ success: true, message: "No active configurations" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const results: Array<{
      config_id: string;
      submissions_imported: number;
      errors: string[];
    }> = [];

    for (const config of configs as SyncConfig[]) {
      const configResult = {
        config_id: config.id,
        submissions_imported: 0,
        errors: [] as string[],
      };

      try {
        // Get API token for this site
        const apiToken = await getApiTokenForSite(serviceClient, config.site_id);
        if (!apiToken) {
          console.error(`No API token found for site ${config.site_id}`);
          configResult.errors.push(`No API token configured for site ${config.site_id}`);
          results.push(configResult);
          continue;
        }

        let formIds: string[] = [];
        
        if (config.form_id) {
          // Specific form configured
          formIds = [config.form_id];
        } else {
          // Fetch all forms for the site
          const forms = await fetchSiteForms(config.site_id, apiToken);
          formIds = forms.map((f) => f.id);
        }

        for (const formId of formIds) {
          try {
            const submissions = await fetchFormSubmissions(
              config.site_id,
              formId,
              apiToken,
              config.last_synced_at ?? undefined
            );

            console.log(`Found ${submissions.length} new submissions for form ${formId}`);

            for (const submission of submissions) {
              // Use 'id' or '_id' depending on API version
              const submissionId = submission.id || submission._id;
              if (!submissionId) {
                console.log('Skipping submission without ID');
                continue;
              }

              // Check for duplicates using external_id
              const { data: existing } = await serviceClient
                .from("webhook_events")
                .select("id")
                .eq("external_id", submissionId)
                .maybeSingle();

              if (existing) {
                console.log(`Skipping duplicate submission: ${submissionId}`);
                continue;
              }

              // Use formResponse or displayData depending on API version
              const formData = submission.formResponse || submission.displayData || {};
              const submittedAt = submission.dateSubmitted || submission.submittedAt;

              // Transform submission to webhook event format
              const payload = {
                external_id: submissionId,
                event_type: "webflow.form_submission",
                source: "webflow",
                data: {
                  ...formData,
                  _webflow_form_id: formId,
                  _webflow_site_id: config.site_id,
                  _submitted_at: submittedAt,
                },
              };

              // Get endpoint info for entity_table default
              let entityTable = null;
              if (config.endpoint_id) {
                const { data: endpoint } = await serviceClient
                  .from("webhook_endpoints")
                  .select("default_entity_table")
                  .eq("id", config.endpoint_id)
                  .single();
                entityTable = endpoint?.default_entity_table || null;
              }

              // Insert webhook event
              const { error: insertError } = await serviceClient
                .from("webhook_events")
                .insert({
                  endpoint_id: config.endpoint_id,
                  external_id: submissionId,
                  event_type: "webflow.form_submission",
                  payload: payload,
                  status: "pending",
                  entity_table: entityTable,
                  user_id: config.created_by,
                });

              if (insertError) {
                console.error(`Error inserting submission ${submissionId}:`, insertError);
                configResult.errors.push(`Failed to insert ${submissionId}`);
              } else {
                configResult.submissions_imported++;
              }
            }
          } catch (formError) {
            const msg = formError instanceof Error ? formError.message : "Unknown error";
            console.error(`Error processing form ${formId}:`, msg);
            configResult.errors.push(`Form ${formId}: ${msg}`);
          }
        }

        // Update last_synced_at
        await serviceClient
          .from("webflow_sync_config")
          .update({ last_synced_at: new Date().toISOString() })
          .eq("id", config.id);

      } catch (configErr) {
        const msg = configErr instanceof Error ? configErr.message : "Unknown error";
        console.error(`Error processing config ${config.id}:`, msg);
        configResult.errors.push(msg);
      }

      results.push(configResult);
    }

    const totalImported = results.reduce((sum, r) => sum + r.submissions_imported, 0);
    console.log(`Webflow sync complete. Total imported: ${totalImported}`);

    return new Response(
      JSON.stringify({
        success: true,
        total_imported: totalImported,
        results,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Webflow sync error:", message);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
