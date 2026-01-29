import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "./use-toast";

export interface EmailMetadata {
  id: string;
  microsoft_message_id: string;
  category_id: string | null;
  ai_confidence: number | null;
  is_processed: boolean;
  category?: {
    id: string;
    name: string;
    color: string | null;
  } | null;
  tags?: {
    id: string;
    name: string;
    color: string | null;
  }[];
}

export function useEmailMetadata(microsoftMessageIds: string[]) {
  return useQuery({
    queryKey: ["email-metadata", microsoftMessageIds],
    queryFn: async () => {
      if (microsoftMessageIds.length === 0) return {};

      const { data, error } = await supabase
        .from("email_messages")
        .select(`
          id,
          microsoft_message_id,
          category_id,
          ai_confidence,
          is_processed,
          category:email_categories(id, name, color)
        `)
        .in("microsoft_message_id", microsoftMessageIds);

      if (error) throw error;

      // Create a map keyed by microsoft_message_id
      const metadataMap: Record<string, EmailMetadata> = {};
      for (const email of data || []) {
        metadataMap[email.microsoft_message_id] = email as unknown as EmailMetadata;
      }

      return metadataMap;
    },
    enabled: microsoftMessageIds.length > 0,
  });
}

export function useEmailTags(emailIds: string[]) {
  return useQuery({
    queryKey: ["email-tags", emailIds],
    queryFn: async () => {
      if (emailIds.length === 0) return {};

      const { data, error } = await supabase
        .from("email_message_tags")
        .select(`
          email_id,
          tag:email_tags(id, name, color)
        `)
        .in("email_id", emailIds);

      if (error) throw error;

      // Group tags by email_id
      const tagsMap: Record<string, { id: string; name: string; color: string | null }[]> = {};
      for (const row of data || []) {
        if (!tagsMap[row.email_id]) {
          tagsMap[row.email_id] = [];
        }
        if (row.tag) {
          tagsMap[row.email_id].push(row.tag as { id: string; name: string; color: string | null });
        }
      }

      return tagsMap;
    },
    enabled: emailIds.length > 0,
  });
}

export function useResetEmailProcessing() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (emailIds: string[]) => {
      const { error } = await supabase
        .from("email_messages")
        .update({ 
          is_processed: false,
          category_id: null,
          ai_confidence: null,
        })
        .in("id", emailIds);

      if (error) throw error;

      // Also remove tags that were applied by rules
      const { error: tagsError } = await supabase
        .from("email_message_tags")
        .delete()
        .in("email_id", emailIds);

      if (tagsError) throw tagsError;

      return emailIds.length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ["email-metadata"] });
      queryClient.invalidateQueries({ queryKey: ["email-tags"] });
      queryClient.invalidateQueries({ queryKey: ["review-queue"] });
      queryClient.invalidateQueries({ queryKey: ["pending-email-count"] });
      toast({
        title: "Processing reset",
        description: `Reset processing for ${count} email(s). They will be re-classified on next sync.`,
      });
    },
    onError: (error) => {
      toast({
        title: "Error resetting processing",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}
