import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { 
  EmailTemplate, 
  EmailTemplateInsert, 
  EmailTemplateUpdate,
  MergeField 
} from "@/types/email-automation";
import type { Json } from "@/integrations/supabase/types";

export function useEmailTemplates() {
  return useQuery({
    queryKey: ["email-templates"],
    queryFn: async (): Promise<EmailTemplate[]> => {
      const { data, error } = await supabase
        .from("email_templates")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      
      return (data || []).map(template => ({
        ...template,
        merge_fields: (template.merge_fields as unknown as MergeField[]) || [],
      }));
    },
  });
}

export function useEmailTemplate(id: string | undefined) {
  return useQuery({
    queryKey: ["email-template", id],
    enabled: !!id,
    queryFn: async (): Promise<EmailTemplate | null> => {
      if (!id) return null;
      
      const { data, error } = await supabase
        .from("email_templates")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;
      
      return {
        ...data,
        merge_fields: (data.merge_fields as unknown as MergeField[]) || [],
      };
    },
  });
}

export function useCreateEmailTemplate() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (template: EmailTemplateInsert): Promise<EmailTemplate> => {
      const insertData = {
        ...template,
        merge_fields: (template.merge_fields || []) as unknown as Json,
      };
      
      const { data, error } = await supabase
        .from("email_templates")
        .insert(insertData)
        .select()
        .single();

      if (error) throw error;
      
      return {
        ...data,
        merge_fields: (data.merge_fields as unknown as MergeField[]) || [],
      };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["email-templates"] });
      toast({
        title: "Template created",
        description: "Email template has been created successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error creating template",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useUpdateEmailTemplate() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ 
      id, 
      updates 
    }: { 
      id: string; 
      updates: EmailTemplateUpdate 
    }): Promise<EmailTemplate> => {
      const updateData = {
        ...updates,
        merge_fields: updates.merge_fields ? (updates.merge_fields as unknown as Json) : undefined,
      };
      
      const { data, error } = await supabase
        .from("email_templates")
        .update(updateData)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      
      return {
        ...data,
        merge_fields: (data.merge_fields as unknown as MergeField[]) || [],
      };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["email-templates"] });
      queryClient.invalidateQueries({ queryKey: ["email-template", variables.id] });
      toast({
        title: "Template updated",
        description: "Email template has been updated successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error updating template",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useDeleteEmailTemplate() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const { error } = await supabase
        .from("email_templates")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["email-templates"] });
      toast({
        title: "Template deleted",
        description: "Email template has been deleted successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error deleting template",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}
