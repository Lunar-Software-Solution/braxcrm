import { Link } from "react-router-dom";
import {
  Sparkles,
  Store,
  Package,
  Receipt,
  Building2,
  Contact,
  CreditCard,
  Megaphone,
  Landmark,
  Truck,
  ClipboardCheck,
  ArrowRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useAllEntityApprovalCounts } from "@/hooks/use-entity-approvals";
import type { EntityType } from "@/types/entities";

const entityConfig: Record<
  EntityType,
  { label: string; icon: React.ComponentType<{ className?: string }>; color: string }
> = {
  affiliates: { label: "Affiliates", icon: Sparkles, color: "#ec4899" },
  vigile_partners: { label: "Vigile Partners", icon: Store, color: "#22c55e" },
  brax_distributors: { label: "Brax Distributors", icon: Package, color: "#7c3aed" },
  product_suppliers: { label: "Product Suppliers", icon: Package, color: "#3b82f6" },
  services_suppliers: { label: "Services Suppliers", icon: Receipt, color: "#f97316" },
  corporate_management: { label: "Corporate Management", icon: Building2, color: "#0891b2" },
  personal_contacts: { label: "Personal Contacts", icon: Contact, color: "#8b5cf6" },
  subscription_suppliers: { label: "Subscription Suppliers", icon: CreditCard, color: "#f59e0b" },
  marketing_sources: { label: "Marketing Sources", icon: Megaphone, color: "#64748b" },
  merchant_accounts: { label: "Merchant Accounts", icon: Landmark, color: "#10b981" },
  logistic_suppliers: { label: "Logistic Suppliers", icon: Truck, color: "#06b6d4" },
};

export default function EntityApprovalHub() {
  const { data, isLoading } = useAllEntityApprovalCounts();

  const entityTypes = Object.keys(entityConfig) as EntityType[];

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="border-b p-4">
        <div className="flex items-center gap-3">
          <div
            className="h-10 w-10 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: "hsl(var(--primary))" }}
          >
            <ClipboardCheck className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold">Entity Approvals</h1>
            <p className="text-sm text-muted-foreground">
              Review and approve pending entities across all types
            </p>
          </div>
        </div>
        {data && (
          <div className="mt-4 flex items-center gap-4">
            <Badge variant="secondary" className="text-base px-3 py-1">
              {data.totalPending} pending review
            </Badge>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {entityTypes.map((type) => (
              <Skeleton key={type} className="h-32" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {entityTypes.map((entityType) => {
              const config = entityConfig[entityType];
              const counts = data?.byType[entityType];
              const pendingCount = (counts?.pending || 0) + (counts?.under_review || 0);
              const Icon = config.icon;

              return (
                <Link key={entityType} to={`/approvals/${entityType}`}>
                  <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div
                            className="h-10 w-10 rounded-lg flex items-center justify-center"
                            style={{ backgroundColor: config.color }}
                          >
                            <Icon className="h-5 w-5 text-white" />
                          </div>
                          <CardTitle className="text-base">{config.label}</CardTitle>
                        </div>
                        <ArrowRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-4 text-sm">
                        {pendingCount > 0 ? (
                          <Badge
                            variant="secondary"
                            className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                          >
                            {pendingCount} pending
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">No pending items</span>
                        )}
                        <span className="text-muted-foreground">
                          {counts?.total || 0} total
                        </span>
                      </div>
                      <div className="mt-2 flex gap-2 text-xs text-muted-foreground">
                        <span>{counts?.draft || 0} draft</span>
                        <span>•</span>
                        <span>{counts?.approved || 0} approved</span>
                        <span>•</span>
                        <span>{counts?.rejected || 0} rejected</span>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
