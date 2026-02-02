import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface ExtractInvoiceRequest {
  email_id?: string;
  workspace_id?: string;
  entity_table?: string;
  entity_id?: string;
  file_id?: string;
}

interface InvoiceData {
  vendor_name: string | null;
  invoice_number: string | null;
  amount: number | null;
  currency: string;
  due_date: string | null;
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

    const { email_id, workspace_id }: ExtractInvoiceRequest = await req.json();

    if (!email_id || !workspace_id) {
      throw new Error("Missing required fields");
    }

    // Fetch the email details
    const { data: email, error: emailError } = await supabase
      .from("email_messages")
      .select("subject, body_preview, microsoft_message_id")
      .eq("id", email_id)
      .eq("workspace_id", workspace_id)
      .single();

    if (emailError || !email) {
      throw new Error("Email not found");
    }

    // Build prompt for invoice extraction
    const prompt = `You are an invoice data extraction assistant. Analyze the following email and extract invoice information if present.

Email Subject: ${email.subject || "(no subject)"}
Email Content: ${email.body_preview || "(no content)"}

Extract the following information if available:
- vendor_name: The company/vendor name sending the invoice
- invoice_number: The invoice number or reference
- amount: The total amount (numeric value only, no currency symbols)
- currency: The currency code (e.g., USD, EUR, GBP) - default to USD if unclear
- due_date: The payment due date in YYYY-MM-DD format

If this email does not appear to be an invoice or contain invoice information, set all values to null.

Respond with a JSON object containing these fields. Only respond with the JSON object, no other text.`;

    // Call Lovable AI Gateway
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "You are an invoice data extraction assistant. Always respond with valid JSON." },
          { role: "user", content: prompt },
        ],
        temperature: 0.2,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("AI Gateway error:", aiResponse.status, errorText);
      
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted" }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      throw new Error("AI extraction failed");
    }

    const aiData = await aiResponse.json();
    const aiContent = aiData.choices?.[0]?.message?.content;

    if (!aiContent) {
      throw new Error("No response from AI");
    }

    // Parse AI response
    let invoiceData: InvoiceData;
    try {
      const cleanContent = aiContent.replace(/```json\n?|\n?```/g, "").trim();
      invoiceData = JSON.parse(cleanContent);
    } catch (parseError) {
      console.error("Failed to parse AI response:", aiContent);
      throw new Error("Failed to parse invoice extraction response");
    }

    // Check if we got any meaningful data
    const hasData = invoiceData.vendor_name || invoiceData.invoice_number || invoiceData.amount;

    if (!hasData) {
      return new Response(JSON.stringify({
        success: true,
        message: "No invoice data found in email",
        data: null,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Store the extracted invoice
    const { data: invoice, error: insertError } = await supabase
      .from("extracted_invoices")
      .insert({
        workspace_id,
        email_id,
        vendor_name: invoiceData.vendor_name,
        invoice_number: invoiceData.invoice_number,
        amount: invoiceData.amount,
        currency: invoiceData.currency || "USD",
        due_date: invoiceData.due_date,
        raw_extraction: invoiceData,
        status: "pending",
      })
      .select()
      .single();

    if (insertError) {
      console.error("Error storing invoice:", insertError);
      throw new Error("Failed to store extracted invoice");
    }

    return new Response(JSON.stringify({
      success: true,
      data: invoice,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Extract invoice error:", message);
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: error instanceof Error && error.message === "Unauthorized" ? 401 : 500,
    });
  }
});
