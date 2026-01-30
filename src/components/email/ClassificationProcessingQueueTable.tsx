import { useState } from "react";
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
import { Brain, Loader2, User, Bot, HelpCircle, Eye, RotateCw } from "lucide-react";
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
  { value: "expense_suppliers", label: "Expense Suppliers" },
  { value: "product_suppliers", label: "Product Suppliers" },
  { value: "influencers", label: "Influencers" },
  { value: "resellers", label: "Resellers" },
  { value: "corporate_management", label: "Corporate Management" },
  { value: "personal_contacts", label: "Personal Contacts" },
  { value: "marketing_sources", label: "Marketing Sources" },
];

interface ClassificationProcessingQueueTableProps {
  emails: ClassificationQueueEmail[];
  selectedIds: Set<string>;
  onSelectionChange: (ids: Set<string>) => void;
  isClassifying: boolean;
  onUpdateIsPerson?: (emailId: string, isPerson: boolean | null) => void;
  onSendToRules?: (emailIds: string[], entityTable: string) => void;
  isSendingToRules?: boolean;
  // Track selected entity types per email (managed by parent)
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
            <TableHead>Sender Type</TableHead>
            <TableHead>Entity Type</TableHead>
            <TableHead className="w-[80px]">Ready</TableHead>
            <TableHead className="w-[100px]">Date</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {emails.map((email) => {
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
                <TableCell>
                  <Select
                    value={selectedEntityType}
                    onValueChange={(value) => onEntityTypeChange?.(email.id, value)}
                    disabled={isClassifying || isSendingToRules}
                  >
                    <SelectTrigger className="w-[160px] h-8">
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
                <TableCell>
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
      
      <ClassificationLogDialog
        emailId={selectedEmailForLog?.id || null}
        emailSubject={selectedEmailForLog?.subject || null}
        open={!!selectedEmailForLog}
        onOpenChange={(open) => !open && setSelectedEmailForLog(null)}
      />
    </div>
  );
}
