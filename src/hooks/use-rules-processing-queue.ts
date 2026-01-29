import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "./use-toast";
import type { EntityTable } from "@/types/entity-automation";

export interface RulesProcessingQueueEmail {
  id: string;
  subject: string | null;
  body_preview: string | null;
  received_at: string;
  ai_confidence: number | null;
  entity_table: string | null;
  is_person: boolean | null;
  person_id: string | null;
  sender_id: string | null;
  sender_email: string | null;
  sender_name: string | null;
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

export function useRulesProcessingQueue() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch pending emails (classified but not processed)
  const {
    data: pendingEmails = [],
    isLoading: isLoadingEmails,
    refetch: refetchEmails,
  } = useQuery({
    queryKey: ["rules-processing-queue"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("email_messages")
        .select(`
          id,
          subject,
          body_preview,
          received_at,
          ai_confidence,
          entity_table,
          is_person,
          person_id,
          sender_id,
          sender_email,
          sender_name,
          person:people(id, name, email),
          sender:senders(id, email, display_name)
        `)
        .not("entity_table", "is", null)
        .eq("is_processed", false)
        .order("received_at", { ascending: false });

      if (error) throw error;
      return data as unknown as RulesProcessingQueueEmail[];
    },
    enabled: !!user,
  });

  // Update email entity type
  const updateEntityTypeMutation = useMutation({
    mutationFn: async ({ emailId, entityTable }: { emailId: string; entityTable: string }) => {
      const { error } = await supabase
        .from("email_messages")
        .update({ 
          entity_table: entityTable,
          ai_confidence: 1.0, // Manual override = 100% confidence
        })
        .eq("id", emailId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rules-processing-queue"] });
      toast({
        title: "Entity type updated",
        description: "Email entity type has been changed.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error updating entity type",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Process selected emails through entity rules
  const processEmailsMutation = useMutation({
    mutationFn: async (emailIds: string[]) => {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) throw new Error("Not authenticated");

      const results = {
        processed: 0,
        errors: [] as string[],
      };

      // Get email details for processing
      const { data: emails, error: fetchError } = await supabase
        .from("email_messages")
        .select("id, entity_table, microsoft_message_id")
        .in("id", emailIds);

      if (fetchError) throw fetchError;

      // Process each email
      for (const email of emails || []) {
        if (!email.entity_table) continue;

        try {
          const response = await supabase.functions.invoke("process-entity-rules", {
            body: {
              email_id: email.id,
              entity_table: email.entity_table,
              microsoft_message_id: email.microsoft_message_id,
            },
          });

          if (response.error) {
            results.errors.push(`Email ${email.id}: ${response.error.message}`);
          } else {
            results.processed++;
          }
        } catch (error) {
          results.errors.push(`Email ${email.id}: ${error instanceof Error ? error.message : "Unknown error"}`);
        }
      }

      return results;
    },
    onSuccess: (results) => {
      queryClient.invalidateQueries({ queryKey: ["rules-processing-queue"] });
      queryClient.invalidateQueries({ queryKey: ["pending-email-count"] });
      toast({
        title: "Processing complete",
        description: `${results.processed} email(s) processed. ${results.errors.length > 0 ? `${results.errors.length} error(s).` : ""}`,
      });
    },
    onError: (error) => {
      toast({
        title: "Error processing emails",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    pendingEmails,
    isLoadingEmails,
    refetchEmails,
    updateEntityType: updateEntityTypeMutation.mutate,
    isUpdatingEntityType: updateEntityTypeMutation.isPending,
    processEmails: processEmailsMutation.mutate,
    isProcessing: processEmailsMutation.isPending,
  };
}

// Hook to get pending count for sidebar badge
export function usePendingEmailCount() {
  const { user } = useAuth();

  const { data: count = 0 } = useQuery({
    queryKey: ["pending-email-count"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("email_messages")
        .select("*", { count: "exact", head: true })
        .not("entity_table", "is", null)
        .eq("is_processed", false);

      if (error) return 0;
      return count || 0;
    },
    enabled: !!user,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  return count;
}
