import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-api-key",
};

interface IngestMessage {
  id: string;
  direction: "inbound" | "outbound";
  type: "text" | "image" | "audio" | "video" | "file" | "location";
  content: string;
  media_url?: string | null;
  sent_at: string;
}

interface IngestConversation {
  external_conversation_id: string;
  participant_identifier: string;
  participant_name?: string;
  messages: IngestMessage[];
}

interface IngestRequest {
  platform: "whatsapp" | "signal" | "telegram" | "wechat";
  connection_id: string;
  conversations: IngestConversation[];
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get API key from header
    const apiKey = req.headers.get("x-api-key");
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "Missing x-api-key header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse request body
    const body: IngestRequest = await req.json();
    const { platform, connection_id, conversations } = body;

    if (!platform || !connection_id || !conversations?.length) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: platform, connection_id, conversations" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate connection and get user_id
    const { data: connection, error: connError } = await supabase
      .from("messaging_connections")
      .select("id, user_id, is_active, api_secret")
      .eq("connection_id", connection_id)
      .eq("platform", platform)
      .single();

    if (connError || !connection) {
      return new Response(
        JSON.stringify({ error: "Invalid connection_id or platform" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate API secret
    if (connection.api_secret !== apiKey) {
      return new Response(
        JSON.stringify({ error: "Invalid API key" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!connection.is_active) {
      return new Response(
        JSON.stringify({ error: "Connection is inactive" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = connection.user_id;
    const results: { conversation_id: string; messages_added: number; status: string }[] = [];

    for (const conv of conversations) {
      const { external_conversation_id, participant_identifier, participant_name, messages } = conv;

      // Try to find existing conversation
      const { data: existingConv } = await supabase
        .from("chat_conversations")
        .select("id, messages, participant_name, person_id")
        .eq("external_conversation_id", external_conversation_id)
        .eq("platform", platform)
        .eq("user_id", userId)
        .single();

      // Try to match person by phone number
      let personId: string | null = null;
      if (participant_identifier) {
        // Normalize phone number for matching
        const normalizedPhone = participant_identifier.replace(/[^0-9+]/g, "");
        const { data: matchedPerson } = await supabase
          .from("people")
          .select("id")
          .or(`phone.eq.${normalizedPhone},phone.ilike.%${normalizedPhone.slice(-10)}%`)
          .limit(1)
          .single();
        
        if (matchedPerson) {
          personId = matchedPerson.id;
        }
      }

      if (existingConv) {
        // Append new messages to existing conversation
        const existingMessages: IngestMessage[] = existingConv.messages || [];
        const existingIds = new Set(existingMessages.map((m) => m.id));
        
        // Filter out duplicates
        const newMessages = messages.filter((m) => !existingIds.has(m.id));
        
        if (newMessages.length > 0) {
          const allMessages = [...existingMessages, ...newMessages].sort(
            (a, b) => new Date(a.sent_at).getTime() - new Date(b.sent_at).getTime()
          );

          const lastMessage = allMessages[allMessages.length - 1];

          const { error: updateError } = await supabase
            .from("chat_conversations")
            .update({
              messages: allMessages,
              message_count: allMessages.length,
              last_message_at: lastMessage.sent_at,
              last_message_preview: lastMessage.content?.slice(0, 100) || null,
              participant_name: participant_name || existingConv.participant_name,
              person_id: personId || existingConv.person_id,
            })
            .eq("id", existingConv.id);

          if (updateError) {
            results.push({
              conversation_id: external_conversation_id,
              messages_added: 0,
              status: `error: ${updateError.message}`,
            });
          } else {
            results.push({
              conversation_id: external_conversation_id,
              messages_added: newMessages.length,
              status: "updated",
            });
          }
        } else {
          results.push({
            conversation_id: external_conversation_id,
            messages_added: 0,
            status: "no_new_messages",
          });
        }
      } else {
        // Create new conversation
        const sortedMessages = messages.sort(
          (a, b) => new Date(a.sent_at).getTime() - new Date(b.sent_at).getTime()
        );
        const lastMessage = sortedMessages[sortedMessages.length - 1];

        const { error: insertError } = await supabase
          .from("chat_conversations")
          .insert({
            platform,
            external_conversation_id,
            person_id: personId,
            participant_identifier,
            participant_name: participant_name || null,
            messages: sortedMessages,
            message_count: sortedMessages.length,
            last_message_at: lastMessage?.sent_at || null,
            last_message_preview: lastMessage?.content?.slice(0, 100) || null,
            user_id: userId,
          });

        if (insertError) {
          results.push({
            conversation_id: external_conversation_id,
            messages_added: 0,
            status: `error: ${insertError.message}`,
          });
        } else {
          results.push({
            conversation_id: external_conversation_id,
            messages_added: messages.length,
            status: "created",
          });
        }
      }
    }

    // Update last_synced_at on connection
    await supabase
      .from("messaging_connections")
      .update({ last_synced_at: new Date().toISOString() })
      .eq("id", connection.id);

    return new Response(
      JSON.stringify({
        success: true,
        processed: results.length,
        results,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Messaging ingest error:", error);
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
