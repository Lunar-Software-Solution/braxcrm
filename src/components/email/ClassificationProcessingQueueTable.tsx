import { format } from "date-fns";
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

interface ClassificationProcessingQueueTableProps {
  emails: ClassificationQueueEmail[];
}

export function ClassificationProcessingQueueTable({
  emails,
}: ClassificationProcessingQueueTableProps) {
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
            <TableHead>Sender</TableHead>
            <TableHead className="min-w-[200px]">Subject</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="w-[100px]">Date</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {emails.map((email) => (
            <TableRow key={email.id}>
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
                <Badge variant="outline" className="text-muted-foreground">
                  Awaiting Classification
                </Badge>
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
