import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { AutomationSendStatus } from "@/types/email-automation";

interface AutomationSendLogRow {
  id: string;
  automation_type: string;
  automation_id: string;
  enrollment_id: string | null;
  contact_type: string;
  contact_id: string;
  contact_email: string;
  template_id: string | null;
  subject: string;
  status: string;
  sent_at: string | null;
  error_message: string | null;
  microsoft_message_id: string | null;
  user_id: string;
  created_at: string;
}

export interface AutomationSendLogItem {
  id: string;
  automation_type: 'sequence' | 'trigger';
  automation_id: string;
  enrollment_id: string | null;
  contact_type: string;
  contact_id: string;
  contact_email: string;
  template_id: string | null;
  subject: string;
  status: AutomationSendStatus;
  sent_at: string | null;
  error_message: string | null;
  microsoft_message_id: string | null;
  user_id: string;
  created_at: string;
}

function mapLogRow(row: AutomationSendLogRow): AutomationSendLogItem {
  return {
    ...row,
    automation_type: row.automation_type as 'sequence' | 'trigger',
    status: row.status as AutomationSendStatus,
  };
}

export function useAutomationSendLog(filters?: {
  automationType?: 'sequence' | 'trigger';
  automationId?: string;
  status?: AutomationSendStatus;
  limit?: number;
}) {
  return useQuery({
    queryKey: ["automation-send-log", filters],
    queryFn: async (): Promise<AutomationSendLogItem[]> => {
      let query = supabase
        .from("automation_send_log")
        .select("*")
        .order("created_at", { ascending: false });

      if (filters?.automationType) {
        query = query.eq("automation_type", filters.automationType);
      }

      if (filters?.automationId) {
        query = query.eq("automation_id", filters.automationId);
      }

      if (filters?.status) {
        query = query.eq("status", filters.status);
      }

      if (filters?.limit) {
        query = query.limit(filters.limit);
      } else {
        query = query.limit(100);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []).map(mapLogRow);
    },
  });
}

export function useAutomationStats() {
  return useQuery({
    queryKey: ["automation-stats"],
    queryFn: async () => {
      // Get counts by status
      const { data: statusCounts, error: statusError } = await supabase
        .from("automation_send_log")
        .select("status")
        .gte("created_at", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

      if (statusError) throw statusError;

      const stats = {
        total: statusCounts?.length || 0,
        sent: 0,
        pending: 0,
        failed: 0,
        bounced: 0,
      };

      (statusCounts || []).forEach(log => {
        if (log.status === 'sent') stats.sent++;
        else if (log.status === 'pending') stats.pending++;
        else if (log.status === 'failed') stats.failed++;
        else if (log.status === 'bounced') stats.bounced++;
      });

      // Get active sequence count
      const { count: activeSequences } = await supabase
        .from("email_sequences")
        .select("*", { count: "exact", head: true })
        .eq("is_active", true);

      // Get active trigger count
      const { count: activeTriggers } = await supabase
        .from("email_triggers")
        .select("*", { count: "exact", head: true })
        .eq("is_active", true);

      // Get active enrollment count
      const { count: activeEnrollments } = await supabase
        .from("sequence_enrollments")
        .select("*", { count: "exact", head: true })
        .eq("status", "active");

      return {
        ...stats,
        activeSequences: activeSequences || 0,
        activeTriggers: activeTriggers || 0,
        activeEnrollments: activeEnrollments || 0,
      };
    },
  });
}
