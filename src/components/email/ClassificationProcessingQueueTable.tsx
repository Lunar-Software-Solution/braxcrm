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
import type { ClassificationQueueEmail } from "@/hooks/use-classification-processing-queue";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Brain, Loader2 } from "lucide-react";

interface ClassificationProcessingQueueTableProps {
  emails: ClassificationQueueEmail[];
  selectedIds: Set<string>;
  onSelectionChange: (ids: Set<string>) => void;
  isClassifying: boolean;
}

export function ClassificationProcessingQueueTable({
  emails,
  selectedIds = new Set(),
  onSelectionChange,
  isClassifying,
}: ClassificationProcessingQueueTableProps) {
  const safeSelectedIds = selectedIds ?? new Set<string>();
  const allSelected = emails.length > 0 && safeSelectedIds.size === emails.length;
  const someSelected = safeSelectedIds.size > 0 && safeSelectedIds.size < emails.length;

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      onSelectionChange(new Set(emails.map((e) => e.id)));
    } else {
      onSelectionChange(new Set());
    }
  };

  const handleSelectOne = (emailId: string, checked: boolean) => {
    const newSelection = new Set(safeSelectedIds);
    if (checked) {
      newSelection.add(emailId);
    } else {
      newSelection.delete(emailId);
    }
    onSelectionChange(newSelection);
  };

  // Helper to get sender display info
  const getSenderDisplay = (email: ClassificationQueueEmail) => {
    if (email.sender) {
      return {
        name: email.sender.display_name || email.sender.email?.split('@')[0] || "Unknown",
        email: email.sender.email || "",
      };
    }
    if (email.person) {
      return {
        name: email.person.name || "Unknown",
        email: email.person.email || "",
      };
    }
    return {
      name: email.sender_name || "Unknown",
      email: email.sender_email || "",
    };
  };

  if (emails.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>No emails awaiting classification.</p>
        <p className="text-sm mt-1">
          New emails will appear here until they are classified by AI.
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
                disabled={isClassifying}
              />
            </TableHead>
            <TableHead>Sender</TableHead>
            <TableHead className="min-w-[200px]">Subject</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="w-[100px]">Date</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {emails.map((email) => {
            const senderDisplay = getSenderDisplay(email);
            return (
              <TableRow
                key={email.id}
                className={cn(
                  safeSelectedIds.has(email.id) && "bg-muted/50",
                  isClassifying && safeSelectedIds.has(email.id) && "animate-pulse"
                )}
              >
                <TableCell>
                  <Checkbox
                    checked={safeSelectedIds.has(email.id)}
                    onCheckedChange={(checked) =>
                      handleSelectOne(email.id, checked as boolean)
                    }
                    aria-label={`Select email: ${email.subject}`}
                    disabled={isClassifying}
                  />
                </TableCell>
                <TableCell>
                  <div className="flex flex-col">
                    <span className="font-medium truncate max-w-[150px]">
                      {senderDisplay.name}
                    </span>
                    <span className="text-xs text-muted-foreground truncate max-w-[150px]">
                      {senderDisplay.email}
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
                  {isClassifying && safeSelectedIds.has(email.id) ? (
                    <Badge variant="secondary" className="gap-1.5 text-primary">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Classifying...
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="gap-1.5 text-muted-foreground">
                      <Brain className="h-3 w-3" />
                      Awaiting Classification
                    </Badge>
                  )}
                </TableCell>
                <TableCell>
                  <span className="text-sm text-muted-foreground">
                    {format(new Date(email.received_at), "MMM d")}
                  </span>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
