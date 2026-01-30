import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { WebflowSyncConfig, WebflowSyncResult } from "@/types/imports";
import { useToast } from "@/hooks/use-toast";

export interface WebflowSite {
  id: string;
  displayName: string;
  shortName: string;
  previewUrl?: string;
}

export interface WebflowForm {
  id: string;
  displayName: string;
  siteName?: string;
}

export function useWebflowSync() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: configs, isLoading, error } = useQuery({
    queryKey: ["webflow-sync-configs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("webflow_sync_config")
        .select(`
          *,
          endpoint:webhook_endpoints(id, name, slug, default_entity_table)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as unknown as WebflowSyncConfig[];
    },
  });

  // Fetch available Webflow sites
  const { data: sites, isLoading: sitesLoading, refetch: refetchSites } = useQuery({
    queryKey: ["webflow-sites"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("webflow-list-sites", {
        body: { action: "list-sites" },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);
      return (data.sites || []) as WebflowSite[];
    },
  });

  // Create a mutation to fetch forms for a specific site
  const fetchForms = useMutation({
    mutationFn: async (siteId: string) => {
      const { data, error } = await supabase.functions.invoke("webflow-list-sites", {
        body: { action: "list-forms", site_id: siteId },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);
      return (data.forms || []) as WebflowForm[];
    },
  });

  const createConfig = useMutation({
    mutationFn: async (config: {
      site_id: string;
      form_id?: string;
      form_name?: string;
      endpoint_id?: string;
      is_active?: boolean;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("webflow_sync_config")
        .insert({
          site_id: config.site_id,
          form_id: config.form_id || null,
          form_name: config.form_name || null,
          endpoint_id: config.endpoint_id || null,
          is_active: config.is_active ?? true,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data as unknown as WebflowSyncConfig;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["webflow-sync-configs"] });
      toast({ title: "Webflow sync configuration created" });
    },
    onError: (error) => {
      toast({
        title: "Failed to create configuration",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateConfig = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<WebflowSyncConfig> & { id: string }) => {
      const { data, error } = await supabase
        .from("webflow_sync_config")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data as unknown as WebflowSyncConfig;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["webflow-sync-configs"] });
      toast({ title: "Configuration updated" });
    },
    onError: (error) => {
      toast({
        title: "Failed to update configuration",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteConfig = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("webflow_sync_config")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["webflow-sync-configs"] });
      toast({ title: "Configuration deleted" });
    },
    onError: (error) => {
      toast({
        title: "Failed to delete configuration",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const triggerSync = useMutation({
    mutationFn: async (configId?: string) => {
      const { data, error } = await supabase.functions.invoke("sync-webflow-forms", {
        body: configId ? { config_id: configId, manual: true } : { manual: true },
      });

      if (error) throw error;
      return data as WebflowSyncResult;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["webflow-sync-configs"] });
      queryClient.invalidateQueries({ queryKey: ["import-events"] });
      toast({
        title: "Webflow sync complete",
        description: `Imported ${data.total_imported} form submission(s)`,
      });
    },
    onError: (error) => {
      toast({
        title: "Sync failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    configs,
    isLoading,
    error,
    sites,
    sitesLoading,
    refetchSites,
    fetchForms,
    createConfig,
    updateConfig,
    deleteConfig,
    triggerSync,
  };
}
