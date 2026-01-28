import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Entity, EntityType } from "@/types/entities";

interface CreateEntityData {
  workspace_id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  notes?: string | null;
  avatar_url?: string | null;
  created_by: string;
}

interface UpdateEntityData {
  name?: string;
  email?: string | null;
  phone?: string | null;
  notes?: string | null;
  avatar_url?: string | null;
}

export function useEntities(entityType: EntityType, workspaceId: string | null) {
  const queryClient = useQueryClient();

  const listQuery = useQuery({
    queryKey: [entityType, workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];
      const { data, error } = await supabase
        .from(entityType)
        .select("*")
        .eq("workspace_id", workspaceId)
        .order("name");
      if (error) throw error;
      return data as Entity[];
    },
    enabled: !!workspaceId,
  });

  const getQuery = (id: string) =>
    useQuery({
      queryKey: [entityType, id],
      queryFn: async () => {
        const { data, error } = await supabase
          .from(entityType)
          .select("*")
          .eq("id", id)
          .single();
        if (error) throw error;
        return data as Entity;
      },
      enabled: !!id,
    });

  const createMutation = useMutation({
    mutationFn: async (data: CreateEntityData) => {
      const { data: result, error } = await supabase
        .from(entityType)
        .insert(data)
        .select()
        .single();
      if (error) throw error;
      return result as Entity;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [entityType, workspaceId] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateEntityData }) => {
      const { data: result, error } = await supabase
        .from(entityType)
        .update(data)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return result as Entity;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [entityType, workspaceId] });
      queryClient.invalidateQueries({ queryKey: [entityType, variables.id] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from(entityType).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [entityType, workspaceId] });
    },
  });

  return {
    list: listQuery.data ?? [],
    isLoading: listQuery.isLoading,
    error: listQuery.error,
    getEntity: getQuery,
    create: createMutation.mutateAsync,
    update: updateMutation.mutateAsync,
    delete: deleteMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}
