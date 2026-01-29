import { Search, RefreshCw } from "lucide-react";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ClassificationProcessingQueueTable } from "@/components/email/ClassificationProcessingQueueTable";
import { useClassificationProcessingQueue } from "@/hooks/use-classification-processing-queue";
import { Skeleton } from "@/components/ui/skeleton";

export default function ClassificationProcessingQueue() {
  const [searchQuery, setSearchQuery] = useState("");

  const {
    pendingEmails,
    isLoadingEmails,
    refetchEmails,
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

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex items-center justify-between px-6 py-4">
          <div>
            <h1 className="text-2xl font-semibold">Email Classification Processing Queue</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Emails awaiting AI classification to determine entity type
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
          <ClassificationProcessingQueueTable emails={filteredEmails} />
        )}
      </div>

      {/* Footer */}
      <div className="border-t px-6 py-3 text-sm text-muted-foreground">
        Showing {filteredEmails.length} email{filteredEmails.length !== 1 ? "s" : ""} awaiting classification
      </div>
    </div>
  );
}
