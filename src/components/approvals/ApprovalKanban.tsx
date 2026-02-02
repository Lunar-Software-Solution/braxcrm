import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { ApprovalEntityCard } from "./ApprovalEntityCard";
import type { EntityWithStatus, EntityStatus } from "@/types/approvals";
import { entityStatusLabels, statusOrder } from "@/types/approvals";

interface ApprovalKanbanProps {
  entitiesByStatus: Record<EntityStatus, EntityWithStatus[]>;
  entityColor: string;
  selectedEntityId: string | null;
  onSelectEntity: (entity: EntityWithStatus) => void;
}

const statusColumns: EntityStatus[] = ["draft", "pending", "under_review", "approved", "rejected"];

export function ApprovalKanban({
  entitiesByStatus,
  entityColor,
  selectedEntityId,
  onSelectEntity,
}: ApprovalKanbanProps) {
  return (
    <div className="h-full overflow-x-auto">
      <div className="flex h-full min-w-max divide-x">
        {statusColumns.map((status) => {
          const entities = entitiesByStatus[status] || [];
          return (
            <div key={status} className="w-72 flex flex-col">
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
