import { format } from "date-fns";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EntitySelector } from "./EntitySelector";
import type { RulesProcessingQueueEmail } from "@/hooks/use-rules-processing-queue";
import { cn } from "@/lib/utils";
import { ENTITY_AUTOMATION_CONFIG } from "@/types/entity-automation";
import * as LucideIcons from "lucide-react";

interface RulesProcessingQueueTableProps {
  emails: RulesProcessingQueueEmail[];
  selectedIds: Set<string>;
  onSelectionChange: (ids: Set<string>) => void;
  onEntityTypeChange: (emailId: string, entityTable: string) => void;
  isUpdatingEntityType: boolean;
}

function ConfidenceIndicator({ confidence }: { confidence: number | null }) {
  const value = confidence ?? 0;
  const percentage = Math.round(value * 100);

  let colorClass = "bg-destructive";
  if (percentage >= 80) {
    colorClass = "bg-green-500";
  } else if (percentage >= 50) {
    colorClass = "bg-yellow-500";
  }

  return (
    <div className="flex items-center gap-2">
      <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all", colorClass)}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <span className="text-xs text-muted-foreground w-8">{percentage}%</span>
    </div>
  );
}

function EntityTypeBadge({ entityTable }: { entityTable: string | null }) {
  if (!entityTable) return <span className="text-muted-foreground text-xs">Not classified</span>;
  
  const config = ENTITY_AUTOMATION_CONFIG[entityTable];
  if (!config) return <span className="text-xs">{entityTable}</span>;

  const Icon = LucideIcons[config.icon as keyof typeof LucideIcons] as React.ComponentType<{ className?: string; style?: React.CSSProperties }>;

  return (
    <div className="flex items-center gap-1.5">
      {Icon && <Icon className="h-3.5 w-3.5" style={{ color: config.color }} />}
      <span className="text-xs font-medium">{config.label}</span>
    </div>
  );
}

export function RulesProcessingQueueTable({
  emails,
  selectedIds,
  onSelectionChange,
  onEntityTypeChange,
  isUpdatingEntityType,
}: RulesProcessingQueueTableProps) {
  const allSelected = emails.length > 0 && selectedIds.size === emails.length;
  const someSelected = selectedIds.size > 0 && selectedIds.size < emails.length;

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      onSelectionChange(new Set(emails.map((e) => e.id)));
    } else {
      onSelectionChange(new Set());
    }
  };

  const handleSelectOne = (emailId: string, checked: boolean) => {
    const newSelection = new Set(selectedIds);
    if (checked) {
      newSelection.add(emailId);
    } else {
      newSelection.delete(emailId);
    }
    onSelectionChange(newSelection);
  };

  if (emails.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>No emails pending processing.</p>
        <p className="text-sm mt-1">
          Emails that have been classified but not yet processed will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12">
              <Checkbox
                checked={allSelected}
                ref={(el) => {
                  if (el) {
                    (el as HTMLButtonElement & { indeterminate: boolean }).indeterminate = someSelected;
                  }
                }}
                onCheckedChange={handleSelectAll}
                aria-label="Select all"
              />
            </TableHead>
            <TableHead>Sender</TableHead>
            <TableHead className="min-w-[200px]">Subject</TableHead>
            <TableHead>Entity Type</TableHead>
            <TableHead className="w-[120px]">Confidence</TableHead>
            <TableHead className="w-[100px]">Date</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {emails.map((email) => (
            <TableRow
              key={email.id}
              className={cn(
                selectedIds.has(email.id) && "bg-muted/50"
              )}
            >
              <TableCell>
                <Checkbox
                  checked={selectedIds.has(email.id)}
                  onCheckedChange={(checked) =>
                    handleSelectOne(email.id, checked as boolean)
                  }
                  aria-label={`Select email: ${email.subject}`}
                />
              </TableCell>
              <TableCell>
                <div className="flex flex-col">
                  <span className="font-medium truncate max-w-[150px]">
                    {email.person?.name || "Unknown"}
                  </span>
                  <span className="text-xs text-muted-foreground truncate max-w-[150px]">
                    {email.person?.email || ""}
                  </span>
                </div>
              </TableCell>
              <TableCell>
                <div className="flex flex-col gap-1">
                  <span className="font-medium truncate max-w-[300px]">
                    {email.subject || "(No subject)"}
                  </span>
                  <span className="text-xs text-muted-foreground truncate max-w-[300px]">
                    {email.body_preview || ""}
                  </span>
                </div>
              </TableCell>
              <TableCell>
                <EntitySelector
                  selectedEntityTable={email.entity_table}
                  onSelect={(entityTable) => onEntityTypeChange(email.id, entityTable)}
                  disabled={isUpdatingEntityType}
                />
              </TableCell>
              <TableCell>
                <ConfidenceIndicator confidence={email.ai_confidence} />
              </TableCell>
              <TableCell>
                <span className="text-sm text-muted-foreground">
                  {format(new Date(email.received_at), "MMM d")}
                </span>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
