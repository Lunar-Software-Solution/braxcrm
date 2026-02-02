import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";
import { ApprovalKanban } from "@/components/approvals/ApprovalKanban";
import { ApprovalDetailPanel } from "@/components/approvals/ApprovalDetailPanel";
import { useEntityApprovals } from "@/hooks/use-entity-approvals";
import { useToast } from "@/hooks/use-toast";
import type { EntityType } from "@/types/entities";
import type { EntityWithStatus, EntityStatus } from "@/types/approvals";
import { entityStatusLabels, statusOrder } from "@/types/approvals";

const entityConfig: Record<EntityType, { label: string; color: string }> = {
  affiliates: { label: "Affiliates", color: "#ec4899" },
  vigile_partners: { label: "Vigile Partners", color: "#22c55e" },
  brax_distributors: { label: "Brax Distributors", color: "#7c3aed" },
  product_suppliers: { label: "Product Suppliers", color: "#3b82f6" },
  services_suppliers: { label: "Services Suppliers", color: "#f97316" },
  corporate_management: { label: "Corporate Management", color: "#0891b2" },
  personal_contacts: { label: "Personal Contacts", color: "#8b5cf6" },
  subscriptions: { label: "Subscriptions", color: "#f59e0b" },
  marketing_sources: { label: "Marketing Sources", color: "#64748b" },
  merchant_accounts: { label: "Merchant Accounts", color: "#10b981" },
  logistic_suppliers: { label: "Logistic Suppliers", color: "#06b6d4" },
};

export default function EntityApprovalQueue() {
  const { entityType } = useParams<{ entityType: string }>();
  const [selectedEntity, setSelectedEntity] = useState<EntityWithStatus | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const { toast } = useToast();

  const validEntityType = entityType as EntityType;
  const config = entityConfig[validEntityType];

  const {
    entities,
    entitiesByStatus,
    counts,
    isLoading,
    updateStatus,
    isUpdating,
  } = useEntityApprovals(validEntityType);

  if (!config) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-muted-foreground">Invalid entity type</p>
      </div>
    );
  }

  const handleUpdateStatus = async (
    status: EntityStatus,
    rejectionReason?: string
  ) => {
    if (!selectedEntity) return;
    try {
      await updateStatus({
        id: selectedEntity.id,
        status,
        rejectionReason,
      });
      toast({
        title: "Status updated",
        description: `${selectedEntity.name} moved to ${entityStatusLabels[status]}`,
      });
      // Update local state
      setSelectedEntity((prev) =>
        prev ? { ...prev, status, rejection_reason: rejectionReason || null } : null
      );
    } catch (error) {
      toast({
        title: "Failed to update status",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  const handleMoveEntity = async (entityId: string, newStatus: EntityStatus) => {
    const entity = entities.find((e) => e.id === entityId);
    if (!entity) return;
    
    try {
      await updateStatus({
        id: entityId,
        status: newStatus,
      });
      toast({
        title: "Status updated",
        description: `${entity.name} moved to ${entityStatusLabels[newStatus]}`,
      });
      // If this entity was selected, update its status in state
      if (selectedEntity?.id === entityId) {
        setSelectedEntity((prev) =>
          prev ? { ...prev, status: newStatus } : null
        );
      }
    } catch (error) {
      toast({
        title: "Failed to move entity",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  // Filter entities if a specific status is selected
  const filteredEntitiesByStatus =
    statusFilter === "all"
      ? entitiesByStatus
      : ({ [statusFilter]: entitiesByStatus[statusFilter as EntityStatus] || [] } as Record<
          EntityStatus,
          EntityWithStatus[]
        >);

  const pendingCount = counts.pending + counts.under_review;

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="border-b p-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/approvals">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-semibold">{config.label} Approvals</h1>
            <div className="flex gap-2 mt-1">
              <Badge variant="secondary">{counts.total} total</Badge>
              {pendingCount > 0 && (
                <Badge
                  variant="secondary"
                  className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                >
                  {pendingCount} pending review
                </Badge>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[150px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Filter" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {statusOrder.map((status) => (
                <SelectItem key={status} value={status}>
                  {entityStatusLabels[status]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {isLoading ? (
          <div className="h-full flex items-center justify-center">
            <p className="text-muted-foreground">Loading...</p>
          </div>
        ) : entities.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-8">
            <div
              className="h-12 w-12 rounded-full flex items-center justify-center mb-4"
              style={{ backgroundColor: config.color }}
            >
              <span className="text-white text-lg">0</span>
            </div>
            <h3 className="font-medium mb-1">No {config.label.toLowerCase()} yet</h3>
            <p className="text-sm text-muted-foreground">
              Entities will appear here when created from email or import queues
            </p>
          </div>
        ) : statusFilter !== "all" ? (
          <div className="p-4">
            <div className="grid gap-3 max-w-3xl">
              {(filteredEntitiesByStatus[statusFilter as EntityStatus] || []).map(
                (entity) => (
                  <div
                    key={entity.id}
                    className="border rounded-lg p-4 cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => setSelectedEntity(entity)}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{entity.name}</span>
                      <Badge variant="secondary">{entity.status}</Badge>
                    </div>
                    {entity.email && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {entity.email}
                      </p>
                    )}
                  </div>
                )
              )}
            </div>
          </div>
        ) : (
          <ResizablePanelGroup direction="horizontal" className="h-full">
            <ResizablePanel defaultSize={selectedEntity ? 70 : 100} minSize={50}>
              <ApprovalKanban
                entitiesByStatus={entitiesByStatus}
                entityColor={config.color}
                selectedEntityId={selectedEntity?.id || null}
                onSelectEntity={setSelectedEntity}
                onMoveEntity={handleMoveEntity}
              />
            </ResizablePanel>
            {selectedEntity && (
              <>
                <ResizableHandle withHandle />
                <ResizablePanel defaultSize={30} minSize={25} maxSize={50}>
                  <ApprovalDetailPanel
                    entity={selectedEntity}
                    entityColor={config.color}
                    onClose={() => setSelectedEntity(null)}
                    onUpdateStatus={handleUpdateStatus}
                    isUpdating={isUpdating}
                  />
                </ResizablePanel>
              </>
            )}
          </ResizablePanelGroup>
        )}
      </div>
    </div>
  );
}
