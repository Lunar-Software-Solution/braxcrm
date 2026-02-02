import { useState, useCallback, useRef, useEffect } from "react";
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
import { Brain, Loader2, User, Bot, HelpCircle, Eye, RotateCw, ArrowUp, ArrowDown, GripVertical } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { ClassificationLogDialog } from "./ClassificationLogDialog";

// Entity table options matching the CRM structure
const ENTITY_TABLE_OPTIONS = [
  { value: "subscriptions", label: "Subscriptions" },
  { value: "services_suppliers", label: "Services Suppliers" },
  { value: "product_suppliers", label: "Product Suppliers" },
  { value: "affiliates", label: "Affiliates" },
  { value: "resellers", label: "Resellers" },
  { value: "corporate_management", label: "Corporate Management" },
  { value: "personal_contacts", label: "Personal Contacts" },
  { value: "marketing_sources", label: "Marketing Sources" },
];

type SortField = "sender" | "subject" | "sender_type" | "date" | "confidence";
type SortDirection = "asc" | "desc";

interface ColumnConfig {
  id: string;
  label: string;
  field?: SortField;
  defaultWidth: number;
  minWidth: number;
  resizable: boolean;
  sortable: boolean;
}

const COLUMNS: ColumnConfig[] = [
  { id: "checkbox", label: "", defaultWidth: 48, minWidth: 48, resizable: false, sortable: false },
  { id: "sender", label: "Sender", field: "sender", defaultWidth: 180, minWidth: 100, resizable: true, sortable: true },
  { id: "subject", label: "Subject", field: "subject", defaultWidth: 300, minWidth: 150, resizable: true, sortable: true },
  { id: "sender_type", label: "Sender Type", field: "sender_type", defaultWidth: 180, minWidth: 140, resizable: true, sortable: true },
  { id: "entity_type", label: "Entity Type", defaultWidth: 180, minWidth: 140, resizable: true, sortable: false },
  { id: "ready", label: "Ready", defaultWidth: 80, minWidth: 60, resizable: false, sortable: false },
  { id: "date", label: "Date", field: "date", defaultWidth: 100, minWidth: 80, resizable: true, sortable: true },
];

interface ClassificationProcessingQueueTableProps {
  emails: ClassificationQueueEmail[];
  selectedIds: Set<string>;
  onSelectionChange: (ids: Set<string>) => void;
  isClassifying: boolean;
  onUpdateIsPerson?: (emailId: string, isPerson: boolean | null) => void;
  onSendToRules?: (emailIds: string[], entityTable: string) => void;
  isSendingToRules?: boolean;
  selectedEntityTypes?: Map<string, string>;
  onEntityTypeChange?: (emailId: string, entityTable: string | null) => void;
  onRetryClassification?: (emailId: string) => void;
}

export function ClassificationProcessingQueueTable({
  emails,
  selectedIds = new Set(),
  onSelectionChange,
  isClassifying,
  onUpdateIsPerson,
  onSendToRules,
  isSendingToRules,
  selectedEntityTypes = new Map(),
  onEntityTypeChange,
  onRetryClassification,
}: ClassificationProcessingQueueTableProps) {
  const [selectedEmailForLog, setSelectedEmailForLog] = useState<{ id: string; subject: string | null } | null>(null);
  const [sortField, setSortField] = useState<SortField | null>("date");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>(() => 
    Object.fromEntries(COLUMNS.map(col => [col.id, col.defaultWidth]))
  );
  const [resizingColumn, setResizingColumn] = useState<string | null>(null);
  const resizeStartX = useRef<number>(0);
  const resizeStartWidth = useRef<number>(0);

  const safeSelectedIds = selectedIds ?? new Set<string>();
  const allSelected = emails.length > 0 && safeSelectedIds.size === emails.length;
  const someSelected = safeSelectedIds.size > 0 && safeSelectedIds.size < emails.length;

  // Sorting logic
  const sortedEmails = [...emails].sort((a, b) => {
    if (!sortField) return 0;
    
    let aVal: string | number | null = null;
    let bVal: string | number | null = null;
    
    switch (sortField) {
      case "sender":
        aVal = a.sender?.display_name || a.person?.name || a.sender_name || "";
        bVal = b.sender?.display_name || b.person?.name || b.sender_name || "";
        break;
      case "subject":
        aVal = a.subject || "";
        bVal = b.subject || "";
        break;
      case "sender_type":
        aVal = a.is_person === true ? 1 : a.is_person === false ? 2 : 0;
        bVal = b.is_person === true ? 1 : b.is_person === false ? 2 : 0;
        break;
      case "date":
        aVal = new Date(a.received_at).getTime();
        bVal = new Date(b.received_at).getTime();
        break;
      case "confidence":
        aVal = a.ai_confidence ?? -1;
        bVal = b.ai_confidence ?? -1;
        break;
    }
    
    if (typeof aVal === "string" && typeof bVal === "string") {
      return sortDirection === "asc" 
        ? aVal.localeCompare(bVal)
        : bVal.localeCompare(aVal);
    }
    
    if (typeof aVal === "number" && typeof bVal === "number") {
      return sortDirection === "asc" ? aVal - bVal : bVal - aVal;
    }
    
    return 0;
  });

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  // Column resize handlers
  const handleResizeStart = useCallback((e: React.MouseEvent, columnId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setResizingColumn(columnId);
    resizeStartX.current = e.clientX;
    resizeStartWidth.current = columnWidths[columnId];
  }, [columnWidths]);

  useEffect(() => {
    if (!resizingColumn) return;

    const handleMouseMove = (e: MouseEvent) => {
      const column = COLUMNS.find(c => c.id === resizingColumn);
      if (!column) return;
      
      const delta = e.clientX - resizeStartX.current;
      const newWidth = Math.max(column.minWidth, resizeStartWidth.current + delta);
      
      setColumnWidths(prev => ({
        ...prev,
        [resizingColumn]: newWidth,
      }));
    };

    const handleMouseUp = () => {
      setResizingColumn(null);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [resizingColumn]);

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

  const getIsPersonValue = (isPerson: boolean | null): string => {
    if (isPerson === true) return "person";
    if (isPerson === false) return "automated";
    return "unknown";
  };

  const handleIsPersonChange = (emailId: string, value: string) => {
    if (!onUpdateIsPerson) return;
    
    if (value === "person") {
      onUpdateIsPerson(emailId, true);
    } else if (value === "automated") {
      onUpdateIsPerson(emailId, false);
    } else {
      onUpdateIsPerson(emailId, null);
    }
  };

  const renderSortIcon = (field: SortField) => {
    if (sortField !== field) return null;
    return sortDirection === "asc" 
      ? <ArrowUp className="h-3 w-3 ml-1" />
      : <ArrowDown className="h-3 w-3 ml-1" />;
  };

  const renderResizeHandle = (columnId: string) => {
    const column = COLUMNS.find(c => c.id === columnId);
    if (!column?.resizable) return null;
    
    return (
      <div
        className={cn(
          "absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/50 group",
          resizingColumn === columnId && "bg-primary"
        )}
        onMouseDown={(e) => handleResizeStart(e, columnId)}
      >
        <div className="absolute right-0 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100">
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </div>
      </div>
    );
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
    <div className="border rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <Table style={{ tableLayout: "fixed" }}>
          <TableHeader>
            <TableRow>
              {/* Checkbox column */}
              <TableHead 
                style={{ width: columnWidths.checkbox }} 
                className="relative"
              >
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
              
              {/* Sender column */}
              <TableHead 
                style={{ width: columnWidths.sender }}
                className={cn("relative cursor-pointer select-none", resizingColumn && "select-none")}
                onClick={() => handleSort("sender")}
              >
                <div className="flex items-center">
                  Sender
                  {renderSortIcon("sender")}
                </div>
                {renderResizeHandle("sender")}
              </TableHead>
              
              {/* Subject column */}
              <TableHead 
                style={{ width: columnWidths.subject }}
                className={cn("relative cursor-pointer select-none", resizingColumn && "select-none")}
                onClick={() => handleSort("subject")}
              >
                <div className="flex items-center">
                  Subject
                  {renderSortIcon("subject")}
                </div>
                {renderResizeHandle("subject")}
              </TableHead>
              
              {/* Sender Type column */}
              <TableHead 
                style={{ width: columnWidths.sender_type }}
                className={cn("relative cursor-pointer select-none", resizingColumn && "select-none")}
                onClick={() => handleSort("sender_type")}
              >
                <div className="flex items-center">
                  Sender Type
                  {renderSortIcon("sender_type")}
                </div>
                {renderResizeHandle("sender_type")}
              </TableHead>
              
              {/* Entity Type column */}
              <TableHead 
                style={{ width: columnWidths.entity_type }}
                className="relative"
              >
                Entity Type
                {renderResizeHandle("entity_type")}
              </TableHead>
              
              {/* Ready column */}
              <TableHead 
                style={{ width: columnWidths.ready }}
                className="relative"
              >
                Ready
              </TableHead>
              
              {/* Date column */}
              <TableHead 
                style={{ width: columnWidths.date }}
                className={cn("relative cursor-pointer select-none", resizingColumn && "select-none")}
                onClick={() => handleSort("date")}
              >
                <div className="flex items-center">
                  Date
                  {renderSortIcon("date")}
                </div>
                {renderResizeHandle("date")}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedEmails.map((email) => {
              const senderDisplay = getSenderDisplay(email);
              const selectedEntityType = selectedEntityTypes.get(email.id) || "";
              const isReady = !!selectedEntityType;
              
              return (
                <TableRow
                  key={email.id}
                  className={cn(
                    safeSelectedIds.has(email.id) && "bg-muted/50",
                    isClassifying && safeSelectedIds.has(email.id) && "animate-pulse"
                  )}
                >
                  <TableCell style={{ width: columnWidths.checkbox }}>
                    <Checkbox
                      checked={safeSelectedIds.has(email.id)}
                      onCheckedChange={(checked) =>
                        handleSelectOne(email.id, checked as boolean)
                      }
                      aria-label={`Select email: ${email.subject}`}
                      disabled={isClassifying}
                    />
                  </TableCell>
                  <TableCell style={{ width: columnWidths.sender }}>
                    <div className="flex flex-col overflow-hidden">
                      <span className="font-medium truncate">
                        {senderDisplay.name}
                      </span>
                      <span className="text-xs text-muted-foreground truncate">
                        {senderDisplay.email}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell style={{ width: columnWidths.subject }}>
                    <div className="flex flex-col gap-1 overflow-hidden">
                      <span className="font-medium truncate">
                        {email.subject || "(No subject)"}
                      </span>
                      <span className="text-xs text-muted-foreground truncate">
                        {email.body_preview || ""}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell style={{ width: columnWidths.sender_type }}>
                    <Select
                      value={getIsPersonValue(email.is_person)}
                      onValueChange={(value) => handleIsPersonChange(email.id, value)}
                      disabled={isClassifying}
                    >
                      <SelectTrigger className="w-[140px] h-8">
                        <SelectValue>
                          <div className="flex items-center gap-1.5">
                            {email.is_person === true && (
                              <>
                                <User className="h-3.5 w-3.5 text-blue-500" />
                                <span>Person</span>
                              </>
                            )}
                            {email.is_person === false && (
                              <>
                                <Bot className="h-3.5 w-3.5 text-orange-500" />
                                <span>Automated</span>
                              </>
                            )}
                            {email.is_person === null && (
                              <>
                                <HelpCircle className="h-3.5 w-3.5 text-muted-foreground" />
                                <span>Unknown</span>
                              </>
                            )}
                          </div>
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="person">
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-blue-500" />
                            <span>Person</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="automated">
                          <div className="flex items-center gap-2">
                            <Bot className="h-4 w-4 text-orange-500" />
                            <span>Automated</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="unknown">
                          <div className="flex items-center gap-2">
                            <HelpCircle className="h-4 w-4 text-muted-foreground" />
                            <span>Unknown</span>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <div className="flex items-center gap-1 mt-1">
                      {email.ai_confidence !== null && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
                          onClick={() => setSelectedEmailForLog({ id: email.id, subject: email.subject })}
                        >
                          <Eye className="h-3 w-3 mr-1" />
                          {Math.round(email.ai_confidence * 100)}%
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
                        onClick={() => onRetryClassification?.(email.id)}
                        disabled={isClassifying}
                        title="Retry AI classification"
                      >
                        <RotateCw className={`h-3 w-3 ${isClassifying && safeSelectedIds.has(email.id) ? 'animate-spin' : ''}`} />
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell style={{ width: columnWidths.entity_type }}>
                    <Select
                      value={selectedEntityType}
                      onValueChange={(value) => onEntityTypeChange?.(email.id, value)}
                      disabled={isClassifying || isSendingToRules}
                    >
                      <SelectTrigger className="w-full h-8">
                        <SelectValue placeholder="Select type..." />
                      </SelectTrigger>
                      <SelectContent>
                        {ENTITY_TABLE_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell style={{ width: columnWidths.ready }}>
                    <Switch
                      checked={isReady}
                      onCheckedChange={(checked) => {
                        if (checked && selectedEntityType) {
                          onSendToRules?.([email.id], selectedEntityType);
                        } else if (!checked) {
                          onEntityTypeChange?.(email.id, null);
                        }
                      }}
                      disabled={!selectedEntityType || isClassifying || isSendingToRules}
                      aria-label="Ready for rules processing"
                    />
                  </TableCell>
                  <TableCell style={{ width: columnWidths.date }}>
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
      
      <ClassificationLogDialog
        emailId={selectedEmailForLog?.id || null}
        emailSubject={selectedEmailForLog?.subject || null}
        open={!!selectedEmailForLog}
        onOpenChange={(open) => !open && setSelectedEmailForLog(null)}
      />
    </div>
  );
}
