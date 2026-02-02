import { useState } from "react";
import { FileText, Search, Filter, Check, X, Clock, DollarSign, Building2, ChevronDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { format, formatDistanceToNow } from "date-fns";
import { useAllInvoices, useApproveInvoice, useRejectInvoice } from "@/hooks/use-extracted-invoices";
import { INVOICE_CAPABLE_ENTITIES } from "@/types/documents";
import type { ExtractedInvoice, InvoiceStatus } from "@/types/documents";

const STATUS_OPTIONS: { value: InvoiceStatus | "all"; label: string }[] = [
  { value: "all", label: "All Statuses" },
  { value: "pending", label: "Pending" },
  { value: "reviewed", label: "Reviewed" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
];

const STATUS_CONFIG: Record<InvoiceStatus, { label: string; color: string; icon: typeof Clock }> = {
  pending: { label: "Pending", color: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20", icon: Clock },
  reviewed: { label: "Reviewed", color: "bg-blue-500/10 text-blue-600 border-blue-500/20", icon: FileText },
  approved: { label: "Approved", color: "bg-green-500/10 text-green-600 border-green-500/20", icon: Check },
  rejected: { label: "Rejected", color: "bg-red-500/10 text-red-600 border-red-500/20", icon: X },
};

const ENTITY_LABELS: Record<string, string> = {
  product_suppliers: "Product Suppliers",
  services_suppliers: "Services Suppliers",
  corporate_management: "Corporate Management",
  subscription_suppliers: "Subscription Suppliers",
  merchant_accounts: "Merchant Accounts",
  logistic_suppliers: "Logistic Suppliers",
};

function formatCurrency(amount: number | null, currency: string | null): string {
  if (amount === null) return "—";
  const currencyCode = currency || "USD";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currencyCode,
  }).format(amount);
}

export default function Invoices() {
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | "all">("all");
  const [entityFilter, setEntityFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const { data: invoices, isLoading } = useAllInvoices({
    status: statusFilter === "all" ? undefined : statusFilter,
    entityTable: entityFilter === "all" ? undefined : entityFilter,
  });
  const approveInvoice = useApproveInvoice();
  const rejectInvoice = useRejectInvoice();

  // Filter by search query
  const filteredInvoices = invoices?.filter((invoice) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      invoice.vendor_name?.toLowerCase().includes(query) ||
      invoice.invoice_number?.toLowerCase().includes(query)
    );
  });

  // Calculate stats
  const stats = {
    total: invoices?.length || 0,
    pending: invoices?.filter((i) => i.status === "pending").length || 0,
    approved: invoices?.filter((i) => i.status === "approved").length || 0,
    totalAmount: invoices?.reduce((sum, i) => sum + (i.amount || 0), 0) || 0,
  };

  return (
    <div className="flex-1 overflow-auto">
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Invoices</h1>
            <p className="text-muted-foreground">
              Manage invoices extracted from emails and documents
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Invoices</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Review</CardTitle>
              <Clock className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.pending}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Approved</CardTitle>
              <Check className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.approved}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Amount</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(stats.totalAmount, "USD")}</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by vendor or invoice number..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as InvoiceStatus | "all")}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={entityFilter} onValueChange={setEntityFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Entity Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Entity Types</SelectItem>
              {INVOICE_CAPABLE_ENTITIES.map((entity) => (
                <SelectItem key={entity} value={entity}>
                  {ENTITY_LABELS[entity]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Invoice List */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        ) : !filteredInvoices || filteredInvoices.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <FileText className="h-16 w-16 text-muted-foreground/50 mb-4" />
            <h3 className="font-medium text-xl mb-2">No invoices found</h3>
            <p className="text-muted-foreground max-w-md">
              {searchQuery || statusFilter !== "all" || entityFilter !== "all"
                ? "Try adjusting your filters to see more results."
                : "Invoices extracted from emails will appear here."}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredInvoices.map((invoice) => (
              <InvoiceRow
                key={invoice.id}
                invoice={invoice}
                onApprove={() => approveInvoice.mutate(invoice.id)}
                onReject={() => rejectInvoice.mutate(invoice.id)}
                isUpdating={approveInvoice.isPending || rejectInvoice.isPending}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

interface InvoiceRowProps {
  invoice: ExtractedInvoice;
  onApprove: () => void;
  onReject: () => void;
  isUpdating: boolean;
}

function InvoiceRow({ invoice, onApprove, onReject, isUpdating }: InvoiceRowProps) {
  const statusConfig = STATUS_CONFIG[invoice.status];
  const StatusIcon = statusConfig.icon;

  return (
    <Card className="hover:shadow-sm transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 flex-1 min-w-0">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h4 className="font-medium truncate">
                  {invoice.vendor_name || "Unknown Vendor"}
                </h4>
                {invoice.invoice_number && (
                  <span className="text-sm text-muted-foreground">
                    #{invoice.invoice_number}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                {invoice.entity_table && (
                  <span className="flex items-center gap-1">
                    <Building2 className="h-3.5 w-3.5" />
                    {ENTITY_LABELS[invoice.entity_table] || invoice.entity_table}
                  </span>
                )}
                <span>
                  {formatDistanceToNow(new Date(invoice.created_at), { addSuffix: true })}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="font-semibold">
                {formatCurrency(invoice.amount, invoice.currency)}
              </p>
              {invoice.due_date && (
                <p className="text-xs text-muted-foreground">
                  Due {format(new Date(invoice.due_date), "MMM d, yyyy")}
                </p>
              )}
            </div>

            <Badge variant="outline" className={statusConfig.color}>
              <StatusIcon className="h-3 w-3 mr-1" />
              {statusConfig.label}
            </Badge>

            {invoice.status === "pending" && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    Actions
                    <ChevronDown className="h-4 w-4 ml-1" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={onApprove} disabled={isUpdating}>
                    <Check className="h-4 w-4 mr-2 text-green-600" />
                    Approve
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={onReject} disabled={isUpdating}>
                    <X className="h-4 w-4 mr-2 text-red-600" />
                    Reject
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
