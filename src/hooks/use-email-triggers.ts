import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { 
  EmailTrigger, 
  EmailTriggerInsert, 
  EmailTriggerUpdate,
  TriggerCondition,
  TriggerType,
  MergeField
} from "@/types/email-automation";
import type { Json } from "@/integrations/supabase/types";

export function useEmailTriggers() {
  return useQuery({
    queryKey: ["email-triggers"],
    queryFn: async (): Promise<EmailTrigger[]> => {
      const { data, error } = await supabase
        .from("email_triggers")
        .select(`
          *,
          template:email_templates(*)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      
      return (data || []).map(trigger => ({
        ...trigger,
        trigger_type: trigger.trigger_type as TriggerType,
        conditions: (trigger.conditions as unknown as TriggerCondition) || {},
        template: trigger.template ? {
          ...trigger.template,
          merge_fields: (trigger.template.merge_fields as unknown as MergeField[]) || [],
        } : undefined,
      }));
    },
  });
}

export function useEmailTrigger(id: string | undefined) {
  return useQuery({
    queryKey: ["email-trigger", id],
    enabled: !!id,
    queryFn: async (): Promise<EmailTrigger | null> => {
      if (!id) return null;
      
      const { data, error } = await supabase
        .from("email_triggers")
        .select(`
          *,
          template:email_templates(*)
        `)
        .eq("id", id)
        .single();

      if (error) throw error;
      
      return {
        ...data,
        trigger_type: data.trigger_type as TriggerType,
        conditions: (data.conditions as unknown as TriggerCondition) || {},
        template: data.template ? {
          ...data.template,
          merge_fields: (data.template.merge_fields as unknown as MergeField[]) || [],
        } : undefined,
      };
    },
  });
}

export function useCreateEmailTrigger() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (trigger: EmailTriggerInsert): Promise<EmailTrigger> => {
      const insertData = {
        ...trigger,
        conditions: (trigger.conditions || {}) as unknown as Json,
      };
      
      const { data, error } = await supabase
        .from("email_triggers")
        .insert(insertData)
        .select()
        .single();

      if (error) throw error;
      
      return {
        ...data,
        trigger_type: data.trigger_type as TriggerType,
        conditions: (data.conditions as unknown as TriggerCondition) || {},
      };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["email-triggers"] });
      toast({
        title: "Trigger created",
        description: "Email trigger has been created successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error creating trigger",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useUpdateEmailTrigger() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ 
      id, 
      updates 
    }: { 
      id: string; 
      updates: EmailTriggerUpdate 
    }): Promise<EmailTrigger> => {
      const updateData = {
        ...updates,
        conditions: updates.conditions ? (updates.conditions as unknown as Json) : undefined,
      };
      
      const { data, error } = await supabase
        .from("email_triggers")
        .update(updateData)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      
      return {
        ...data,
        trigger_type: data.trigger_type as TriggerType,
        conditions: (data.conditions as unknown as TriggerCondition) || {},
      };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["email-triggers"] });
      queryClient.invalidateQueries({ queryKey: ["email-trigger", variables.id] });
      toast({
        title: "Trigger updated",
        description: "Email trigger has been updated successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error updating trigger",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useDeleteEmailTrigger() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const { error } = await supabase
        .from("email_triggers")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["email-triggers"] });
      toast({
        title: "Trigger deleted",
        description: "Email trigger has been deleted successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error deleting trigger",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}
