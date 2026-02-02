import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { EntityType } from "@/types/entities";
import type { EntityStatus, EntityWithStatus, EntityStatusCounts } from "@/types/approvals";
import { useAuth } from "@/contexts/AuthContext";

export function useEntityApprovals(entityType: EntityType) {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // List entities by status
  const listByStatusQuery = useQuery({
    queryKey: [entityType, "approvals"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from(entityType)
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as unknown as EntityWithStatus[];
    },
    enabled: !!user,
  });

  // Get counts by status
  const countsQuery = useQuery({
    queryKey: [entityType, "approval-counts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from(entityType)
        .select("status");
      if (error) throw error;

      const counts: EntityStatusCounts = {
        draft: 0,
        pending: 0,
        under_review: 0,
        approved: 0,
        rejected: 0,
        total: 0,
      };

      (data as unknown as { status: EntityStatus }[]).forEach((item) => {
        if (counts[item.status] !== undefined) {
          counts[item.status]++;
        }
        counts.total++;
      });

      return counts;
    },
    enabled: !!user,
  });

  // Update entity status
  const updateStatusMutation = useMutation({
    mutationFn: async ({
      id,
      status,
      rejectionReason,
    }: {
      id: string;
      status: EntityStatus;
      rejectionReason?: string;
    }) => {
      const updateData: Record<string, unknown> = {
        status,
        reviewed_by: user?.id,
        reviewed_at: new Date().toISOString(),
      };

      if (status === "rejected" && rejectionReason) {
        updateData.rejection_reason = rejectionReason;
      } else if (status !== "rejected") {
        updateData.rejection_reason = null;
      }

      const { data, error } = await supabase
        .from(entityType)
        .update(updateData)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data as unknown as EntityWithStatus;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [entityType] });
      queryClient.invalidateQueries({ queryKey: [entityType, "approvals"] });
      queryClient.invalidateQueries({ queryKey: [entityType, "approval-counts"] });
      queryClient.invalidateQueries({ queryKey: ["all-entity-approval-counts"] });
    },
  });

  // Group entities by status
  const entitiesByStatus = (listByStatusQuery.data || []).reduce(
    (acc, entity) => {
      if (!acc[entity.status]) {
        acc[entity.status] = [];
      }
      acc[entity.status].push(entity);
      return acc;
    },
    {} as Record<EntityStatus, EntityWithStatus[]>
  );

  return {
    entities: listByStatusQuery.data ?? [],
    entitiesByStatus,
    counts: countsQuery.data ?? {
      draft: 0,
      pending: 0,
      under_review: 0,
      approved: 0,
      rejected: 0,
      total: 0,
    },
    isLoading: listByStatusQuery.isLoading,
    isCountsLoading: countsQuery.isLoading,
    error: listByStatusQuery.error,
    updateStatus: updateStatusMutation.mutateAsync,
    isUpdating: updateStatusMutation.isPending,
  };
}

// Hook to get pending counts across all entity types
export function useAllEntityApprovalCounts() {
  const { user } = useAuth();

  const entityTypes: EntityType[] = [
    "affiliates",
    "vigile_partners",
    "brax_distributors",
    "product_suppliers",
    "services_suppliers",
    "corporate_management",
    "personal_contacts",
    "subscription_suppliers",
    "marketing_sources",
    "merchant_accounts",
    "logistic_suppliers",
  ];

  return useQuery({
    queryKey: ["all-entity-approval-counts"],
    queryFn: async () => {
      const results: Record<EntityType, EntityStatusCounts> = {} as Record<
        EntityType,
        EntityStatusCounts
      >;

      await Promise.all(
        entityTypes.map(async (entityType) => {
          const { data, error } = await supabase
            .from(entityType)
            .select("status");

          if (error) {
            results[entityType] = {
              draft: 0,
              pending: 0,
              under_review: 0,
              approved: 0,
              rejected: 0,
              total: 0,
            };
            return;
          }

          const counts: EntityStatusCounts = {
            draft: 0,
            pending: 0,
            under_review: 0,
            approved: 0,
            rejected: 0,
            total: 0,
          };

          (data as unknown as { status: EntityStatus }[]).forEach((item) => {
            if (counts[item.status] !== undefined) {
              counts[item.status]++;
            }
            counts.total++;
          });

          results[entityType] = counts;
        })
      );

      // Calculate total pending across all entities
      const totalPending = Object.values(results).reduce(
        (sum, counts) => sum + counts.pending + counts.under_review,
        0
      );

      return { byType: results, totalPending };
    },
    enabled: !!user,
    refetchInterval: 30000, // Refetch every 30 seconds
  });
}
