import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { WebhookEvent, WebhookEventStatus } from "@/types/webhooks";
import { useToast } from "@/hooks/use-toast";

export function useWebhookEvents(status?: WebhookEventStatus) {
  const { data: events, isLoading, error, refetch } = useQuery({
    queryKey: ["webhook-events", status],
    queryFn: async () => {
      let query = supabase
        .from("webhook_events")
        .select(`
          *,
          endpoint:webhook_endpoints(id, name, slug),
          person:people(id, name, email)
        `)
        .order("created_at", { ascending: false });

      if (status) {
        query = query.eq("status", status);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as WebhookEvent[];
    },
  });

  return { events, isLoading, error, refetch };
}

export function usePendingWebhookCount() {
  const { data: count = 0 } = useQuery({
    queryKey: ["webhook-events-pending-count"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("webhook_events")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending");

      if (error) throw error;
      return count || 0;
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  return count;
}

export function useWebhookEventMutations() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const updateEvent = useMutation({
    mutationFn: async ({ id, entity_table, is_person, status }: { 
      id: string; 
      entity_table?: string; 
      is_person?: boolean; 
      status?: WebhookEventStatus;
    }) => {
      const updates: Record<string, unknown> = {};
      if (entity_table !== undefined) updates.entity_table = entity_table;
      if (is_person !== undefined) updates.is_person = is_person;
      if (status !== undefined) updates.status = status;

      const { data, error } = await supabase
        .from("webhook_events")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["webhook-events"] });
    },
    onError: (error) => {
      toast({ 
        title: "Failed to update event",
        description: error.message,
        variant: "destructive"
      });
    },
  });

  const prepareForRules = useMutation({
    mutationFn: async ({ eventIds, entityTable }: { eventIds: string[]; entityTable: string }) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const response = await supabase.functions.invoke("prepare-webhook-for-rules", {
        body: { event_ids: eventIds, entity_table: entityTable },
      });

      if (response.error) throw response.error;
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["webhook-events"] });
      queryClient.invalidateQueries({ queryKey: ["webhook-events-pending-count"] });
      toast({ 
        title: "Events prepared", 
        description: `${data.successful}/${data.total} events prepared for rules`
      });
    },
    onError: (error) => {
      toast({ 
        title: "Failed to prepare events", 
        description: error.message,
        variant: "destructive"
      });
    },
  });

  const processRules = useMutation({
    mutationFn: async ({ eventId, entityTable }: { eventId: string; entityTable: string }) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const response = await supabase.functions.invoke("process-webhook-rules", {
        body: { event_id: eventId, entity_table: entityTable },
      });

      if (response.error) throw response.error;
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["webhook-events"] });
      queryClient.invalidateQueries({ queryKey: ["webhook-events-pending-count"] });
      toast({ title: "Rules processed successfully" });
    },
    onError: (error) => {
      toast({ 
        title: "Failed to process rules", 
        description: error.message,
        variant: "destructive"
      });
    },
  });

  const deleteEvent = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("webhook_events")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["webhook-events"] });
      queryClient.invalidateQueries({ queryKey: ["webhook-events-pending-count"] });
      toast({ title: "Event deleted" });
    },
    onError: (error) => {
      toast({ 
        title: "Failed to delete event", 
        description: error.message,
        variant: "destructive"
      });
    },
  });

  return {
    updateEvent,
    prepareForRules,
    processRules,
    deleteEvent,
  };
}

export function useWebhookEventLogs(eventId: string) {
  const { data: logs, isLoading, error } = useQuery({
    queryKey: ["webhook-event-logs", eventId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("webhook_event_logs")
        .select("*")
        .eq("webhook_event_id", eventId)
        .order("processed_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!eventId,
  });

  return { logs, isLoading, error };
}
