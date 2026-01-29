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
import { Badge } from "@/components/ui/badge";
import { CategorySelector } from "./CategorySelector";
import type { ReviewQueueEmail, EmailCategory } from "@/hooks/use-review-queue";
import { cn } from "@/lib/utils";

interface ReviewQueueTableProps {
  emails: ReviewQueueEmail[];
  categories: EmailCategory[];
  selectedIds: Set<string>;
  onSelectionChange: (ids: Set<string>) => void;
  onCategoryChange: (emailId: string, categoryId: string) => void;
  isUpdatingCategory: boolean;
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

export function ReviewQueueTable({
  emails,
  categories,
  selectedIds,
  onSelectionChange,
  onCategoryChange,
  isUpdatingCategory,
}: ReviewQueueTableProps) {
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
        <p>No emails pending review.</p>
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
            <TableHead>Category</TableHead>
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
                <CategorySelector
                  categories={categories}
                  selectedCategoryId={email.category_id}
                  onSelect={(categoryId) => onCategoryChange(email.id, categoryId)}
                  disabled={isUpdatingCategory}
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
