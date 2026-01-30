import { useImportEvents, useImportEventLogs } from "@/hooks/use-import-events";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { RefreshCw, Eye, CheckCircle, XCircle, Clock } from "lucide-react";
import { format } from "date-fns";
import { useState } from "react";
import type { ImportEvent, ImportEventStatus } from "@/types/imports";

const statusConfig: Record<ImportEventStatus, { label: string; color: string; icon: React.ReactNode }> = {
  pending: { label: "Pending", color: "bg-yellow-100 text-yellow-800", icon: <Clock className="h-3 w-3" /> },
  processing: { label: "Processing", color: "bg-blue-100 text-blue-800", icon: <RefreshCw className="h-3 w-3 animate-spin" /> },
  processed: { label: "Processed", color: "bg-green-100 text-green-800", icon: <CheckCircle className="h-3 w-3" /> },
  failed: { label: "Failed", color: "bg-red-100 text-red-800", icon: <XCircle className="h-3 w-3" /> },
};

export default function ImportLog() {
  const [statusFilter, setStatusFilter] = useState<ImportEventStatus | "all">("all");
  const { events, isLoading, refetch } = useImportEvents(statusFilter === "all" ? undefined : statusFilter);
  const [viewingEvent, setViewingEvent] = useState<ImportEvent | null>(null);

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Import Processing Log</h1>
          <p className="text-muted-foreground">
            View all import events and their processing history
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="processing">Processing</SelectItem>
              <SelectItem value="processed">Processed</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Status</TableHead>
              <TableHead>Source</TableHead>
              <TableHead>Event Type</TableHead>
              <TableHead>Entity</TableHead>
              <TableHead>Person</TableHead>
              <TableHead>Received</TableHead>
              <TableHead>Processed</TableHead>
              <TableHead className="w-20">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8">
                  Loading...
                </TableCell>
              </TableRow>
            ) : events?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  No webhook events found
                </TableCell>
              </TableRow>
            ) : (
              events?.map((event) => {
                const status = statusConfig[event.status];
                return (
                  <TableRow key={event.id}>
                    <TableCell>
                      <Badge className={status.color} variant="outline">
                        <span className="mr-1">{status.icon}</span>
                        {status.label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">
                        {(event.endpoint as any)?.name || "Unknown"}
                      </span>
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {event.event_type}
                    </TableCell>
                    <TableCell>
                      {event.entity_table ? (
                        <Badge variant="secondary">
                          {event.entity_table.replace(/_/g, " ")}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {event.person ? (
                        <span className="text-sm">{(event.person as any).name}</span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(event.created_at), "MMM d, HH:mm")}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {event.processed_at 
                        ? format(new Date(event.processed_at), "MMM d, HH:mm")
                        : "—"
                      }
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setViewingEvent(event)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Event Details Dialog */}
      <EventDetailsDialog 
        event={viewingEvent} 
        onClose={() => setViewingEvent(null)} 
      />
    </div>
  );
}

function EventDetailsDialog({ event, onClose }: { event: ImportEvent | null; onClose: () => void }) {
  const { logs, isLoading } = useImportEventLogs(event?.id || "");

  if (!event) return null;

  return (
    <Dialog open={!!event} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Event Details</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Event ID:</span>
              <p className="font-mono">{event.id}</p>
            </div>
            <div>
              <span className="text-muted-foreground">External ID:</span>
              <p className="font-mono">{event.external_id || "—"}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Status:</span>
              <p>{event.status}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Entity Table:</span>
              <p>{event.entity_table || "—"}</p>
            </div>
          </div>

          {event.error_message && (
            <div className="bg-destructive/10 text-destructive p-3 rounded-lg text-sm">
              <strong>Error:</strong> {event.error_message}
            </div>
          )}

          <div>
            <h4 className="font-medium mb-2">Payload</h4>
            <ScrollArea className="max-h-48">
              <pre className="text-xs bg-muted p-3 rounded-lg overflow-auto">
                {JSON.stringify(event.payload, null, 2)}
              </pre>
            </ScrollArea>
          </div>

          {logs && logs.length > 0 && (
            <div>
              <h4 className="font-medium mb-2">Processing Log</h4>
              <div className="space-y-2">
                {logs.map((log) => (
                  <div 
                    key={log.id} 
                    className={`p-2 rounded text-sm ${
                      log.success ? "bg-green-50" : "bg-red-50"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{log.action_type}</span>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(log.processed_at), "HH:mm:ss")}
                      </span>
                    </div>
                    {log.error_message && (
                      <p className="text-destructive text-xs mt-1">{log.error_message}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
