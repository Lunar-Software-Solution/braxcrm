import { Badge } from "@/components/ui/badge";
import { entityStatusLabels, entityStatusColors, type EntityStatus } from "@/types/approvals";
import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status: EntityStatus;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  return (
    <Badge
      variant="secondary"
      className={cn(entityStatusColors[status], "font-medium", className)}
    >
      {entityStatusLabels[status]}
    </Badge>
  );
}
