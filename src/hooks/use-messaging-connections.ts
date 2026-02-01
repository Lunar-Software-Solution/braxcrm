import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { MessagingConnection, MessagingPlatform } from "@/types/messaging";

// Fetch all messaging connections for current user
export function useMessagingConnections() {
  return useQuery({
    queryKey: ["messaging-connections"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("messaging_connections")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as MessagingConnection[];
    },
  });
}

// Create a new messaging connection
export function useCreateMessagingConnection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (connection: {
      platform: MessagingPlatform;
      connection_id: string;
      phone_number?: string;
      username?: string;
      display_name?: string;
      api_secret: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("messaging_connections")
        .insert({
          ...connection,
          user_id: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data as MessagingConnection;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["messaging-connections"] });
    },
  });
}

// Update messaging connection
export function useUpdateMessagingConnection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string;
      updates: Partial<{
        phone_number: string;
        username: string;
        display_name: string;
        is_active: boolean;
        api_secret: string;
      }>;
    }) => {
      const { data, error } = await supabase
        .from("messaging_connections")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data as MessagingConnection;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["messaging-connections"] });
    },
  });
}

// Delete messaging connection
export function useDeleteMessagingConnection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("messaging_connections")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["messaging-connections"] });
    },
  });
}

// Generate a random API secret
export function generateApiSecret(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = 'msg_';
  for (let i = 0; i < 32; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}
