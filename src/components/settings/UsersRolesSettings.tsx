import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Users, Shield, Plus, X, MoreVertical, Building2, Mail, Loader2, UserPlus, SendHorizonal } from "lucide-react";
import { useUsersRoles, type UserWithRoles, type EntityRole } from "@/hooks/use-users-roles";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRoles } from "@/hooks/use-user-roles";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import InvitationsManager from "./InvitationsManager";

function EntityRoleBadge({ role, onRemove }: { role: { id: string; role_name: string; entity_table: string }; onRemove?: () => void }) {
  const entityLabels: Record<string, string> = {
    influencers: "Influencers",
    resellers: "Resellers",
    suppliers: "Suppliers",
    corporate_management: "Corp Mgmt",
  };

  return (
    <Badge variant="secondary" className="gap-1 pr-1">
      <Building2 className="h-3 w-3" />
      {entityLabels[role.entity_table] || role.entity_table}
      {onRemove && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="ml-1 rounded-full p-0.5 hover:bg-muted"
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </Badge>
  );
}

function UserRow({
  userItem,
  entityRoles,
  currentUserId,
  onUpdateAppRole,
  onAssignEntityRole,
  onRemoveEntityRole,
}: {
  userItem: UserWithRoles;
  entityRoles: EntityRole[];
  currentUserId?: string;
  onUpdateAppRole: (args: { userId: string; role: "admin" | "member" }) => void;
  onAssignEntityRole: (args: { userId: string; entityRoleId: string }) => void;
  onRemoveEntityRole: (args: { userId: string; entityRoleId: string }) => void;
}) {
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [selectedEntityRole, setSelectedEntityRole] = useState<string>("");

  const isCurrentUser = userItem.id === currentUserId;
  const assignedEntityRoleIds = new Set(userItem.entity_roles.map(r => r.id));
  const availableEntityRoles = entityRoles.filter(r => !assignedEntityRoleIds.has(r.id));

  const handleRemoveEntityRole = (entityRoleId: string) => {
    onRemoveEntityRole({ userId: userItem.id, entityRoleId });
  };

  const handleAssignRole = () => {
    if (selectedEntityRole) {
      onAssignEntityRole({ userId: userItem.id, entityRoleId: selectedEntityRole });
      setSelectedEntityRole("");
      setAssignDialogOpen(false);
    }
  };

  return (
    <div className="flex items-center justify-between p-4 rounded-lg border border-border bg-muted/30">
      <div className="flex items-center gap-4">
        <Avatar className="h-10 w-10">
          <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
            {userItem.display_name?.slice(0, 2).toUpperCase() || userItem.email?.slice(0, 2).toUpperCase() || "U"}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <p className="font-medium">
              {userItem.display_name || userItem.email}
            </p>
            {isCurrentUser && (
              <Badge variant="outline" className="text-xs">You</Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">{userItem.email}</p>
          
          {/* Entity Roles */}
          {userItem.entity_roles.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {userItem.entity_roles.map((role) => (
                <EntityRoleBadge
                  key={role.id}
                  role={role}
                  onRemove={!isCurrentUser ? () => handleRemoveEntityRole(role.id) : undefined}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        {/* App Role Selector */}
        <Select
          value={userItem.app_role}
          onValueChange={(value) => onUpdateAppRole({ userId: userItem.id, role: value as "admin" | "member" })}
          disabled={isCurrentUser}
        >
          <SelectTrigger className="w-[110px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="admin">
              <span className="flex items-center gap-2">
                <Shield className="h-3 w-3" />
                Admin
              </span>
            </SelectItem>
            <SelectItem value="member">Member</SelectItem>
          </SelectContent>
        </Select>

        {/* Actions Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-popover">
            <DropdownMenuLabel>Manage Roles</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
              <DialogTrigger asChild>
                <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                  <Plus className="h-4 w-4 mr-2" />
                  Assign Entity Role
                </DropdownMenuItem>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Assign Entity Role</DialogTitle>
                  <DialogDescription>
                    Assign an entity role to {userItem.display_name || userItem.email}. This controls which entity types they can manage.
                  </DialogDescription>
                </DialogHeader>
                <div className="py-4">
                  <Select value={selectedEntityRole} onValueChange={setSelectedEntityRole}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select an entity role..." />
                    </SelectTrigger>
                    <SelectContent>
                      {availableEntityRoles.length === 0 ? (
                        <SelectItem value="none" disabled>
                          All roles already assigned
                        </SelectItem>
                      ) : (
                        availableEntityRoles.map((role) => (
                          <SelectItem key={role.id} value={role.id}>
                            <span className="flex items-center gap-2">
                              <Building2 className="h-3 w-3" />
                              {role.name}
                              <span className="text-muted-foreground text-xs">
                                ({role.entity_table})
                              </span>
                            </span>
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setAssignDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleAssignRole} disabled={!selectedEntityRole}>
                    Assign Role
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

export default function UsersRolesSettings() {
  const { user } = useAuth();
  const { isAdmin } = useUserRoles();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const {
    users,
    isLoadingUsers,
    entityRoles,
    updateAppRole,
    assignEntityRole,
    removeEntityRole,
  } = useUsersRoles();

  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [isSendingInvite, setIsSendingInvite] = useState(false);

  const handleSendInvite = async () => {
    if (!inviteEmail) return;

    setIsSendingInvite(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const response = await supabase.functions.invoke("send-invite", {
        body: { email: inviteEmail, name: inviteName || undefined },
        headers: {
          Authorization: `Bearer ${sessionData.session?.access_token}`,
        },
      });

      if (response.error) {
        throw new Error(response.error.message || "Failed to send invite");
      }

      toast({
        title: "Invitation sent",
        description: `An invitation has been sent to ${inviteEmail}`,
      });

      setInviteEmail("");
      setInviteName("");
      setInviteDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["invitations"] });
    } catch (error) {
      console.error("Failed to send invite:", error);
      toast({
        title: "Failed to send invitation",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setIsSendingInvite(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-muted-foreground" />
            <div>
              <CardTitle>Users & Roles</CardTitle>
              <CardDescription>Manage user access and permissions</CardDescription>
            </div>
          </div>
          {isAdmin && (
            <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <UserPlus className="h-4 w-4" />
                  Invite User
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Invite New User</DialogTitle>
                  <DialogDescription>
                    Send an invitation email to add a new team member.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="invite-email">Email address *</Label>
                    <Input
                      id="invite-email"
                      type="email"
                      placeholder="colleague@company.com"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="invite-name">Name (optional)</Label>
                    <Input
                      id="invite-name"
                      placeholder="John Doe"
                      value={inviteName}
                      onChange={(e) => setInviteName(e.target.value)}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setInviteDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleSendInvite} 
                    disabled={!inviteEmail || isSendingInvite}
                    className="gap-2"
                  >
                    {isSendingInvite ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Mail className="h-4 w-4" />
                    )}
                    Send Invitation
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {isLoadingUsers ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        ) : users.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No users found</p>
          </div>
        ) : (
          <div className="space-y-3">
            {users.map((userItem) => (
              <UserRow
                key={userItem.id}
                userItem={userItem}
                entityRoles={entityRoles}
                currentUserId={user?.id}
                onUpdateAppRole={updateAppRole}
                onAssignEntityRole={assignEntityRole}
                onRemoveEntityRole={removeEntityRole}
              />
            ))}
          </div>
        )}

        {/* Legend */}
        <div className="mt-6 p-4 bg-muted/50 rounded-lg">
          <h4 className="font-medium text-sm mb-2">Role Types</h4>
          <div className="space-y-2 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="gap-1">
                <Shield className="h-3 w-3" />
                Admin
              </Badge>
              <span>Full access to all features and settings</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline">Member</Badge>
              <span>Standard access based on entity roles</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="gap-1">
                <Building2 className="h-3 w-3" />
                Entity Role
              </Badge>
              <span>Access to manage specific entity types (Influencers, Resellers, etc.)</span>
            </div>
          </div>
        </div>

        {/* Pending Invitations */}
        {isAdmin && (
          <div className="mt-6">
            <div className="flex items-center gap-2 mb-4">
              <SendHorizonal className="h-5 w-5 text-muted-foreground" />
              <h3 className="font-medium">Pending Invitations</h3>
            </div>
            <InvitationsManager />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
