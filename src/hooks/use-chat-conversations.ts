import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { ChatConversation, MessagingPlatform, ChatMessage } from "@/types/messaging";

// Fetch all conversations for current user
export function useChatConversations(options?: {
  platform?: MessagingPlatform;
  personId?: string;
}) {
  return useQuery({
    queryKey: ["chat-conversations", options?.platform, options?.personId],
    queryFn: async () => {
      let query = supabase
        .from("chat_conversations")
        .select(`
          *,
          person:people(id, name, email, avatar_url)
        `)
        .order("last_message_at", { ascending: false, nullsFirst: false });

      if (options?.platform) {
        query = query.eq("platform", options.platform);
      }

      if (options?.personId) {
        query = query.eq("person_id", options.personId);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Transform the data to match our type
      return (data || []).map((conv) => ({
        ...conv,
        messages: (conv.messages as unknown as ChatMessage[]) || [],
        person: conv.person || undefined,
      })) as ChatConversation[];
    },
  });
}

// Fetch single conversation by ID
export function useChatConversation(conversationId: string | null) {
  return useQuery({
    queryKey: ["chat-conversation", conversationId],
    queryFn: async () => {
      if (!conversationId) return null;

      const { data, error } = await supabase
        .from("chat_conversations")
        .select(`
          *,
          person:people(id, name, email, avatar_url)
        `)
        .eq("id", conversationId)
        .single();

      if (error) throw error;

      return {
        ...data,
        messages: (data.messages as unknown as ChatMessage[]) || [],
        person: data.person || undefined,
      } as ChatConversation;
    },
    enabled: !!conversationId,
  });
}

// Link conversation to a person
export function useLinkConversationToPerson() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      conversationId,
      personId,
    }: {
      conversationId: string;
      personId: string;
    }) => {
      const { error } = await supabase
        .from("chat_conversations")
        .update({ person_id: personId })
        .eq("id", conversationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chat-conversations"] });
      queryClient.invalidateQueries({ queryKey: ["chat-conversation"] });
    },
  });
}

// Unlink conversation from person
export function useUnlinkConversationFromPerson() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (conversationId: string) => {
      const { error } = await supabase
        .from("chat_conversations")
        .update({ person_id: null })
        .eq("id", conversationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chat-conversations"] });
      queryClient.invalidateQueries({ queryKey: ["chat-conversation"] });
    },
  });
}

// Delete conversation
export function useDeleteConversation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (conversationId: string) => {
      const { error } = await supabase
        .from("chat_conversations")
        .delete()
        .eq("id", conversationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chat-conversations"] });
    },
  });
}
