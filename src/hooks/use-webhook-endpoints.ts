import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { WebhookEndpoint } from "@/types/webhooks";
import { useToast } from "@/hooks/use-toast";

export function useWebhookEndpoints() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: endpoints, isLoading, error } = useQuery({
    queryKey: ["webhook-endpoints"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("webhook_endpoints")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as WebhookEndpoint[];
    },
  });

  const createEndpoint = useMutation({
    mutationFn: async (endpoint: Omit<WebhookEndpoint, "id" | "created_at" | "updated_at" | "created_by">) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Generate a random secret key
      const secretKey = crypto.randomUUID() + crypto.randomUUID();

      const { data, error } = await supabase
        .from("webhook_endpoints")
        .insert({
          ...endpoint,
          secret_key: secretKey,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data as WebhookEndpoint;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["webhook-endpoints"] });
      toast({ title: "Endpoint created successfully" });
    },
    onError: (error) => {
      toast({ 
        title: "Failed to create endpoint", 
        description: error.message,
        variant: "destructive"
      });
    },
  });

  const updateEndpoint = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<WebhookEndpoint> & { id: string }) => {
      const { data, error } = await supabase
        .from("webhook_endpoints")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data as WebhookEndpoint;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["webhook-endpoints"] });
      toast({ title: "Endpoint updated successfully" });
    },
    onError: (error) => {
      toast({ 
        title: "Failed to update endpoint", 
        description: error.message,
        variant: "destructive"
      });
    },
  });

  const deleteEndpoint = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("webhook_endpoints")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["webhook-endpoints"] });
      toast({ title: "Endpoint deleted successfully" });
    },
    onError: (error) => {
      toast({ 
        title: "Failed to delete endpoint", 
        description: error.message,
        variant: "destructive"
      });
    },
  });

  const rotateSecret = useMutation({
    mutationFn: async (id: string) => {
      const newSecret = crypto.randomUUID() + crypto.randomUUID();
      
      const { data, error } = await supabase
        .from("webhook_endpoints")
        .update({ secret_key: newSecret })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data as WebhookEndpoint;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["webhook-endpoints"] });
      toast({ title: "Secret key rotated successfully" });
    },
    onError: (error) => {
      toast({ 
        title: "Failed to rotate secret", 
        description: error.message,
        variant: "destructive"
      });
    },
  });

  return {
    endpoints,
    isLoading,
    error,
    createEndpoint,
    updateEndpoint,
    deleteEndpoint,
    rotateSecret,
  };
}
