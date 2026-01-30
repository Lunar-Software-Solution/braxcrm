import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useClassificationLog } from "@/hooks/use-classification-processing-queue";
import { Skeleton } from "@/components/ui/skeleton";
import { Brain, Clock, CheckCircle, XCircle, FileText, MessageSquare } from "lucide-react";

interface ClassificationLogDialogProps {
  emailId: string | null;
  emailSubject: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ClassificationLogDialog({
  emailId,
  emailSubject,
  open,
  onOpenChange,
}: ClassificationLogDialogProps) {
  const { data: log, isLoading } = useClassificationLog(open ? emailId : null);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            Classification Details
          </DialogTitle>
          <p className="text-sm text-muted-foreground truncate">
            {emailSubject || "(No subject)"}
          </p>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        ) : !log ? (
          <div className="text-center py-8 text-muted-foreground">
            <Brain className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No classification data available yet.</p>
            <p className="text-sm mt-1">Run classification to see AI details.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Summary Row */}
            <div className="flex flex-wrap items-center gap-3 p-3 bg-muted/50 rounded-lg">
              <Badge variant={log.success ? "default" : "destructive"} className="gap-1">
                {log.success ? (
                  <CheckCircle className="h-3 w-3" />
                ) : (
                  <XCircle className="h-3 w-3" />
                )}
                {log.success ? "Success" : "Failed"}
              </Badge>
              
              <Badge variant="outline" className="gap-1">
                <Brain className="h-3 w-3" />
                {log.source === "ai" ? "AI Classification" : log.source === "cache" ? "Cached" : log.source}
              </Badge>
              
              {log.entity_table && (
                <Badge variant="secondary">
                  {log.entity_table.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}
                </Badge>
              )}
              
              {log.confidence !== null && (
                <Badge variant="outline">
                  {Math.round(log.confidence * 100)}% confidence
                </Badge>
              )}
              
              {log.processing_time_ms !== null && (
                <Badge variant="outline" className="gap-1">
                  <Clock className="h-3 w-3" />
                  {log.processing_time_ms}ms
                </Badge>
              )}
              
              <span className="text-xs text-muted-foreground ml-auto">
                {format(new Date(log.created_at), "MMM d, yyyy HH:mm:ss")}
              </span>
            </div>

            {log.error_message && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive">
                <strong>Error:</strong> {log.error_message}
              </div>
            )}

            {log.ai_model && (
              <div className="text-sm text-muted-foreground">
                <strong>Model:</strong> {log.ai_model}
              </div>
            )}

            {/* AI Prompt and Response Tabs */}
            {(log.ai_prompt || log.ai_response) && (
              <Tabs defaultValue="prompt" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="prompt" className="gap-2">
                    <FileText className="h-4 w-4" />
                    AI Prompt
                  </TabsTrigger>
                  <TabsTrigger value="response" className="gap-2">
                    <MessageSquare className="h-4 w-4" />
                    AI Response
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="prompt" className="mt-3">
                  <ScrollArea className="h-[300px] w-full rounded-lg border bg-muted/30 p-4">
                    <pre className="text-sm whitespace-pre-wrap font-mono">
                      {log.ai_prompt || "No prompt recorded"}
                    </pre>
                  </ScrollArea>
                </TabsContent>
                
                <TabsContent value="response" className="mt-3">
                  <ScrollArea className="h-[300px] w-full rounded-lg border bg-muted/30 p-4">
                    <pre className="text-sm whitespace-pre-wrap font-mono">
                      {log.ai_response || "No response recorded"}
                    </pre>
                  </ScrollArea>
                </TabsContent>
              </Tabs>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
