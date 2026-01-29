import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { EntityField, EntityFieldType } from "@/types/entity-fields";
import type { Json } from "@/integrations/supabase/types";

interface CreateFieldInput {
  entity_table: string;
  name: string;
  slug: string;
  data_type: EntityFieldType;
  icon?: string;
  description?: string;
  is_required?: boolean;
  sort_order?: number;
  config?: Record<string, unknown>;
  created_by: string;
}

interface UpdateFieldInput {
  id: string;
  data: Partial<Omit<EntityField, 'id' | 'created_by' | 'created_at' | 'updated_at'>>;
}

export function useEntityFields(entityTable?: string) {
  const queryClient = useQueryClient();

  const { data: fields = [], isLoading, error } = useQuery({
    queryKey: ['entity-fields', entityTable],
    queryFn: async () => {
      let query = supabase
        .from('entity_fields')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (entityTable) {
        query = query.eq('entity_table', entityTable);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as EntityField[];
    },
  });

  const createField = useMutation({
    mutationFn: async (input: CreateFieldInput) => {
      const insertData = {
        entity_table: input.entity_table,
        name: input.name,
        slug: input.slug,
        data_type: input.data_type as "text" | "number" | "date" | "datetime" | "boolean" | "currency" | "link" | "address" | "actor",
        icon: input.icon || null,
        description: input.description || null,
        is_required: input.is_required || false,
        sort_order: input.sort_order || 0,
        config: (input.config || {}) as Json,
        created_by: input.created_by,
      };

      const { data, error } = await supabase
        .from('entity_fields')
        .insert(insertData)
        .select()
        .single();
      
      if (error) throw error;
      return data as EntityField;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['entity-fields'] });
    },
  });

  const updateField = useMutation({
    mutationFn: async ({ id, data }: UpdateFieldInput) => {
      const updateData: Record<string, unknown> = {};
      
      if (data.name !== undefined) updateData.name = data.name;
      if (data.slug !== undefined) updateData.slug = data.slug;
      if (data.data_type !== undefined) updateData.data_type = data.data_type;
      if (data.icon !== undefined) updateData.icon = data.icon;
      if (data.description !== undefined) updateData.description = data.description;
      if (data.is_required !== undefined) updateData.is_required = data.is_required;
      if (data.is_active !== undefined) updateData.is_active = data.is_active;
      if (data.sort_order !== undefined) updateData.sort_order = data.sort_order;
      if (data.config !== undefined) updateData.config = data.config as Json;

      const { data: updated, error } = await supabase
        .from('entity_fields')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return updated as EntityField;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['entity-fields'] });
    },
  });

  const deleteField = useMutation({
    mutationFn: async (id: string) => {
      // Soft delete by setting is_active to false
      const { error } = await supabase
        .from('entity_fields')
        .update({ is_active: false })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['entity-fields'] });
    },
  });

  return {
    fields,
    isLoading,
    error,
    createField,
    updateField,
    deleteField,
  };
}
