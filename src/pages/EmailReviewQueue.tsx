import { useState } from "react";
import { Search, Play, RefreshCw } from "lucide-react";
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
import { ReviewQueueTable } from "@/components/email/ReviewQueueTable";
import { useReviewQueue } from "@/hooks/use-review-queue";
import { Skeleton } from "@/components/ui/skeleton";

export default function EmailReviewQueue() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const {
    pendingEmails,
    isLoadingEmails,
    refetchEmails,
    updateEntityType,
    isUpdatingEntityType,
    processEmails,
    isProcessing,
  } = useReviewQueue();

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

  const handleProcessSelected = () => {
    if (selectedIds.size === 0) return;
    processEmails(Array.from(selectedIds));
    setSelectedIds(new Set());
  };

  const handleProcessAll = () => {
    const allIds = filteredEmails.map((e) => e.id);
    processEmails(allIds);
    setSelectedIds(new Set());
  };

  const handleEntityTypeChange = (emailId: string, entityTable: string) => {
    updateEntityType({ emailId, entityTable });
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex items-center justify-between px-6 py-4">
          <div>
            <h1 className="text-2xl font-semibold">Review Queue</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Review AI-classified emails before processing automation rules
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
              onClick={handleProcessSelected}
              disabled={selectedIds.size === 0 || isProcessing}
            >
              <Play className="h-4 w-4 mr-2" />
              Process Selected ({selectedIds.size})
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  size="sm"
                  disabled={filteredEmails.length === 0 || isProcessing}
                >
                  <Play className="h-4 w-4 mr-2" />
                  Process All ({filteredEmails.length})
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Process All Emails</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will process all {filteredEmails.length} emails through their
                    assigned entity automation rules. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleProcessAll}>
                    Process All
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
          <ReviewQueueTable
            emails={filteredEmails}
            selectedIds={selectedIds}
            onSelectionChange={setSelectedIds}
            onEntityTypeChange={handleEntityTypeChange}
            isUpdatingEntityType={isUpdatingEntityType}
          />
        )}
      </div>

      {/* Footer */}
      <div className="border-t px-6 py-3 text-sm text-muted-foreground">
        Showing {filteredEmails.length} email{filteredEmails.length !== 1 ? "s" : ""} pending review
      </div>
    </div>
  );
}
