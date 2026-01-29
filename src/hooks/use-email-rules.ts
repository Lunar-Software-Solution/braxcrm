import { useCallback, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
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
  const { user } = useAuth();

  return useQuery({
    queryKey: ["email-categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("email_categories")
        .select("*")
        .order("sort_order");

      if (error) throw error;
      return data as EmailCategory[];
    },
    enabled: !!user,
  });
}

export function useCreateCategory() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateEmailCategoryInput) => {
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("email_categories")
        .insert({
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
      queryClient.invalidateQueries({ queryKey: ["email-categories"] });
      toast.success("Category created");
    },
    onError: (error) => {
      toast.error(`Failed to create category: ${error.message}`);
    },
  });
}

export function useUpdateCategory() {
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
      queryClient.invalidateQueries({ queryKey: ["email-categories"] });
      toast.success("Category updated");
    },
    onError: (error) => {
      toast.error(`Failed to update category: ${error.message}`);
    },
  });
}

export function useDeleteCategory() {
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
      queryClient.invalidateQueries({ queryKey: ["email-categories"] });
      toast.success("Category deleted");
    },
    onError: (error) => {
      toast.error(`Failed to delete category: ${error.message}`);
    },
  });
}

// ==================== RULES ====================

export function useEmailRules(categoryId?: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["email-rules", categoryId],
    queryFn: async () => {
      let query = supabase
        .from("email_rules")
        .select(`
          *,
          category:email_categories(*),
          actions:email_rule_actions(*)
        `)
        .order("priority", { ascending: false });

      if (categoryId) {
        query = query.eq("category_id", categoryId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as (EmailRule & { category: EmailCategory; actions: EmailRuleAction[] })[];
    },
    enabled: !!user,
  });
}

export function useCreateRule() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateEmailRuleInput) => {
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("email_rules")
        .insert({
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
      queryClient.invalidateQueries({ queryKey: ["email-rules"] });
      toast.success("Rule created");
    },
    onError: (error) => {
      toast.error(`Failed to create rule: ${error.message}`);
    },
  });
}

export function useUpdateRule() {
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
      queryClient.invalidateQueries({ queryKey: ["email-rules"] });
      toast.success("Rule updated");
    },
    onError: (error) => {
      toast.error(`Failed to update rule: ${error.message}`);
    },
  });
}

export function useDeleteRule() {
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
      queryClient.invalidateQueries({ queryKey: ["email-rules"] });
      toast.success("Rule deleted");
    },
    onError: (error) => {
      toast.error(`Failed to delete rule: ${error.message}`);
    },
  });
}

// ==================== RULE ACTIONS ====================

export function useCreateRuleAction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateEmailRuleActionInput) => {
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
      queryClient.invalidateQueries({ queryKey: ["email-rules"] });
      toast.success("Action added");
    },
    onError: (error) => {
      toast.error(`Failed to add action: ${error.message}`);
    },
  });
}

export function useUpdateRuleAction() {
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
      queryClient.invalidateQueries({ queryKey: ["email-rules"] });
      toast.success("Action updated");
    },
    onError: (error) => {
      toast.error(`Failed to update action: ${error.message}`);
    },
  });
}

export function useDeleteRuleAction() {
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
      queryClient.invalidateQueries({ queryKey: ["email-rules"] });
      toast.success("Action removed");
    },
    onError: (error) => {
      toast.error(`Failed to remove action: ${error.message}`);
    },
  });
}

// ==================== TAGS ====================

export function useEmailTags() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["email-tags"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("email_tags")
        .select("*")
        .order("name");

      if (error) throw error;
      return data as EmailTag[];
    },
    enabled: !!user,
  });
}

export function useCreateTag() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateEmailTagInput) => {
      const { data, error } = await supabase
        .from("email_tags")
        .insert({
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
      queryClient.invalidateQueries({ queryKey: ["email-tags"] });
      toast.success("Tag created");
    },
    onError: (error) => {
      toast.error(`Failed to create tag: ${error.message}`);
    },
  });
}

export function useUpdateTag() {
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
      queryClient.invalidateQueries({ queryKey: ["email-tags"] });
      toast.success("Tag updated");
    },
    onError: (error) => {
      toast.error(`Failed to update tag: ${error.message}`);
    },
  });
}

export function useDeleteTag() {
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
      queryClient.invalidateQueries({ queryKey: ["email-tags"] });
      toast.success("Tag deleted");
    },
    onError: (error) => {
      toast.error(`Failed to delete tag: ${error.message}`);
    },
  });
}

// ==================== VISIBILITY GROUPS ====================

export function useVisibilityGroups() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["visibility-groups"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("email_visibility_groups")
        .select(`
          *,
          members:email_visibility_group_members(*)
        `)
        .order("name");

      if (error) throw error;
      return data as (EmailVisibilityGroup & { members: { id: string; user_id: string }[] })[];
    },
    enabled: !!user,
  });
}

export function useCreateVisibilityGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateVisibilityGroupInput) => {
      const { data, error } = await supabase
        .from("email_visibility_groups")
        .insert({
          name: input.name,
          description: input.description || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data as EmailVisibilityGroup;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["visibility-groups"] });
      toast.success("Visibility group created");
    },
    onError: (error) => {
      toast.error(`Failed to create visibility group: ${error.message}`);
    },
  });
}

export function useUpdateVisibilityGroup() {
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
      queryClient.invalidateQueries({ queryKey: ["visibility-groups"] });
      toast.success("Visibility group updated");
    },
    onError: (error) => {
      toast.error(`Failed to update visibility group: ${error.message}`);
    },
  });
}

export function useDeleteVisibilityGroup() {
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
      queryClient.invalidateQueries({ queryKey: ["visibility-groups"] });
      toast.success("Visibility group deleted");
    },
    onError: (error) => {
      toast.error(`Failed to delete visibility group: ${error.message}`);
    },
  });
}

export function useAddGroupMember() {
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
      queryClient.invalidateQueries({ queryKey: ["visibility-groups"] });
      toast.success("Member added");
    },
    onError: (error) => {
      toast.error(`Failed to add member: ${error.message}`);
    },
  });
}

export function useRemoveGroupMember() {
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
      queryClient.invalidateQueries({ queryKey: ["visibility-groups"] });
      toast.success("Member removed");
    },
    onError: (error) => {
      toast.error(`Failed to remove member: ${error.message}`);
    },
  });
}
