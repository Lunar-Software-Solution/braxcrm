import { Search, RefreshCw, Brain, Play } from "lucide-react";
import { useState, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { ClassificationProcessingQueueTable } from "@/components/email/ClassificationProcessingQueueTable";
import { useClassificationProcessingQueue } from "@/hooks/use-classification-processing-queue";
import { Skeleton } from "@/components/ui/skeleton";

export default function ClassificationProcessingQueue() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectedEntityTypes, setSelectedEntityTypes] = useState<Map<string, string>>(new Map());

  const {
    pendingEmails,
    isLoadingEmails,
    refetchEmails,
    classifyEmails,
    isClassifying,
    updateIsPerson,
    sendToRules,
    isSendingToRules,
  } = useClassificationProcessingQueue();

  // Filter emails by search query
  const filteredEmails = pendingEmails.filter((email) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      email.subject?.toLowerCase().includes(query) ||
      email.body_preview?.toLowerCase().includes(query) ||
      email.person?.name.toLowerCase().includes(query) ||
      email.person?.email.toLowerCase().includes(query)
    );
  });

  const handleClassifySelected = async () => {
    if (selectedIds.size === 0) return;
    try {
      const results = await classifyEmails(Array.from(selectedIds));
      // Auto-populate entity type dropdowns with AI suggestions
      if (results?.suggestions) {
        Object.entries(results.suggestions).forEach(([emailId, entityTable]) => {
          handleEntityTypeChange(emailId, entityTable);
        });
      }
    } catch (error) {
      // Error already handled by mutation
    }
    setSelectedIds(new Set());
  };

  const handleClassifyAll = async () => {
    const allIds = filteredEmails.map((e) => e.id);
    try {
      const results = await classifyEmails(allIds);
      // Auto-populate entity type dropdowns with AI suggestions
      if (results?.suggestions) {
        Object.entries(results.suggestions).forEach(([emailId, entityTable]) => {
          handleEntityTypeChange(emailId, entityTable);
        });
      }
    } catch (error) {
      // Error already handled by mutation
    }
    setSelectedIds(new Set());
  };

  const handleEntityTypeChange = useCallback((emailId: string, entityTable: string | null) => {
    setSelectedEntityTypes((prev) => {
      const next = new Map(prev);
      if (entityTable) {
        next.set(emailId, entityTable);
      } else {
        next.delete(emailId);
      }
      return next;
    });
  }, []);

  const handleSendToRulesSelected = () => {
    // Get emails that are both selected AND have an entity type chosen
    const emailsToSend: Map<string, string[]> = new Map();
    
    selectedIds.forEach((id) => {
      const entityType = selectedEntityTypes.get(id);
      if (entityType) {
        const existing = emailsToSend.get(entityType) || [];
        existing.push(id);
        emailsToSend.set(entityType, existing);
      }
    });

    // Send each group by entity type
    emailsToSend.forEach((emailIds, entityTable) => {
      sendToRules({ emailIds, entityTable });
    });

    // Clear selections for sent emails
    const sentIds = new Set(Array.from(emailsToSend.values()).flat());
    setSelectedIds((prev) => {
      const next = new Set(prev);
      sentIds.forEach((id) => next.delete(id));
      return next;
    });
    setSelectedEntityTypes((prev) => {
      const next = new Map(prev);
      sentIds.forEach((id) => next.delete(id));
      return next;
    });
  };

  // Count selected emails that have an entity type assigned
  const readyToSendCount = Array.from(selectedIds).filter(
    (id) => selectedEntityTypes.has(id)
  ).length;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex items-center justify-between px-6 py-4">
          <div>
            <h1 className="text-2xl font-semibold">Email Classification Processing Queue</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Select emails to classify with AI to determine entity type
            </p>
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex items-center justify-between px-6 py-3 border-t">
          <div className="flex items-center gap-2 flex-1 max-w-md">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search emails..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9"
            />
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetchEmails()}
              disabled={isLoadingEmails}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoadingEmails ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleClassifySelected}
              disabled={selectedIds.size === 0 || isClassifying}
            >
              <Brain className="h-4 w-4 mr-2" />
              Classify Selected ({selectedIds.size})
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleSendToRulesSelected}
              disabled={readyToSendCount === 0 || isSendingToRules}
            >
              <Play className="h-4 w-4 mr-2" />
              Send to Rules ({readyToSendCount})
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  size="sm"
                  disabled={filteredEmails.length === 0 || isClassifying}
                >
                  <Brain className="h-4 w-4 mr-2" />
                  Classify All ({filteredEmails.length})
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Classify All Emails</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will run AI classification on all {filteredEmails.length} emails
                    to determine their entity type. This may take some time.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleClassifyAll}>
                    Classify All
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {isLoadingEmails ? (
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : (
          <ClassificationProcessingQueueTable
            emails={filteredEmails}
            selectedIds={selectedIds}
            onSelectionChange={setSelectedIds}
            isClassifying={isClassifying}
            onUpdateIsPerson={(emailId, isPerson) => updateIsPerson({ emailId, isPerson })}
            onSendToRules={(emailIds, entityTable) => sendToRules({ emailIds, entityTable })}
            isSendingToRules={isSendingToRules}
            selectedEntityTypes={selectedEntityTypes}
            onEntityTypeChange={handleEntityTypeChange}
            onRetryClassification={async (emailId) => {
              try {
                const results = await classifyEmails([emailId]);
                if (results?.suggestions) {
                  Object.entries(results.suggestions).forEach(([id, entityTable]) => {
                    handleEntityTypeChange(id, entityTable);
                  });
                }
              } catch (error) {
                // Error handled by mutation
              }
            }}
          />
        )}
      </div>

      {/* Footer */}
      <div className="border-t px-6 py-3 text-sm text-muted-foreground">
        Showing {filteredEmails.length} email{filteredEmails.length !== 1 ? "s" : ""} awaiting classification
        {isClassifying && " • Classifying..."}
        {isSendingToRules && " • Sending to rules..."}
      </div>
    </div>
  );
}
