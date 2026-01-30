import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "./use-toast";

export interface ClassificationQueueEmail {
  id: string;
  subject: string | null;
  body_preview: string | null;
  received_at: string;
  person_id: string | null;
  sender_id: string | null;
  microsoft_message_id: string;
  sender_email: string | null;
  sender_name: string | null;
  is_person: boolean | null;
  ai_confidence: number | null;
  person?: {
    id: string;
    name: string;
    email: string;
  };
  sender?: {
    id: string;
    email: string;
    display_name: string | null;
  };
}

export function useClassificationProcessingQueue() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch emails awaiting classification (entity_table IS NULL)
  const {
    data: pendingEmails = [],
    isLoading: isLoadingEmails,
    refetch: refetchEmails,
  } = useQuery({
    queryKey: ["classification-processing-queue"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("email_messages")
        .select(`
          id,
          subject,
          body_preview,
          received_at,
          person_id,
          sender_id,
          sender_email,
          sender_name,
          microsoft_message_id,
          is_person,
          ai_confidence,
          person:people(id, name, email),
          sender:senders(id, email, display_name)
        `)
        .is("entity_table", null)
        .order("received_at", { ascending: false });

      if (error) throw error;
      return data as unknown as ClassificationQueueEmail[];
    },
    enabled: !!user,
  });

  // Update is_person for an email
  const updateIsPersonMutation = useMutation({
    mutationFn: async ({ emailId, isPerson }: { emailId: string; isPerson: boolean | null }) => {
      const { error } = await supabase
        .from("email_messages")
        .update({ is_person: isPerson })
        .eq("id", emailId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["classification-processing-queue"] });
      toast({
        title: "Sender type updated",
        description: "The sender type has been changed.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error updating sender type",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Send emails to rules processing queue by setting entity_table
  const sendToRulesMutation = useMutation({
    mutationFn: async ({ emailIds, entityTable }: { emailIds: string[]; entityTable: string }) => {
      const { error } = await supabase
        .from("email_messages")
        .update({ entity_table: entityTable })
        .in("id", emailIds);

      if (error) throw error;
      return emailIds.length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ["classification-processing-queue"] });
      queryClient.invalidateQueries({ queryKey: ["rules-processing-queue"] });
      queryClient.invalidateQueries({ queryKey: ["pending-classification-count"] });
      queryClient.invalidateQueries({ queryKey: ["pending-email-count"] });
      toast({
        title: "Sent to rules processing",
        description: `${count} email(s) queued for rule processing.`,
      });
    },
    onError: (error) => {
      toast({
        title: "Error sending to rules",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Remove from rules processing queue by clearing entity_table
  const removeFromRulesMutation = useMutation({
    mutationFn: async (emailId: string) => {
      const { error } = await supabase
        .from("email_messages")
        .update({ entity_table: null })
        .eq("id", emailId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["classification-processing-queue"] });
      queryClient.invalidateQueries({ queryKey: ["rules-processing-queue"] });
      queryClient.invalidateQueries({ queryKey: ["pending-classification-count"] });
      queryClient.invalidateQueries({ queryKey: ["pending-email-count"] });
      toast({
        title: "Removed from rules queue",
        description: "Email moved back to classification queue.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error removing from rules",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Classify selected emails
  const classifyEmailsMutation = useMutation({
    mutationFn: async (emailIds: string[]) => {
      const results = {
        classified: 0,
        errors: [] as string[],
      };

      // Get email details for classification
      const { data: emails, error: fetchError } = await supabase
        .from("email_messages")
        .select("id, microsoft_message_id, subject, body_preview, person:people(name, email)")
        .in("id", emailIds);

      if (fetchError) throw fetchError;

      // Classify each email
      for (const email of emails || []) {
        try {
          const response = await supabase.functions.invoke("classify-email", {
            body: {
              email_id: email.id,
              microsoft_message_id: email.microsoft_message_id,
              subject: email.subject,
              body_preview: email.body_preview,
              sender_email: email.person?.email,
              sender_name: email.person?.name,
            },
          });

          if (response.error) {
            results.errors.push(`${email.subject || email.id}: ${response.error.message}`);
          } else {
            results.classified++;
          }
        } catch (error) {
          results.errors.push(`${email.subject || email.id}: ${error instanceof Error ? error.message : "Unknown error"}`);
        }
      }

      return results;
    },
    onSuccess: (results) => {
      queryClient.invalidateQueries({ queryKey: ["classification-processing-queue"] });
      queryClient.invalidateQueries({ queryKey: ["pending-classification-count"] });
      queryClient.invalidateQueries({ queryKey: ["rules-processing-queue"] });
      queryClient.invalidateQueries({ queryKey: ["pending-email-count"] });
      toast({
        title: "Classification complete",
        description: `${results.classified} email(s) classified. ${results.errors.length > 0 ? `${results.errors.length} error(s).` : ""}`,
      });
    },
    onError: (error) => {
      toast({
        title: "Error classifying emails",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    pendingEmails,
    isLoadingEmails,
    refetchEmails,
    classifyEmails: classifyEmailsMutation.mutate,
    isClassifying: classifyEmailsMutation.isPending,
    updateIsPerson: updateIsPersonMutation.mutate,
    isUpdatingIsPerson: updateIsPersonMutation.isPending,
    sendToRules: sendToRulesMutation.mutate,
    isSendingToRules: sendToRulesMutation.isPending,
    removeFromRules: removeFromRulesMutation.mutate,
    isRemovingFromRules: removeFromRulesMutation.isPending,
  };
}

// Hook to get pending classification count for sidebar badge
export function usePendingClassificationCount() {
  const { user } = useAuth();

  const { data: count = 0 } = useQuery({
    queryKey: ["pending-classification-count"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("email_messages")
        .select("*", { count: "exact", head: true })
        .is("entity_table", null);

      if (error) return 0;
      return count || 0;
    },
    enabled: !!user,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  return count;
}
