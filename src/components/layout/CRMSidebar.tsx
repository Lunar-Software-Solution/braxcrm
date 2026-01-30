import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import {
  Users,
  Target,
  CheckSquare,
  Settings,
  Search,
  Mail,
  Sparkles,
  Store,
  Package,
  Receipt,
  Building2,
  ClipboardList,
  ScrollText,
  Contact,
  CreditCard,
  Shield,
  Zap,
  Brain,
  Megaphone,
  Send,
  Landmark,
  Truck,
  Webhook,
  History,
  ChevronRight,
  LayoutDashboard,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { NavLink } from "@/components/NavLink";
import { UserMenu } from "@/components/email/UserMenu";
import { Badge } from "@/components/ui/badge";
import { usePendingEmailCount } from "@/hooks/use-rules-processing-queue";
import { usePendingClassificationCount } from "@/hooks/use-classification-processing-queue";
import { usePendingImportCount } from "@/hooks/use-import-events";
import { cn } from "@/lib/utils";

// Menu item type
interface MenuItem {
  title: string;
  url: string;
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  color?: string;
  disabled?: boolean;
  badgeKey?: "classification" | "rules" | "import";
}

// Group definitions
const coreItems: MenuItem[] = [
  { title: "People", url: "/people", icon: Users },
  { title: "Senders", url: "/senders", icon: Send },
  { title: "Tasks", url: "/tasks", icon: CheckSquare },
  { title: "Opportunities", url: "/opportunities", icon: Target },
];

const emailItems: MenuItem[] = [
  { title: "Inbox", url: "/inbox", icon: Mail },
  { title: "Classification Queue", url: "/classification-processing-queue", icon: Brain, badgeKey: "classification" },
  { title: "Rules Queue", url: "/rules-processing-queue", icon: ClipboardList, badgeKey: "rules" },
  { title: "Processing Log", url: "/rules-log", icon: ScrollText },
  { title: "Email Rules", url: "/email-automation", icon: Zap },
  { title: "Send Automation", url: "/email-automation-hub", icon: Send },
];

const importItems: MenuItem[] = [
  { title: "Import Queue", url: "/import-queue", icon: Webhook, badgeKey: "import" },
  { title: "Import Log", url: "/import-log", icon: History },
  { title: "Import Endpoints", url: "/import-endpoints", icon: Zap },
];

const settingsItems: MenuItem[] = [
  { title: "Settings", url: "/settings", icon: Settings },
];

const entityItems: MenuItem[] = [
  { title: "Influencers", url: "/influencers", icon: Sparkles, color: "#ec4899" },
  { title: "Resellers", url: "/resellers", icon: Store, color: "#22c55e" },
  { title: "Product Suppliers", url: "/product-suppliers", icon: Package, color: "#3b82f6" },
  { title: "Expense Suppliers", url: "/expense-suppliers", icon: Receipt, color: "#f97316" },
  { title: "Corporate Management", url: "/corporate-management", icon: Building2, color: "#0891b2" },
  { title: "Personal Contacts", url: "/personal-contacts", icon: Contact, color: "#8b5cf6" },
  { title: "Subscriptions", url: "/subscriptions", icon: CreditCard, color: "#f59e0b" },
  { title: "Marketing Sources", url: "/marketing-sources", icon: Megaphone, color: "#64748b" },
  { title: "Merchant Accounts", url: "/merchant-accounts", icon: Landmark, color: "#10b981" },
  { title: "Logistic Suppliers", url: "/logistic-suppliers", icon: Truck, color: "#06b6d4" },
];

const futureItems: MenuItem[] = [
  { title: "Dashboards", url: "/dashboards", icon: LayoutDashboard, disabled: true },
];

// Helper to check if any item in a group is active
function isGroupActive(items: MenuItem[], pathname: string): boolean {
  return items.some((item) => pathname === item.url || pathname.startsWith(item.url + "/"));
}

// Collapsible menu group component
interface CollapsibleMenuGroupProps {
  label: string;
  items: MenuItem[];
  isOpen: boolean;
  onToggle: () => void;
  collapsed: boolean;
  badges?: {
    classification?: number;
    rules?: number;
    import?: number;
  };
}

function CollapsibleMenuGroup({
  label,
  items,
  isOpen,
  onToggle,
  collapsed,
  badges = {},
}: CollapsibleMenuGroupProps) {
  const location = useLocation();

  // Calculate total badge count for the group header
  const totalBadgeCount = items.reduce((acc, item) => {
    if (item.badgeKey && badges[item.badgeKey]) {
      return acc + (badges[item.badgeKey] || 0);
    }
    return acc;
  }, 0);

  return (
    <Collapsible open={isOpen} onOpenChange={onToggle}>
      <CollapsibleTrigger asChild>
        <button
          className={cn(
            "flex w-full items-center gap-2 px-2 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted/50 rounded-md transition-colors",
            "uppercase tracking-wide"
          )}
        >
          <ChevronRight
            className={cn(
              "h-3 w-3 transition-transform duration-200",
              isOpen && "rotate-90"
            )}
          />
          {!collapsed && (
            <>
              <span className="flex-1 text-left">{label}</span>
              {totalBadgeCount > 0 && (
                <Badge variant="secondary" className="text-xs h-5 px-1.5">
                  {totalBadgeCount}
                </Badge>
              )}
            </>
          )}
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <SidebarMenu className="ml-2">
          {items.map((item) => (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton asChild disabled={item.disabled}>
                {item.disabled ? (
                  <button
                    className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md opacity-50 cursor-not-allowed"
                    disabled
                  >
                    <item.icon
                      className="h-4 w-4"
                      style={item.color ? { color: item.color } : undefined}
                    />
                    {!collapsed && <span>{item.title}</span>}
                  </button>
                ) : (
                  <NavLink
                    to={item.url}
                    className="flex items-center gap-2 px-2 py-1.5 hover:bg-muted/50 rounded-md"
                    activeClassName="bg-muted text-primary font-medium"
                  >
                    <item.icon
                      className="h-4 w-4"
                      style={item.color ? { color: item.color } : undefined}
                    />
                    {!collapsed && (
                      <>
                        <span className="flex-1">{item.title}</span>
                        {item.badgeKey && badges[item.badgeKey] && badges[item.badgeKey]! > 0 && (
                          <Badge variant="secondary" className="ml-auto text-xs">
                            {badges[item.badgeKey]}
                          </Badge>
                        )}
                      </>
                    )}
                  </NavLink>
                )}
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </CollapsibleContent>
    </Collapsible>
  );
}

export function CRMSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const pendingRulesCount = usePendingEmailCount();
  const pendingClassificationCount = usePendingClassificationCount();
  const pendingImportCount = usePendingImportCount();

  // Track which groups are open
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    core: true,
    email: true,
    import: true,
    settings: true,
    organisations: true,
  });

  // Auto-expand group containing active route
  useEffect(() => {
    const pathname = location.pathname;
    const updates: Record<string, boolean> = {};

    if (isGroupActive(coreItems, pathname)) updates.core = true;
    if (isGroupActive(emailItems, pathname)) updates.email = true;
    if (isGroupActive(importItems, pathname)) updates.import = true;
    if (isGroupActive(settingsItems, pathname)) updates.settings = true;
    if (isGroupActive(entityItems, pathname)) updates.organisations = true;

    if (Object.keys(updates).length > 0) {
      setOpenGroups((prev) => ({ ...prev, ...updates }));
    }
  }, [location.pathname]);

  const toggleGroup = (group: string) => {
    setOpenGroups((prev) => ({ ...prev, [group]: !prev[group] }));
  };

  const badges = {
    classification: pendingClassificationCount,
    rules: pendingRulesCount,
    import: pendingImportCount,
  };

  return (
    <Sidebar collapsible="icon" className="border-r bg-sidebar">
      <SidebarHeader className="p-2 flex items-center justify-end">
        <SidebarTrigger />
      </SidebarHeader>

      <SidebarContent>
        {/* Quick Actions */}
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <button className="w-full flex items-center gap-2 px-2 py-1.5 hover:bg-muted/50 rounded-md">
                    <Search className="h-4 w-4" />
                    {!collapsed && <span>Search</span>}
                  </button>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <NavLink
                    to="/users-roles"
                    className="flex items-center gap-2 px-2 py-1.5 hover:bg-muted/50 rounded-md"
                    activeClassName="bg-muted text-primary font-medium"
                  >
                    <Shield className="h-4 w-4" />
                    {!collapsed && <span>Users & Roles</span>}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Workspace Section with Collapsible Groups */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-medium text-muted-foreground uppercase tracking-wide px-2">
            {!collapsed && "Workspace"}
          </SidebarGroupLabel>
          <SidebarGroupContent className="space-y-1">
            <CollapsibleMenuGroup
              label="Core"
              items={coreItems}
              isOpen={openGroups.core}
              onToggle={() => toggleGroup("core")}
              collapsed={collapsed}
              badges={badges}
            />
            <CollapsibleMenuGroup
              label="Email"
              items={emailItems}
              isOpen={openGroups.email}
              onToggle={() => toggleGroup("email")}
              collapsed={collapsed}
              badges={badges}
            />
            <CollapsibleMenuGroup
              label="Import"
              items={importItems}
              isOpen={openGroups.import}
              onToggle={() => toggleGroup("import")}
              collapsed={collapsed}
              badges={badges}
            />
            <CollapsibleMenuGroup
              label="Settings"
              items={settingsItems}
              isOpen={openGroups.settings}
              onToggle={() => toggleGroup("settings")}
              collapsed={collapsed}
              badges={badges}
            />
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Organisations Section */}
        <SidebarGroup>
          <SidebarGroupContent>
            <CollapsibleMenuGroup
              label="Organisations"
              items={entityItems}
              isOpen={openGroups.organisations}
              onToggle={() => toggleGroup("organisations")}
              collapsed={collapsed}
              badges={badges}
            />
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Future Items (disabled) */}
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {futureItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild disabled>
                    <button
                      className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md opacity-50 cursor-not-allowed"
                      disabled
                    >
                      <item.icon className="h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </button>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-2">
        <UserMenu collapsed={collapsed} />
      </SidebarFooter>
    </Sidebar>
  );
}
