import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const ENTITY_JUNCTION_TABLES = [
  "email_influencers",
  "email_resellers",
  "email_product_suppliers",
  "email_expense_suppliers",
  "email_corporate_management",
  "email_personal_contacts",
  "email_subscriptions",
  "email_marketing_sources",
  "email_merchant_accounts",
  "email_logistic_suppliers",
] as const;

export function useReprocessEmails() {
  const queryClient = useQueryClient();

  const reprocessMutation = useMutation({
    mutationFn: async (emailIds: string[]) => {
      if (emailIds.length === 0) {
        throw new Error("No emails selected");
      }

      // 1. Delete from email_rule_logs
      const { error: ruleLogsError } = await supabase
        .from("email_rule_logs")
        .delete()
        .in("email_id", emailIds);

      if (ruleLogsError) {
        throw new Error(`Failed to clear rule logs: ${ruleLogsError.message}`);
      }

      // 2. Delete from all entity junction tables
      for (const table of ENTITY_JUNCTION_TABLES) {
        const { error } = await supabase
          .from(table)
          .delete()
          .in("email_id", emailIds);

        if (error) {
          console.error(`Failed to clear ${table}:`, error);
          // Continue with other tables even if one fails
        }
      }

      // 3. Delete from email_message_tags
      const { error: tagsError } = await supabase
        .from("email_message_tags")
        .delete()
        .in("email_id", emailIds);

      if (tagsError) {
        console.error("Failed to clear tags:", tagsError);
      }

      // 4. Update email_messages to reset is_processed
      const { error: updateError } = await supabase
        .from("email_messages")
        .update({ is_processed: false })
        .in("id", emailIds);

      if (updateError) {
        throw new Error(`Failed to reset emails: ${updateError.message}`);
      }

      return emailIds.length;
    },
    onSuccess: (count) => {
      toast.success(`${count} email(s) reset for reprocessing`);
      // Invalidate all relevant queries
      queryClient.invalidateQueries({ queryKey: ["rules-log"] });
      queryClient.invalidateQueries({ queryKey: ["pending-processing-log"] });
      queryClient.invalidateQueries({ queryKey: ["classification-log"] });
      queryClient.invalidateQueries({ queryKey: ["email-messages"] });
      queryClient.invalidateQueries({ queryKey: ["rules-processing-queue"] });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to reprocess emails");
    },
  });

  return {
    reprocessEmails: reprocessMutation.mutate,
    isReprocessing: reprocessMutation.isPending,
  };
}
