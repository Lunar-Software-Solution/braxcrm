import { useState } from "react";
import { useImportEvents, useImportEventMutations, usePendingImportCount } from "@/hooks/use-import-events";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { RefreshCw, Eye, Play, Trash2, User, Bot } from "lucide-react";
import { format } from "date-fns";
import type { ImportEvent } from "@/types/imports";

const ENTITY_TABLES = [
  { value: "affiliates", label: "Affiliates" },
  { value: "resellers", label: "Resellers" },
  { value: "product_suppliers", label: "Product Suppliers" },
  { value: "services_suppliers", label: "Services Suppliers" },
  { value: "corporate_management", label: "Corporate Management" },
  { value: "personal_contacts", label: "Personal Contacts" },
  { value: "subscriptions", label: "Subscriptions" },
  { value: "marketing_sources", label: "Marketing Sources" },
  { value: "merchant_accounts", label: "Merchant Accounts" },
  { value: "logistic_suppliers", label: "Logistic Suppliers" },
];

export default function ImportProcessingQueue() {
  const { events, isLoading, refetch } = useImportEvents("pending");
  const { updateEvent, prepareForRules, processRules, deleteEvent } = useImportEventMutations();
  const pendingCount = usePendingImportCount();
  
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [viewingEvent, setViewingEvent] = useState<ImportEvent | null>(null);

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const selectAll = () => {
    if (selectedIds.size === (events?.length || 0)) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(events?.map(e => e.id) || []));
    }
  };

  const handleEntityChange = (eventId: string, entityTable: string) => {
    updateEvent.mutate({ id: eventId, entity_table: entityTable });
  };

  const handleIsPersonToggle = (eventId: string, isPerson: boolean) => {
    updateEvent.mutate({ id: eventId, is_person: isPerson });
  };

  const handleProcessSelected = () => {
    const selectedEvents = events?.filter(e => selectedIds.has(e.id)) || [];
    
    // Group by entity_table
    const byEntityTable = selectedEvents.reduce((acc, event) => {
      const table = event.entity_table || "subscriptions";
      if (!acc[table]) acc[table] = [];
      acc[table].push(event.id);
      return acc;
    }, {} as Record<string, string[]>);

    // Process each group
    Object.entries(byEntityTable).forEach(([entityTable, eventIds]) => {
      prepareForRules.mutate({ eventIds, entityTable });
    });

    setSelectedIds(new Set());
  };

  const handleProcessSingle = async (event: ImportEvent) => {
    const entityTable = event.entity_table || "subscriptions";
    
    // First prepare, then process rules
    await prepareForRules.mutateAsync({ eventIds: [event.id], entityTable });
    await processRules.mutateAsync({ eventId: event.id, entityTable });
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Import Processing Queue</h1>
          <p className="text-muted-foreground">
            {pendingCount} pending import events
          </p>
        </div>
        <div className="flex items-center gap-2">
          {selectedIds.size > 0 && (
            <Button onClick={handleProcessSelected} disabled={prepareForRules.isPending}>
              <Play className="h-4 w-4 mr-2" />
              Process Selected ({selectedIds.size})
            </Button>
          )}
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
              <TableHead className="w-12">
                <Checkbox
                  checked={selectedIds.size === (events?.length || 0) && events?.length > 0}
                  onCheckedChange={selectAll}
                />
              </TableHead>
              <TableHead>Source</TableHead>
              <TableHead>Event Type</TableHead>
              <TableHead>Entity Type</TableHead>
              <TableHead>Is Person</TableHead>
              <TableHead>Received</TableHead>
              <TableHead className="w-32">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">
                  Loading...
                </TableCell>
              </TableRow>
            ) : events?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  No pending import events
                </TableCell>
              </TableRow>
            ) : (
              events?.map((event) => (
                <TableRow key={event.id}>
                  <TableCell>
                    <Checkbox
                      checked={selectedIds.has(event.id)}
                      onCheckedChange={() => toggleSelect(event.id)}
                    />
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {(event.endpoint as any)?.name || "Unknown"}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono text-sm">
                    {event.event_type}
                  </TableCell>
                  <TableCell>
                    <Select
                      value={event.entity_table || ""}
                      onValueChange={(value) => handleEntityChange(event.id, value)}
                    >
                      <SelectTrigger className="w-40">
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        {ENTITY_TABLES.map((table) => (
                          <SelectItem key={table.value} value={table.value}>
                            {table.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant={event.is_person ? "default" : "outline"}
                      size="sm"
                      onClick={() => handleIsPersonToggle(event.id, !event.is_person)}
                    >
                      {event.is_person ? (
                        <><User className="h-4 w-4 mr-1" /> Person</>
                      ) : (
                        <><Bot className="h-4 w-4 mr-1" /> Automated</>
                      )}
                    </Button>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {format(new Date(event.created_at), "MMM d, HH:mm")}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setViewingEvent(event)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleProcessSingle(event)}
                        disabled={!event.entity_table}
                      >
                        <Play className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteEvent.mutate(event.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Payload View Dialog */}
      <Dialog open={!!viewingEvent} onOpenChange={() => setViewingEvent(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Import Payload</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh]">
            <pre className="text-sm bg-muted p-4 rounded-lg overflow-auto">
              {JSON.stringify(viewingEvent?.payload, null, 2)}
            </pre>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}
