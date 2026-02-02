import { useState } from "react";
import { FileText, Check, X, Clock, DollarSign, Calendar } from "lucide-react";
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
import { formatDistanceToNow, format } from "date-fns";
import { useEntityInvoices, useApproveInvoice, useRejectInvoice, useDeleteInvoice } from "@/hooks/use-extracted-invoices";
import type { ExtractedInvoice, InvoiceStatus } from "@/types/documents";

interface InvoicesListProps {
  entityTable: string;
  entityId: string;
}

const STATUS_CONFIG: Record<InvoiceStatus, { label: string; color: string; icon: typeof Clock }> = {
  pending: { label: "Pending", color: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20", icon: Clock },
  reviewed: { label: "Reviewed", color: "bg-blue-500/10 text-blue-600 border-blue-500/20", icon: FileText },
  approved: { label: "Approved", color: "bg-green-500/10 text-green-600 border-green-500/20", icon: Check },
  rejected: { label: "Rejected", color: "bg-red-500/10 text-red-600 border-red-500/20", icon: X },
};

function formatCurrency(amount: number | null, currency: string | null): string {
  if (amount === null) return "—";
  const currencyCode = currency || "USD";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currencyCode,
  }).format(amount);
}

export function InvoicesList({ entityTable, entityId }: InvoicesListProps) {
  const { data: invoices, isLoading } = useEntityInvoices(entityTable, entityId);
  const approveInvoice = useApproveInvoice();
  const rejectInvoice = useRejectInvoice();
  const deleteInvoice = useDeleteInvoice();
  const [deleteId, setDeleteId] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="p-4 space-y-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    );
  }

  if (!invoices || invoices.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <FileText className="h-12 w-12 text-muted-foreground/50 mb-4" />
        <h3 className="font-medium text-lg mb-1">No invoices yet</h3>
        <p className="text-sm text-muted-foreground max-w-sm">
          Invoices extracted from emails will appear here.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="p-4 space-y-3">
        {invoices.map((invoice) => (
          <InvoiceCard
            key={invoice.id}
            invoice={invoice}
            onApprove={() => approveInvoice.mutate(invoice.id)}
            onReject={() => rejectInvoice.mutate(invoice.id)}
            onDelete={() => setDeleteId(invoice.id)}
            isUpdating={approveInvoice.isPending || rejectInvoice.isPending}
          />
        ))}
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Invoice</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this invoice? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteId) {
                  deleteInvoice.mutate(deleteId);
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

interface InvoiceCardProps {
  invoice: ExtractedInvoice;
  onApprove: () => void;
  onReject: () => void;
  onDelete: () => void;
  isUpdating: boolean;
}

function InvoiceCard({ invoice, onApprove, onReject, onDelete, isUpdating }: InvoiceCardProps) {
  const statusConfig = STATUS_CONFIG[invoice.status];
  const StatusIcon = statusConfig.icon;

  return (
    <Card className="hover:shadow-sm transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="outline" className={statusConfig.color}>
                <StatusIcon className="h-3 w-3 mr-1" />
                {statusConfig.label}
              </Badge>
              {invoice.invoice_number && (
                <span className="text-sm font-medium text-muted-foreground">
                  #{invoice.invoice_number}
                </span>
              )}
            </div>

            <h4 className="font-medium truncate">
              {invoice.vendor_name || "Unknown Vendor"}
            </h4>

            <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <DollarSign className="h-3.5 w-3.5" />
                <span className="font-medium text-foreground">
                  {formatCurrency(invoice.amount, invoice.currency)}
                </span>
              </div>
              {invoice.due_date && (
                <div className="flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" />
                  <span>Due {format(new Date(invoice.due_date), "MMM d, yyyy")}</span>
                </div>
              )}
            </div>

            <p className="text-xs text-muted-foreground mt-2">
              Extracted {formatDistanceToNow(new Date(invoice.created_at), { addSuffix: true })}
            </p>
          </div>

          {invoice.status === "pending" && (
            <div className="flex items-center gap-1">
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
