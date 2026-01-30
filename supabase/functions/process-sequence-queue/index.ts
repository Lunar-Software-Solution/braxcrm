import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log("Processing sequence queue...");

    // Get active enrollments that are due
    const now = new Date().toISOString();
    const { data: dueEnrollments, error: fetchError } = await supabase
      .from("sequence_enrollments")
      .select(`
        *,
        sequence:email_sequences(
          id,
          name,
          is_active,
          created_by
        )
      `)
      .eq("status", "active")
      .lte("next_send_at", now)
      .limit(50);

    if (fetchError) {
      console.error("Error fetching enrollments:", fetchError);
      throw fetchError;
    }

    if (!dueEnrollments || dueEnrollments.length === 0) {
      console.log("No enrollments due for processing");
      return new Response(
        JSON.stringify({ processed: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Found ${dueEnrollments.length} enrollments to process`);

    let processedCount = 0;

    for (const enrollment of dueEnrollments) {
      try {
        // Skip if sequence is not active
        if (!enrollment.sequence?.is_active) {
          console.log(`Skipping enrollment ${enrollment.id} - sequence inactive`);
          continue;
        }

        // Get current step
        const { data: currentStep, error: stepError } = await supabase
          .from("sequence_steps")
          .select(`
            *,
            template:email_templates(*)
          `)
          .eq("sequence_id", enrollment.sequence_id)
          .eq("step_order", enrollment.current_step)
          .eq("is_active", true)
          .single();

        if (stepError || !currentStep) {
          console.log(`No active step found for enrollment ${enrollment.id}, step ${enrollment.current_step}`);
          // Mark as completed if no more steps
          await supabase
            .from("sequence_enrollments")
            .update({
              status: "completed",
              completed_at: new Date().toISOString(),
            })
            .eq("id", enrollment.id);
          continue;
        }

        // Send the email
        const sendResponse = await fetch(`${supabaseUrl}/functions/v1/send-automated-email`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")}`,
          },
          body: JSON.stringify({
            templateId: currentStep.template_id,
            contactType: enrollment.contact_type,
            contactId: enrollment.contact_id,
            contactEmail: enrollment.contact_email,
            automationType: "sequence",
            automationId: enrollment.sequence_id,
            enrollmentId: enrollment.id,
          }),
        });

        if (!sendResponse.ok) {
          console.error(`Failed to send email for enrollment ${enrollment.id}`);
          // Update enrollment with failure status if multiple failures
          continue;
        }

        // Get next step
        const { data: nextStep } = await supabase
          .from("sequence_steps")
          .select("step_order, delay_days, delay_hours")
          .eq("sequence_id", enrollment.sequence_id)
          .gt("step_order", enrollment.current_step)
          .eq("is_active", true)
          .order("step_order", { ascending: true })
          .limit(1)
          .single();

        if (nextStep) {
          // Calculate next send time
          const nextSendAt = new Date();
          nextSendAt.setDate(nextSendAt.getDate() + (nextStep.delay_days || 0));
          nextSendAt.setHours(nextSendAt.getHours() + (nextStep.delay_hours || 0));

          await supabase
            .from("sequence_enrollments")
            .update({
              current_step: nextStep.step_order,
              next_send_at: nextSendAt.toISOString(),
            })
            .eq("id", enrollment.id);
        } else {
          // No more steps, mark as completed
          await supabase
            .from("sequence_enrollments")
            .update({
              status: "completed",
              completed_at: new Date().toISOString(),
              next_send_at: null,
            })
            .eq("id", enrollment.id);
        }

        processedCount++;
      } catch (enrollmentError) {
        console.error(`Error processing enrollment ${enrollment.id}:`, enrollmentError);
      }
    }

    console.log(`Processed ${processedCount} enrollments`);

    return new Response(
      JSON.stringify({ processed: processedCount }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in process-sequence-queue:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
