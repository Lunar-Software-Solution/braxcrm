import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface ClassificationQueueEmail {
  id: string;
  subject: string | null;
  body_preview: string | null;
  received_at: string;
  person_id: string | null;
  person?: {
    id: string;
    name: string;
    email: string;
  };
}

export function useClassificationProcessingQueue() {
  const { user } = useAuth();

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
          person:people(id, name, email)
        `)
        .is("entity_table", null)
        .order("received_at", { ascending: false });

      if (error) throw error;
      return data as unknown as ClassificationQueueEmail[];
    },
    enabled: !!user,
  });

  return {
    pendingEmails,
    isLoadingEmails,
    refetchEmails,
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
