import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Entity, EntityType } from "@/types/entities";
import { useAuth } from "@/contexts/AuthContext";

interface CreateEntityData {
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

export function useEntities(entityType: EntityType) {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const listQuery = useQuery({
    queryKey: [entityType],
    queryFn: async () => {
      const { data, error } = await supabase
        .from(entityType)
        .select("*")
        .order("name");
      if (error) throw error;
      return data as unknown as Entity[];
    },
    enabled: !!user,
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
        return data as unknown as Entity;
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
      return result as unknown as Entity;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [entityType] });
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
      return result as unknown as Entity;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [entityType] });
      queryClient.invalidateQueries({ queryKey: [entityType, variables.id] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from(entityType).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [entityType] });
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
