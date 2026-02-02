import { Mail, Phone, Calendar, ExternalLink } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { StatusBadge } from "./StatusBadge";
import type { EntityWithStatus } from "@/types/approvals";
import { formatDistanceToNow } from "date-fns";

interface ApprovalEntityCardProps {
  entity: EntityWithStatus;
  color: string;
  onClick: () => void;
  isSelected?: boolean;
  draggable?: boolean;
}

export function ApprovalEntityCard({
  entity,
  color,
  onClick,
  isSelected,
  draggable,
}: ApprovalEntityCardProps) {
  const getInitials = (name: string) =>
    name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData("entityId", entity.id);
    e.dataTransfer.setData("currentStatus", entity.status);
    e.dataTransfer.effectAllowed = "move";
  };

  return (
    <Card
      className={`cursor-pointer transition-all hover:shadow-md ${
        isSelected ? "ring-2 ring-primary" : ""
      } ${draggable ? "cursor-grab active:cursor-grabbing" : ""}`}
      onClick={onClick}
      draggable={draggable}
      onDragStart={handleDragStart}
    >
      <CardContent className="p-3">
        <div className="flex items-start gap-3">
          <Avatar className="h-10 w-10 flex-shrink-0">
            <AvatarImage src={entity.avatar_url || undefined} />
            <AvatarFallback
              className="text-xs text-white font-medium"
              style={{ backgroundColor: color }}
            >
              {getInitials(entity.name)}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <h4 className="font-medium text-sm truncate">{entity.name}</h4>
              <StatusBadge status={entity.status} className="flex-shrink-0 text-xs" />
            </div>

            <div className="mt-1 space-y-0.5 text-xs text-muted-foreground">
              {entity.email && (
                <div className="flex items-center gap-1 truncate">
                  <Mail className="h-3 w-3 flex-shrink-0" />
                  <span className="truncate">{entity.email}</span>
                </div>
              )}
              {entity.phone && (
                <div className="flex items-center gap-1">
                  <Phone className="h-3 w-3 flex-shrink-0" />
                  <span>{entity.phone}</span>
                </div>
              )}
            </div>

            <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                <span>
                  {formatDistanceToNow(new Date(entity.created_at), {
                    addSuffix: true,
                  })}
                </span>
              </div>
              {entity.source && entity.source !== "manual" && (
                <div className="flex items-center gap-1">
                  <ExternalLink className="h-3 w-3" />
                  <span className="capitalize">{entity.source}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
