import { useLocation } from "react-router-dom";
import {
  Users,
  Layers,
  Target,
  CheckSquare,
  FileText,
  LayoutDashboard,
  Settings,
  Search,
  Plus,
  FolderPlus,
  ChevronDown,
  Mail,
  ChevronRight,
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
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { NavLink } from "@/components/NavLink";
import { UserMenu } from "@/components/email/UserMenu";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useWorkspace } from "@/hooks/use-workspace";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { ObjectType } from "@/types/crm";
import { useState } from "react";

const workspaceItems = [
  { title: "People", url: "/people", icon: Users },
  { title: "Inbox", url: "/inbox", icon: Mail },
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
  const { workspaceId } = useWorkspace();
  const [objectTypesOpen, setObjectTypesOpen] = useState(true);

  const { data: objectTypes = [] } = useQuery({
    queryKey: ["object-types-sidebar", workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];
      
      const { data, error } = await supabase
        .from("object_types")
        .select("*")
        .eq("workspace_id", workspaceId)
        .eq("is_active", true)
        .order("sort_order");

      if (error) throw error;
      return data as ObjectType[];
    },
    enabled: !!workspaceId,
  });

  // Check if current route is an object type filter
  const isObjectTypeRoute = location.pathname.startsWith("/people?type=") || 
    location.search.includes("type=");

  return (
    <Sidebar collapsible="icon" className="border-r bg-sidebar">
      <SidebarHeader className="p-2">
        <div className="flex items-center justify-between gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className={`justify-start gap-2 ${collapsed ? "w-8 px-0" : "flex-1"}`}
              >
                <div className="h-6 w-6 rounded bg-primary/20 flex items-center justify-center text-xs font-semibold text-primary">
                  T
                </div>
                {!collapsed && (
                  <>
                    <span className="font-medium">test</span>
                    <ChevronDown className="h-4 w-4 ml-auto opacity-50" />
                  </>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56 bg-popover z-50">
              <DropdownMenuItem>test workspace</DropdownMenuItem>
              <DropdownMenuItem>Create new workspace</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          {!collapsed && (
            <div className="flex gap-1">
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <Plus className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <FolderPlus className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
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
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Object Types Section */}
        {objectTypes.length > 0 && (
          <SidebarGroup>
            <Collapsible open={objectTypesOpen} onOpenChange={setObjectTypesOpen}>
              <CollapsibleTrigger asChild>
                <SidebarGroupLabel className="text-xs font-medium text-muted-foreground uppercase tracking-wide px-2 cursor-pointer hover:text-foreground flex items-center justify-between">
                  {!collapsed && (
                    <>
                      <span>Object Types</span>
                      <ChevronRight 
                        className={`h-3 w-3 transition-transform ${objectTypesOpen ? "rotate-90" : ""}`} 
                      />
                    </>
                  )}
                  {collapsed && <Layers className="h-4 w-4" />}
                </SidebarGroupLabel>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {/* Manage Object Types link */}
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild>
                        <NavLink
                          to="/objects"
                          className="flex items-center gap-2 px-2 py-1.5 hover:bg-muted/50 rounded-md text-muted-foreground"
                          activeClassName="bg-muted text-primary font-medium"
                        >
                          <Layers className="h-4 w-4" />
                          {!collapsed && <span className="text-xs">Manage Types</span>}
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    {/* Dynamic Object Types */}
                    {objectTypes.map((type) => (
                      <SidebarMenuItem key={type.id}>
                        <SidebarMenuButton asChild>
                          <NavLink
                            to={`/people?type=${type.id}`}
                            className="flex items-center gap-2 px-2 py-1.5 hover:bg-muted/50 rounded-md"
                            activeClassName="bg-muted text-primary font-medium"
                          >
                            <div
                              className="h-3 w-3 rounded-full flex-shrink-0"
                              style={{ backgroundColor: type.color }}
                            />
                            {!collapsed && <span>{type.name}</span>}
                          </NavLink>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </CollapsibleContent>
            </Collapsible>
          </SidebarGroup>
        )}

        {/* Show link to create object types if none exist */}
        {objectTypes.length === 0 && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-xs font-medium text-muted-foreground uppercase tracking-wide px-2">
              {!collapsed && "Object Types"}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to="/objects"
                      className="flex items-center gap-2 px-2 py-1.5 hover:bg-muted/50 rounded-md"
                      activeClassName="bg-muted text-primary font-medium"
                    >
                      <Layers className="h-4 w-4" />
                      {!collapsed && <span>Manage Types</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

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
