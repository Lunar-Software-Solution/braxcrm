import { useCallback, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkspace } from "@/hooks/use-workspace";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type {
  EmailCategory,
  EmailRule,
  EmailRuleAction,
  EmailTag,
  EmailVisibilityGroup,
  CreateEmailCategoryInput,
  UpdateEmailCategoryInput,
  CreateEmailRuleInput,
  UpdateEmailRuleInput,
  CreateEmailRuleActionInput,
  CreateEmailTagInput,
  UpdateEmailTagInput,
  CreateVisibilityGroupInput,
  UpdateVisibilityGroupInput,
  RuleActionConfig,
} from "@/types/email-rules";

// ==================== CATEGORIES ====================

export function useEmailCategories() {
  const { workspaceId } = useWorkspace();

  return useQuery({
    queryKey: ["email-categories", workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];
      
      const { data, error } = await supabase
        .from("email_categories")
        .select("*")
        .eq("workspace_id", workspaceId)
        .order("sort_order");

      if (error) throw error;
      return data as EmailCategory[];
    },
    enabled: !!workspaceId,
  });
}

export function useCreateCategory() {
  const { user } = useAuth();
  const { workspaceId } = useWorkspace();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateEmailCategoryInput) => {
      if (!workspaceId || !user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("email_categories")
        .insert({
          workspace_id: workspaceId,
          created_by: user.id,
          name: input.name,
          description: input.description || null,
          color: input.color || "#6366f1",
          icon: input.icon || "tag",
          is_active: input.is_active ?? true,
          sort_order: input.sort_order ?? 0,
        })
        .select()
        .single();

      if (error) throw error;
      return data as EmailCategory;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["email-categories", workspaceId] });
      toast.success("Category created");
    },
    onError: (error) => {
      toast.error(`Failed to create category: ${error.message}`);
    },
  });
}

export function useUpdateCategory() {
  const { workspaceId } = useWorkspace();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateEmailCategoryInput) => {
      const { id, ...updates } = input;
      
      const { data, error } = await supabase
        .from("email_categories")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data as EmailCategory;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["email-categories", workspaceId] });
      toast.success("Category updated");
    },
    onError: (error) => {
      toast.error(`Failed to update category: ${error.message}`);
    },
  });
}

export function useDeleteCategory() {
  const { workspaceId } = useWorkspace();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("email_categories")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["email-categories", workspaceId] });
      toast.success("Category deleted");
    },
    onError: (error) => {
      toast.error(`Failed to delete category: ${error.message}`);
    },
  });
}

// ==================== RULES ====================

export function useEmailRules(categoryId?: string) {
  const { workspaceId } = useWorkspace();

  return useQuery({
    queryKey: ["email-rules", workspaceId, categoryId],
    queryFn: async () => {
      if (!workspaceId) return [];
      
      let query = supabase
        .from("email_rules")
        .select(`
          *,
          category:email_categories(*),
          actions:email_rule_actions(*)
        `)
        .eq("workspace_id", workspaceId)
        .order("priority", { ascending: false });

      if (categoryId) {
        query = query.eq("category_id", categoryId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as (EmailRule & { category: EmailCategory; actions: EmailRuleAction[] })[];
    },
    enabled: !!workspaceId,
  });
}

export function useCreateRule() {
  const { user } = useAuth();
  const { workspaceId } = useWorkspace();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateEmailRuleInput) => {
      if (!workspaceId || !user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("email_rules")
        .insert({
          workspace_id: workspaceId,
          created_by: user.id,
          category_id: input.category_id,
          name: input.name,
          is_active: input.is_active ?? true,
          priority: input.priority ?? 0,
        })
        .select()
        .single();

      if (error) throw error;
      return data as EmailRule;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["email-rules", workspaceId] });
      toast.success("Rule created");
    },
    onError: (error) => {
      toast.error(`Failed to create rule: ${error.message}`);
    },
  });
}

export function useUpdateRule() {
  const { workspaceId } = useWorkspace();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateEmailRuleInput) => {
      const { id, ...updates } = input;
      
      const { data, error } = await supabase
        .from("email_rules")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data as EmailRule;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["email-rules", workspaceId] });
      toast.success("Rule updated");
    },
    onError: (error) => {
      toast.error(`Failed to update rule: ${error.message}`);
    },
  });
}

export function useDeleteRule() {
  const { workspaceId } = useWorkspace();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("email_rules")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["email-rules", workspaceId] });
      toast.success("Rule deleted");
    },
    onError: (error) => {
      toast.error(`Failed to delete rule: ${error.message}`);
    },
  });
}

// ==================== RULE ACTIONS ====================

export function useCreateRuleAction() {
  const { workspaceId } = useWorkspace();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateEmailRuleActionInput) => {
      // Cast to any to avoid type issues before types are regenerated
      const insertData = {
        rule_id: input.rule_id,
        action_type: input.action_type,
        config: input.config as Record<string, unknown>,
        is_active: input.is_active ?? true,
      };

      const { data, error } = await supabase
        .from("email_rule_actions")
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .insert(insertData as any)
        .select()
        .single();

      if (error) throw error;
      return data as EmailRuleAction;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["email-rules", workspaceId] });
      toast.success("Action added");
    },
    onError: (error) => {
      toast.error(`Failed to add action: ${error.message}`);
    },
  });
}

export function useUpdateRuleAction() {
  const { workspaceId } = useWorkspace();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, config, is_active }: { id: string; config?: RuleActionConfig; is_active?: boolean }) => {
      const updates: Record<string, unknown> = {};
      if (config !== undefined) updates.config = config;
      if (is_active !== undefined) updates.is_active = is_active;

      const { data, error } = await supabase
        .from("email_rule_actions")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data as EmailRuleAction;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["email-rules", workspaceId] });
      toast.success("Action updated");
    },
    onError: (error) => {
      toast.error(`Failed to update action: ${error.message}`);
    },
  });
}

export function useDeleteRuleAction() {
  const { workspaceId } = useWorkspace();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("email_rule_actions")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["email-rules", workspaceId] });
      toast.success("Action removed");
    },
    onError: (error) => {
      toast.error(`Failed to remove action: ${error.message}`);
    },
  });
}

// ==================== TAGS ====================

export function useEmailTags() {
  const { workspaceId } = useWorkspace();

  return useQuery({
    queryKey: ["email-tags", workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];
      
      const { data, error } = await supabase
        .from("email_tags")
        .select("*")
        .eq("workspace_id", workspaceId)
        .order("name");

      if (error) throw error;
      return data as EmailTag[];
    },
    enabled: !!workspaceId,
  });
}

export function useCreateTag() {
  const { workspaceId } = useWorkspace();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateEmailTagInput) => {
      if (!workspaceId) throw new Error("No workspace");

      const { data, error } = await supabase
        .from("email_tags")
        .insert({
          workspace_id: workspaceId,
          name: input.name,
          color: input.color || "#6366f1",
          outlook_category: input.outlook_category || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data as EmailTag;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["email-tags", workspaceId] });
      toast.success("Tag created");
    },
    onError: (error) => {
      toast.error(`Failed to create tag: ${error.message}`);
    },
  });
}

export function useUpdateTag() {
  const { workspaceId } = useWorkspace();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateEmailTagInput) => {
      const { id, ...updates } = input;
      
      const { data, error } = await supabase
        .from("email_tags")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data as EmailTag;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["email-tags", workspaceId] });
      toast.success("Tag updated");
    },
    onError: (error) => {
      toast.error(`Failed to update tag: ${error.message}`);
    },
  });
}

export function useDeleteTag() {
  const { workspaceId } = useWorkspace();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("email_tags")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["email-tags", workspaceId] });
      toast.success("Tag deleted");
    },
    onError: (error) => {
      toast.error(`Failed to delete tag: ${error.message}`);
    },
  });
}

// ==================== VISIBILITY GROUPS ====================

export function useVisibilityGroups() {
  const { workspaceId } = useWorkspace();

  return useQuery({
    queryKey: ["visibility-groups", workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];
      
      const { data, error } = await supabase
        .from("email_visibility_groups")
        .select(`
          *,
          members:email_visibility_group_members(*)
        `)
        .eq("workspace_id", workspaceId)
        .order("name");

      if (error) throw error;
      return data as (EmailVisibilityGroup & { members: { id: string; user_id: string }[] })[];
    },
    enabled: !!workspaceId,
  });
}

export function useCreateVisibilityGroup() {
  const { workspaceId } = useWorkspace();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateVisibilityGroupInput) => {
      if (!workspaceId) throw new Error("No workspace");

      const { data, error } = await supabase
        .from("email_visibility_groups")
        .insert({
          workspace_id: workspaceId,
          name: input.name,
          description: input.description || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data as EmailVisibilityGroup;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["visibility-groups", workspaceId] });
      toast.success("Visibility group created");
    },
    onError: (error) => {
      toast.error(`Failed to create group: ${error.message}`);
    },
  });
}

export function useUpdateVisibilityGroup() {
  const { workspaceId } = useWorkspace();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateVisibilityGroupInput) => {
      const { id, ...updates } = input;
      
      const { data, error } = await supabase
        .from("email_visibility_groups")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data as EmailVisibilityGroup;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["visibility-groups", workspaceId] });
      toast.success("Group updated");
    },
    onError: (error) => {
      toast.error(`Failed to update group: ${error.message}`);
    },
  });
}

export function useDeleteVisibilityGroup() {
  const { workspaceId } = useWorkspace();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("email_visibility_groups")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["visibility-groups", workspaceId] });
      toast.success("Group deleted");
    },
    onError: (error) => {
      toast.error(`Failed to delete group: ${error.message}`);
    },
  });
}

export function useAddGroupMember() {
  const { workspaceId } = useWorkspace();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ groupId, userId }: { groupId: string; userId: string }) => {
      const { data, error } = await supabase
        .from("email_visibility_group_members")
        .insert({
          group_id: groupId,
          user_id: userId,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["visibility-groups", workspaceId] });
      toast.success("Member added");
    },
    onError: (error) => {
      toast.error(`Failed to add member: ${error.message}`);
    },
  });
}

export function useRemoveGroupMember() {
  const { workspaceId } = useWorkspace();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (memberId: string) => {
      const { error } = await supabase
        .from("email_visibility_group_members")
        .delete()
        .eq("id", memberId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["visibility-groups", workspaceId] });
      toast.success("Member removed");
    },
    onError: (error) => {
      toast.error(`Failed to remove member: ${error.message}`);
    },
  });
}

// ==================== EXTRACTED INVOICES ====================

export function useExtractedInvoices() {
  const { workspaceId } = useWorkspace();

  return useQuery({
    queryKey: ["extracted-invoices", workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];
      
      const { data, error } = await supabase
        .from("extracted_invoices")
        .select(`
          *,
          email:email_messages(subject, received_at)
        `)
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!workspaceId,
  });
}

export function useUpdateInvoiceStatus() {
  const { workspaceId } = useWorkspace();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: "pending" | "reviewed" | "approved" | "rejected" }) => {
      const { data, error } = await supabase
        .from("extracted_invoices")
        .update({ status })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["extracted-invoices", workspaceId] });
      toast.success("Invoice status updated");
    },
    onError: (error) => {
      toast.error(`Failed to update status: ${error.message}`);
    },
  });
}
