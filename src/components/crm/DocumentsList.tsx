import { useState } from "react";
import { FileText, FileCheck, Receipt, ClipboardList, FileSpreadsheet, File, Check, X, Clock, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatDistanceToNow } from "date-fns";
import { useEntityDocuments, useApproveDocument, useRejectDocument, useDeleteDocument } from "@/hooks/use-extracted-documents";
import type { ExtractedDocument, DocumentType, DocumentStatus } from "@/types/documents";

interface DocumentsListProps {
  entityTable: string;
  entityId: string;
}

const TYPE_ICONS: Record<DocumentType, typeof FileText> = {
  invoice: FileText,
  contract: FileCheck,
  receipt: Receipt,
  purchase_order: ClipboardList,
  statement: FileSpreadsheet,
  other: File,
};

const TYPE_LABELS: Record<DocumentType, string> = {
  invoice: "Invoice",
  contract: "Contract",
  receipt: "Receipt",
  purchase_order: "Purchase Order",
  statement: "Statement",
  other: "Other",
};

const STATUS_CONFIG: Record<DocumentStatus, { label: string; color: string; icon: typeof Clock }> = {
  pending: { label: "Pending", color: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20", icon: Clock },
  reviewed: { label: "Reviewed", color: "bg-blue-500/10 text-blue-600 border-blue-500/20", icon: Eye },
  approved: { label: "Approved", color: "bg-green-500/10 text-green-600 border-green-500/20", icon: Check },
  rejected: { label: "Rejected", color: "bg-red-500/10 text-red-600 border-red-500/20", icon: X },
};

export function DocumentsList({ entityTable, entityId }: DocumentsListProps) {
  const { data: documents, isLoading } = useEntityDocuments(entityTable, entityId);
  const approveDocument = useApproveDocument();
  const rejectDocument = useRejectDocument();
  const deleteDocument = useDeleteDocument();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [viewDocument, setViewDocument] = useState<ExtractedDocument | null>(null);

  if (isLoading) {
    return (
      <div className="p-4 space-y-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    );
  }

  if (!documents || documents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <File className="h-12 w-12 text-muted-foreground/50 mb-4" />
        <h3 className="font-medium text-lg mb-1">No documents yet</h3>
        <p className="text-sm text-muted-foreground max-w-sm">
          Documents extracted from emails and imports will appear here.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="p-4 space-y-3">
        {documents.map((doc) => (
          <DocumentCard
            key={doc.id}
            document={doc}
            onView={() => setViewDocument(doc)}
            onApprove={() => approveDocument.mutate(doc.id)}
            onReject={() => rejectDocument.mutate(doc.id)}
            onDelete={() => setDeleteId(doc.id)}
            isUpdating={approveDocument.isPending || rejectDocument.isPending}
          />
        ))}
      </div>

      {/* View Document Dialog */}
      <Dialog open={!!viewDocument} onOpenChange={() => setViewDocument(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{viewDocument?.title || "Document Details"}</DialogTitle>
          </DialogHeader>
          {viewDocument && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Badge variant="outline">
                  {TYPE_LABELS[viewDocument.document_type]}
                </Badge>
                <Badge variant="outline" className={STATUS_CONFIG[viewDocument.status].color}>
                  {STATUS_CONFIG[viewDocument.status].label}
                </Badge>
              </div>
              
              <div className="bg-muted/50 rounded-lg p-4">
                <h4 className="font-medium mb-2">Extracted Data</h4>
                <pre className="text-sm whitespace-pre-wrap overflow-x-auto">
                  {JSON.stringify(viewDocument.extracted_data, null, 2)}
                </pre>
              </div>

              {viewDocument.confidence && (
                <p className="text-sm text-muted-foreground">
                  Extraction confidence: {(viewDocument.confidence * 100).toFixed(0)}%
                </p>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Document</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this document? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteId) {
                  deleteDocument.mutate(deleteId);
                  setDeleteId(null);
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

interface DocumentCardProps {
  document: ExtractedDocument;
  onView: () => void;
  onApprove: () => void;
  onReject: () => void;
  onDelete: () => void;
  isUpdating: boolean;
}

function DocumentCard({ document, onView, onApprove, onReject, isUpdating }: DocumentCardProps) {
  const TypeIcon = TYPE_ICONS[document.document_type];
  const statusConfig = STATUS_CONFIG[document.status];

  return (
    <Card className="hover:shadow-sm transition-shadow cursor-pointer" onClick={onView}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
              <TypeIcon className="h-5 w-5 text-muted-foreground" />
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <Badge variant="outline" className="text-xs">
                  {TYPE_LABELS[document.document_type]}
                </Badge>
                <Badge variant="outline" className={`text-xs ${statusConfig.color}`}>
                  {statusConfig.label}
                </Badge>
              </div>

              <h4 className="font-medium truncate">
                {document.title || "Untitled Document"}
              </h4>

              <p className="text-xs text-muted-foreground mt-1">
                Extracted {formatDistanceToNow(new Date(document.created_at), { addSuffix: true })}
              </p>
            </div>
          </div>

          {document.status === "pending" && (
            <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
              <Button
                variant="ghost"
                size="icon"
                onClick={onApprove}
                disabled={isUpdating}
                className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50"
              >
                <Check className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={onReject}
                disabled={isUpdating}
                className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
