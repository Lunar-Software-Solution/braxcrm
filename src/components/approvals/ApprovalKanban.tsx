import { useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { ApprovalEntityCard } from "./ApprovalEntityCard";
import type { EntityWithStatus, EntityStatus } from "@/types/approvals";
import { entityStatusLabels } from "@/types/approvals";
import { cn } from "@/lib/utils";

interface ApprovalKanbanProps {
  entitiesByStatus: Record<EntityStatus, EntityWithStatus[]>;
  entityColor: string;
  selectedEntityId: string | null;
  onSelectEntity: (entity: EntityWithStatus) => void;
  onMoveEntity?: (entityId: string, newStatus: EntityStatus) => void;
}

const statusColumns: EntityStatus[] = ["draft", "pending", "under_review", "approved", "rejected"];

export function ApprovalKanban({
  entitiesByStatus,
  entityColor,
  selectedEntityId,
  onSelectEntity,
  onMoveEntity,
}: ApprovalKanbanProps) {
  const [dragOverStatus, setDragOverStatus] = useState<EntityStatus | null>(null);

  const handleDragOver = (e: React.DragEvent, status: EntityStatus) => {
    e.preventDefault();
    setDragOverStatus(status);
  };

  const handleDragLeave = () => {
    setDragOverStatus(null);
  };

  const handleDrop = (e: React.DragEvent, status: EntityStatus) => {
    e.preventDefault();
    const entityId = e.dataTransfer.getData("entityId");
    const currentStatus = e.dataTransfer.getData("currentStatus") as EntityStatus;
    setDragOverStatus(null);
    
    if (entityId && currentStatus !== status && onMoveEntity) {
      onMoveEntity(entityId, status);
    }
  };

  return (
    <div className="h-full overflow-x-auto">
      <div className="flex h-full min-w-max divide-x">
        {statusColumns.map((status) => {
          const entities = entitiesByStatus[status] || [];
          return (
            <div
              key={status}
              className={cn(
                "w-72 flex flex-col transition-colors",
                dragOverStatus === status && "bg-accent/50"
              )}
              onDragOver={(e) => handleDragOver(e, status)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, status)}
            >
              <div className="p-3 border-b bg-muted/30">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">
                      {entityStatusLabels[status]}
                    </span>
                    <Badge variant="secondary">{entities.length}</Badge>
                  </div>
                </div>
              </div>
              <ScrollArea className="flex-1 p-3">
                <div className="space-y-3">
                  {entities.map((entity) => (
                    <ApprovalEntityCard
                      key={entity.id}
                      entity={entity}
                      color={entityColor}
                      onClick={() => onSelectEntity(entity)}
                      isSelected={selectedEntityId === entity.id}
                      draggable
                    />
                  ))}
                  {entities.length === 0 && (
                    <div className="text-center py-8 text-sm text-muted-foreground">
                      No entities
                    </div>
                  )}
                </div>
              </ScrollArea>
            </div>
          );
        })}
      </div>
    </div>
  );
}
