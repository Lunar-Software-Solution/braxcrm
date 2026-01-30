import { useLocation } from "react-router-dom";
import {
  Users,
  Target,
  CheckSquare,
  FileText,
  LayoutDashboard,
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
import { NavLink } from "@/components/NavLink";
import { UserMenu } from "@/components/email/UserMenu";
import { Badge } from "@/components/ui/badge";
import { usePendingEmailCount } from "@/hooks/use-rules-processing-queue";
import { usePendingClassificationCount } from "@/hooks/use-classification-processing-queue";

const workspaceItems = [
  { title: "People", url: "/people", icon: Users },
  { title: "Senders", url: "/senders", icon: Send },
  { title: "Tasks", url: "/tasks", icon: CheckSquare },
  { title: "Opportunities", url: "/opportunities", icon: Target },
  { title: "Inbox", url: "/inbox", icon: Mail },
  { title: "Classification Queue", url: "/classification-processing-queue", icon: Brain },
  { title: "Rules Processing Queue", url: "/rules-processing-queue", icon: ClipboardList },
  { title: "Processing Log", url: "/rules-log", icon: ScrollText },
  { title: "Email Automation", url: "/email-automation", icon: Zap },
  { title: "Settings", url: "/settings", icon: Settings },
];

const entityItems = [
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

const futureItems = [
  { title: "Dashboards", url: "/dashboards", icon: LayoutDashboard, disabled: true },
];

export function CRMSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const pendingRulesCount = usePendingEmailCount();
  const pendingClassificationCount = usePendingClassificationCount();

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

        {/* Workspace Section */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-medium text-muted-foreground uppercase tracking-wide px-2">
            {!collapsed && "Workspace"}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {workspaceItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      className="flex items-center gap-2 px-2 py-1.5 hover:bg-muted/50 rounded-md"
                      activeClassName="bg-muted text-primary font-medium"
                    >
                      <item.icon className="h-4 w-4" />
                      {!collapsed && (
                        <span className="flex-1">{item.title}</span>
                      )}
                      {!collapsed && item.title === "Classification Queue" && pendingClassificationCount > 0 && (
                        <Badge variant="secondary" className="ml-auto text-xs">
                          {pendingClassificationCount}
                        </Badge>
                      )}
                      {!collapsed && item.title === "Rules Processing Queue" && pendingRulesCount > 0 && (
                        <Badge variant="secondary" className="ml-auto text-xs">
                          {pendingRulesCount}
                        </Badge>
                      )}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Entities Section */}
        <SidebarGroup>
        <SidebarGroupLabel className="text-xs font-medium text-muted-foreground uppercase tracking-wide px-2">
            {!collapsed && "ORGANISATIONS"}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {entityItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      className="flex items-center gap-2 px-2 py-1.5 hover:bg-muted/50 rounded-md"
                      activeClassName="bg-muted text-primary font-medium"
                    >
                      <item.icon className="h-4 w-4" style={{ color: item.color }} />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
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
