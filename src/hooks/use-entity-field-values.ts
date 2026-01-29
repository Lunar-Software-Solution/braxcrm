import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { EntityFieldValue, EntityField, EntityFieldType } from "@/types/entity-fields";
import type { Json } from "@/integrations/supabase/types";

interface SetFieldValueInput {
  field_id: string;
  entity_table: string;
  entity_id: string;
  value: string | number | boolean | Date | Record<string, unknown> | null;
  data_type: EntityFieldType;
}

export function useEntityFieldValues(entityTable: string, entityId: string) {
  const queryClient = useQueryClient();

  const { data: values = [], isLoading, error } = useQuery({
    queryKey: ['entity-field-values', entityTable, entityId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('entity_field_values')
        .select('*')
        .eq('entity_table', entityTable)
        .eq('entity_id', entityId);
      
      if (error) throw error;
      return data as EntityFieldValue[];
    },
    enabled: !!entityTable && !!entityId,
  });

  const setFieldValue = useMutation({
    mutationFn: async (input: SetFieldValueInput) => {
      let value_text: string | null = null;
      let value_number: number | null = null;
      let value_boolean: boolean | null = null;
      let value_date: string | null = null;
      let value_json: Json | null = null;

      // Set the appropriate value column based on data type
      switch (input.data_type) {
        case 'text':
        case 'link':
        case 'actor':
          value_text = input.value as string;
          break;
        case 'number':
        case 'currency':
          value_number = input.value as number;
          break;
        case 'boolean':
          value_boolean = input.value as boolean;
          break;
        case 'date':
        case 'datetime':
          value_date = input.value instanceof Date 
            ? input.value.toISOString() 
            : input.value as string;
          break;
        case 'address':
          value_json = input.value as Json;
          break;
      }

      const upsertData = {
        field_id: input.field_id,
        entity_table: input.entity_table,
        entity_id: input.entity_id,
        value_text,
        value_number,
        value_boolean,
        value_date,
        value_json,
      };

      const { data, error } = await supabase
        .from('entity_field_values')
        .upsert(upsertData, { 
          onConflict: 'field_id,entity_id',
          ignoreDuplicates: false 
        })
        .select()
        .single();
      
      if (error) throw error;
      return data as EntityFieldValue;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: ['entity-field-values', entityTable, entityId] 
      });
    },
  });

  const deleteFieldValue = useMutation({
    mutationFn: async (valueId: string) => {
      const { error } = await supabase
        .from('entity_field_values')
        .delete()
        .eq('id', valueId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: ['entity-field-values', entityTable, entityId] 
      });
    },
  });

  // Helper to get value for a specific field
  const getValueForField = (fieldId: string): EntityFieldValue | undefined => {
    return values.find(v => v.field_id === fieldId);
  };

  // Helper to get formatted value based on field type
  const getFormattedValue = (field: EntityField): string | number | boolean | null => {
    const value = getValueForField(field.id);
    if (!value) return null;

    switch (field.data_type) {
      case 'text':
      case 'link':
      case 'actor':
        return value.value_text;
      case 'number':
      case 'currency':
        return value.value_number;
      case 'boolean':
        return value.value_boolean;
      case 'date':
      case 'datetime':
        return value.value_date;
      case 'address':
        return value.value_json ? JSON.stringify(value.value_json) : null;
      default:
        return null;
    }
  };

  return {
    values,
    isLoading,
    error,
    setFieldValue,
    deleteFieldValue,
    getValueForField,
    getFormattedValue,
  };
}
