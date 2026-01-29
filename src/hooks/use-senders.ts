import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Sender, SenderType } from "@/types/senders";
import { useAuth } from "@/contexts/AuthContext";

interface CreateSenderData {
  email: string;
  display_name?: string | null;
  sender_type: SenderType;
  entity_table?: string | null;
  entity_id?: string | null;
  domain?: string | null;
  is_auto_created?: boolean;
}

interface UpdateSenderData {
  display_name?: string | null;
  sender_type?: SenderType;
  entity_table?: string | null;
  entity_id?: string | null;
}

export function useSenders() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const listQuery = useQuery({
    queryKey: ["senders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("senders")
        .select("*")
        .order("email");
      if (error) throw error;
      return data as unknown as Sender[];
    },
    enabled: !!user,
  });

  const createMutation = useMutation({
    mutationFn: async (data: CreateSenderData) => {
      const { data: result, error } = await supabase
        .from("senders")
        .insert({
          ...data,
          created_by: user!.id,
        })
        .select()
        .single();
      if (error) throw error;
      return result as unknown as Sender;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["senders"] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateSenderData }) => {
      const { data: result, error } = await supabase
        .from("senders")
        .update(data)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return result as unknown as Sender;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["senders"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("senders").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["senders"] });
    },
  });

  return {
    senders: listQuery.data ?? [],
    isLoading: listQuery.isLoading,
    error: listQuery.error,
    create: createMutation.mutateAsync,
    update: updateMutation.mutateAsync,
    delete: deleteMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}

export function useSendersByEntity(entityTable: string, entityId: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["senders", "entity", entityTable, entityId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("senders")
        .select("*")
        .eq("entity_table", entityTable)
        .eq("entity_id", entityId)
        .order("email");
      if (error) throw error;
      return data as unknown as Sender[];
    },
    enabled: !!user && !!entityTable && !!entityId,
  });
}

export function useSenderByEmail(email: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["senders", "email", email],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("senders")
        .select("*")
        .ilike("email", email)
        .maybeSingle();
      if (error) throw error;
      return data as Sender | null;
    },
    enabled: !!user && !!email,
  });
}
