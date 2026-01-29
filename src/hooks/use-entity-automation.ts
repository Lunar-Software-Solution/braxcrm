import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import type { EntityAutomationRule, EntityRuleAction } from "@/types/entity-automation";
import type { Json } from "@/integrations/supabase/types";

export function useEntityAutomationRules() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["entity-automation-rules"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("entity_automation_rules")
        .select("*, actions:entity_rule_actions(*)")
        .order("priority", { ascending: false });

      if (error) throw error;
      return data as EntityAutomationRule[];
    },
    enabled: !!user,
  });
}

export function useCreateEntityRule() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (data: { entity_table: string; description?: string; ai_prompt?: string }) => {
      if (!user) throw new Error("Not authenticated");
      
      const { data: rule, error } = await supabase
        .from("entity_automation_rules")
        .insert([{ ...data, created_by: user.id }])
        .select()
        .single();

      if (error) throw error;
      return rule as EntityAutomationRule;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["entity-automation-rules"] });
      toast({ title: "Entity rule created" });
    },
    onError: (error) => {
      toast({ title: "Failed to create rule", description: error.message, variant: "destructive" });
    },
  });
}

export function useUpdateEntityRule() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<EntityAutomationRule> }) => {
      const { error } = await supabase
        .from("entity_automation_rules")
        .update(data)
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["entity-automation-rules"] });
    },
    onError: (error) => {
      toast({ title: "Failed to update rule", description: error.message, variant: "destructive" });
    },
  });
}

export function useDeleteEntityRule() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("entity_automation_rules")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["entity-automation-rules"] });
      toast({ title: "Entity rule deleted" });
    },
    onError: (error) => {
      toast({ title: "Failed to delete rule", description: error.message, variant: "destructive" });
    },
  });
}

// Entity Rule Actions
export function useCreateEntityRuleAction() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: { entity_rule_id: string; action_type: string; config?: Record<string, unknown> }) => {
      const { data: action, error } = await supabase
        .from("entity_rule_actions")
        .insert([{ ...data, config: (data.config || {}) as Json }])
        .select()
        .single();

      if (error) throw error;
      return action as EntityRuleAction;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["entity-automation-rules"] });
      toast({ title: "Action added" });
    },
    onError: (error) => {
      toast({ title: "Failed to add action", description: error.message, variant: "destructive" });
    },
  });
}

export function useUpdateEntityRuleAction() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: { config?: Record<string, unknown>; is_active?: boolean } }) => {
      const updateData: { config?: Json; is_active?: boolean } = {};
      if (data.config !== undefined) updateData.config = data.config as Json;
      if (data.is_active !== undefined) updateData.is_active = data.is_active;
      
      const { error } = await supabase
        .from("entity_rule_actions")
        .update(updateData)
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["entity-automation-rules"] });
    },
    onError: (error) => {
      toast({ title: "Failed to update action", description: error.message, variant: "destructive" });
    },
  });
}

export function useDeleteEntityRuleAction() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("entity_rule_actions")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["entity-automation-rules"] });
      toast({ title: "Action removed" });
    },
    onError: (error) => {
      toast({ title: "Failed to remove action", description: error.message, variant: "destructive" });
    },
  });
}

// Initialize default rules for all entity types
export function useInitializeEntityRules() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not authenticated");

      const defaultRules = [
        { entity_table: "influencers", description: "Social media influencers, content creators, KOLs", ai_prompt: "Identify influencers, content creators, brand ambassadors, or social media personalities" },
        { entity_table: "resellers", description: "Distributors, retailers, resale partners", ai_prompt: "Identify resellers, distributors, retailers, or wholesale partners" },
        { entity_table: "product_suppliers", description: "Vendors selling products for resale", ai_prompt: "Identify suppliers of physical products, inventory vendors, or trade suppliers" },
        { entity_table: "expense_suppliers", description: "Service providers and expense vendors", ai_prompt: "Identify service providers, SaaS vendors, marketing agencies, or expense-related suppliers" },
        { entity_table: "corporate_management", description: "Legal, accounting, and corporate entities", ai_prompt: "Identify lawyers, accountants, banks, government agencies, or corporate management contacts" },
        { entity_table: "personal_contacts", description: "Friends, family, personal acquaintances", ai_prompt: "Identify personal contacts, friends, family members, or non-business acquaintances" },
        { entity_table: "subscriptions", description: "Recurring subscriptions and SaaS services", ai_prompt: "Identify subscription services, recurring billing, or SaaS notifications" },
      ];

      const { data, error } = await supabase
        .from("entity_automation_rules")
        .upsert(
          defaultRules.map((rule) => ({ ...rule, created_by: user.id })),
          { onConflict: "entity_table" }
        )
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["entity-automation-rules"] });
      toast({ title: "Entity rules initialized" });
    },
    onError: (error) => {
      toast({ title: "Failed to initialize rules", description: error.message, variant: "destructive" });
    },
  });
}
