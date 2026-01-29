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
  Truck,
  Building2,
  ClipboardList,
  ScrollText,
  Shield,
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
import { usePendingEmailCount } from "@/hooks/use-review-queue";

const workspaceItems = [
  { title: "People", url: "/people", icon: Users },
  { title: "Inbox", url: "/inbox", icon: Mail },
  { title: "Review Queue", url: "/review-queue", icon: ClipboardList },
  { title: "Rules Log", url: "/rules-log", icon: ScrollText },
];

const entityItems = [
  { title: "Influencers", url: "/influencers", icon: Sparkles, color: "#ec4899" },
  { title: "Resellers", url: "/resellers", icon: Store, color: "#22c55e" },
  { title: "Suppliers", url: "/suppliers", icon: Truck, color: "#3b82f6" },
  { title: "Corporate Management", url: "/corporate-management", icon: Building2, color: "#0891b2" },
];

const futureItems = [
  { title: "Opportunities", url: "/opportunities", icon: Target, disabled: true },
  { title: "Tasks", url: "/tasks", icon: CheckSquare, disabled: true },
  { title: "Notes", url: "/notes", icon: FileText, disabled: true },
  { title: "Dashboards", url: "/dashboards", icon: LayoutDashboard, disabled: true },
];

export function CRMSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const pendingCount = usePendingEmailCount();

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
                    to="/settings"
                    className="flex items-center gap-2 px-2 py-1.5 hover:bg-muted/50 rounded-md"
                    activeClassName="bg-muted text-primary font-medium"
                  >
                    <Settings className="h-4 w-4" />
                    {!collapsed && <span>Settings</span>}
                  </NavLink>
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
                      {!collapsed && item.title === "Review Queue" && pendingCount > 0 && (
                        <Badge variant="secondary" className="ml-auto text-xs">
                          {pendingCount}
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
