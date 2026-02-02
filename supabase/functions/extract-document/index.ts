import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface ExtractDocumentRequest {
  file_id: string;
  entity_table?: string;
  entity_id?: string;
  document_type?: string;
}

const DOCUMENT_PROMPTS: Record<string, string> = {
  invoice: `Extract invoice information:
- vendor_name: Company name on the invoice
- invoice_number: Invoice/reference number
- amount: Total amount (numeric only)
- currency: Currency code (USD, EUR, etc.)
- due_date: Payment due date (YYYY-MM-DD)
- line_items: Array of {description, quantity, unit_price}`,

  contract: `Extract contract information:
- title: Contract title/name
- parties: Array of party names involved
- effective_date: Start date (YYYY-MM-DD)
- expiration_date: End date (YYYY-MM-DD)
- key_terms: Array of key terms/clauses
- renewal_type: auto/manual/none`,

  receipt: `Extract receipt information:
- vendor_name: Store/vendor name
- amount: Total amount (numeric only)
- currency: Currency code
- date: Transaction date (YYYY-MM-DD)
- payment_method: cash/card/other
- category: expense category`,

  purchase_order: `Extract purchase order information:
- po_number: PO number
- vendor_name: Vendor name
- order_date: Order date (YYYY-MM-DD)
- delivery_date: Expected delivery (YYYY-MM-DD)
- items: Array of {sku, description, quantity, unit_price}
- total: Total amount`,

  statement: `Extract statement information:
- account_name: Account holder name
- account_number: Account number (masked if needed)
- statement_date: Statement date (YYYY-MM-DD)
- period_start: Period start (YYYY-MM-DD)
- period_end: Period end (YYYY-MM-DD)
- opening_balance: Opening balance
- closing_balance: Closing balance`,
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
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Validate user
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      throw new Error("Unauthorized");
    }

    const { file_id, entity_table, entity_id, document_type }: ExtractDocumentRequest = await req.json();

    if (!file_id) {
      throw new Error("Missing file_id");
    }

    // Fetch the file metadata
    const { data: file, error: fileError } = await supabase
      .from("entity_files")
      .select("*")
      .eq("id", file_id)
      .single();

    if (fileError || !file) {
      throw new Error("File not found");
    }

    // Download file content from storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from("entity-files")
      .download(file.file_path);

    if (downloadError || !fileData) {
      console.error("Download error:", downloadError);
      throw new Error("Failed to download file");
    }

    // Convert file to text (for PDFs, we'd need PDF parsing - for now just handle text files)
    let fileContent = "";
    const mimeType = file.mime_type.toLowerCase();
    
    if (mimeType.includes("text") || mimeType.includes("json")) {
      fileContent = await fileData.text();
    } else {
      // For binary files (PDFs, images), we'll use the filename and any available metadata
      fileContent = `[Document: ${file.file_name}, Type: ${file.mime_type}, Size: ${file.file_size} bytes]`;
    }

    // Determine document type if not provided
    let detectedType = document_type;
    
    if (!detectedType) {
      // Use AI to classify the document
      const classifyPrompt = `Classify this document into one of these categories: invoice, contract, receipt, purchase_order, statement, other.
      
Document name: ${file.file_name}
Content preview: ${fileContent.substring(0, 1000)}

Respond with just the category name.`;

      const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
      if (!LOVABLE_API_KEY) {
        throw new Error("LOVABLE_API_KEY is not configured");
      }

      const classifyResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "user", content: classifyPrompt },
          ],
          temperature: 0.1,
        }),
      });

      if (classifyResponse.ok) {
        const classifyData = await classifyResponse.json();
        const category = classifyData.choices?.[0]?.message?.content?.trim()?.toLowerCase();
        if (category && ["invoice", "contract", "receipt", "purchase_order", "statement"].includes(category)) {
          detectedType = category;
        }
      }
      
      detectedType = detectedType || "other";
    }

    // Build extraction prompt
    const extractionInstructions = DOCUMENT_PROMPTS[detectedType] || "Extract any relevant structured data from this document.";
    
    const extractPrompt = `You are a document data extraction assistant. Analyze the following document and extract structured information.

Document name: ${file.file_name}
Document content:
${fileContent.substring(0, 8000)}

${extractionInstructions}

Respond with a JSON object containing the extracted fields. Use null for fields that cannot be determined.`;

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
          { role: "system", content: "You are a document data extraction assistant. Always respond with valid JSON." },
          { role: "user", content: extractPrompt },
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
    let extractedData: Record<string, unknown>;
    try {
      const cleanContent = aiContent.replace(/```json\n?|\n?```/g, "").trim();
      extractedData = JSON.parse(cleanContent);
    } catch (parseError) {
      console.error("Failed to parse AI response:", aiContent);
      extractedData = { raw_response: aiContent };
    }

    // Get title from extracted data or filename
    const title = (extractedData.title as string) || 
                  (extractedData.invoice_number as string) ||
                  (extractedData.po_number as string) ||
                  file.file_name;

    // Store the extracted document
    const { data: document, error: insertError } = await supabase
      .from("extracted_documents")
      .insert({
        entity_table: entity_table || file.entity_table,
        entity_id: entity_id || file.entity_id,
        source_file_id: file_id,
        document_type: detectedType,
        title,
        extracted_data: extractedData,
        confidence: 0.8, // Could be refined based on AI confidence
        status: "pending",
        created_by: user.id,
      })
      .select()
      .single();

    if (insertError) {
      console.error("Error storing document:", insertError);
      throw new Error("Failed to store extracted document");
    }

    return new Response(JSON.stringify({
      success: true,
      data: document,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Extract document error:", message);
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: error instanceof Error && error.message === "Unauthorized" ? 401 : 500,
    });
  }
});
