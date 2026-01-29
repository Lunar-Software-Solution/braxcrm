import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "./use-workspace";
import { useToast } from "./use-toast";

export interface ReviewQueueEmail {
  id: string;
  subject: string | null;
  body_preview: string | null;
  received_at: string;
  ai_confidence: number | null;
  category_id: string | null;
  person_id: string | null;
  category?: {
    id: string;
    name: string;
    color: string | null;
  };
  person?: {
    id: string;
    name: string;
    email: string;
  };
}

export interface EmailCategory {
  id: string;
  name: string;
  color: string | null;
  description: string | null;
}

export function useReviewQueue() {
  const { workspaceId } = useWorkspace();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch pending emails (categorized but not processed)
  const {
    data: pendingEmails = [],
    isLoading: isLoadingEmails,
    refetch: refetchEmails,
  } = useQuery({
    queryKey: ["review-queue", workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];

      const { data, error } = await supabase
        .from("email_messages")
        .select(`
          id,
          subject,
          body_preview,
          received_at,
          ai_confidence,
          category_id,
          person_id,
          category:email_categories(id, name, color),
          person:people(id, name, email)
        `)
        .eq("workspace_id", workspaceId)
        .not("category_id", "is", null)
        .eq("is_processed", false)
        .order("received_at", { ascending: false });

      if (error) throw error;
      return data as unknown as ReviewQueueEmail[];
    },
    enabled: !!workspaceId,
  });

  // Fetch all categories for the dropdown
  const { data: categories = [] } = useQuery({
    queryKey: ["email-categories", workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];

      const { data, error } = await supabase
        .from("email_categories")
        .select("id, name, color, description")
        .eq("workspace_id", workspaceId)
        .eq("is_active", true)
        .order("sort_order");

      if (error) throw error;
      return data as EmailCategory[];
    },
    enabled: !!workspaceId,
  });

  // Fetch workspace settings
  const { data: workspaceSettings, isLoading: isLoadingSettings } = useQuery({
    queryKey: ["workspace-settings", workspaceId],
    queryFn: async () => {
      if (!workspaceId) return null;

      const { data, error } = await supabase
        .from("workspace_settings")
        .select("*")
        .eq("workspace_id", workspaceId)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!workspaceId,
  });

  // Update auto-process setting
  const updateAutoProcessMutation = useMutation({
    mutationFn: async (autoProcess: boolean) => {
      if (!workspaceId) throw new Error("No workspace");

      // Upsert the setting
      const { error } = await supabase
        .from("workspace_settings")
        .upsert({
          workspace_id: workspaceId,
          auto_process_emails: autoProcess,
        }, {
          onConflict: "workspace_id",
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workspace-settings", workspaceId] });
      toast({
        title: "Settings updated",
        description: "Auto-process setting has been saved.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error updating settings",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update email category
  const updateCategoryMutation = useMutation({
    mutationFn: async ({ emailId, categoryId }: { emailId: string; categoryId: string }) => {
      // Update the email_messages table
      const { error: emailError } = await supabase
        .from("email_messages")
        .update({ category_id: categoryId })
        .eq("id", emailId);

      if (emailError) throw emailError;

      // Also update email_message_categories for tracking
      const { error: categoryError } = await supabase
        .from("email_message_categories")
        .upsert({
          email_id: emailId,
          category_id: categoryId,
          confidence: 1.0, // Manual override = 100% confidence
        }, {
          onConflict: "email_id,category_id",
        });

      if (categoryError) throw categoryError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["review-queue", workspaceId] });
      toast({
        title: "Category updated",
        description: "Email category has been changed.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error updating category",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Process selected emails through rules
  const processEmailsMutation = useMutation({
    mutationFn: async (emailIds: string[]) => {
      if (!workspaceId) throw new Error("No workspace");

      const { data: session } = await supabase.auth.getSession();
      if (!session.session) throw new Error("Not authenticated");

      const results = {
        processed: 0,
        errors: [] as string[],
      };

      // Get email details for processing
      const { data: emails, error: fetchError } = await supabase
        .from("email_messages")
        .select("id, category_id, microsoft_message_id")
        .in("id", emailIds);

      if (fetchError) throw fetchError;

      // Process each email
      for (const email of emails || []) {
        if (!email.category_id) continue;

        try {
          const response = await supabase.functions.invoke("process-email-rules", {
            body: {
              email_id: email.id,
              category_id: email.category_id,
              workspace_id: workspaceId,
              microsoft_message_id: email.microsoft_message_id,
            },
          });

          if (response.error) {
            results.errors.push(`Email ${email.id}: ${response.error.message}`);
          } else {
            results.processed++;
          }
        } catch (error) {
          results.errors.push(`Email ${email.id}: ${error instanceof Error ? error.message : "Unknown error"}`);
        }
      }

      return results;
    },
    onSuccess: (results) => {
      queryClient.invalidateQueries({ queryKey: ["review-queue", workspaceId] });
      toast({
        title: "Processing complete",
        description: `${results.processed} email(s) processed. ${results.errors.length > 0 ? `${results.errors.length} error(s).` : ""}`,
      });
    },
    onError: (error) => {
      toast({
        title: "Error processing emails",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    pendingEmails,
    isLoadingEmails,
    refetchEmails,
    categories,
    autoProcessEnabled: workspaceSettings?.auto_process_emails ?? true,
    isLoadingSettings,
    updateAutoProcess: updateAutoProcessMutation.mutate,
    isUpdatingAutoProcess: updateAutoProcessMutation.isPending,
    updateCategory: updateCategoryMutation.mutate,
    isUpdatingCategory: updateCategoryMutation.isPending,
    processEmails: processEmailsMutation.mutate,
    isProcessing: processEmailsMutation.isPending,
  };
}

// Hook to get pending count for sidebar badge
export function usePendingEmailCount() {
  const { workspaceId } = useWorkspace();

  const { data: count = 0 } = useQuery({
    queryKey: ["pending-email-count", workspaceId],
    queryFn: async () => {
      if (!workspaceId) return 0;

      const { count, error } = await supabase
        .from("email_messages")
        .select("*", { count: "exact", head: true })
        .eq("workspace_id", workspaceId)
        .not("category_id", "is", null)
        .eq("is_processed", false);

      if (error) return 0;
      return count || 0;
    },
    enabled: !!workspaceId,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  return count;
}
