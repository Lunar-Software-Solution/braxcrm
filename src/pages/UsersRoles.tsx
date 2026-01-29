import { useState } from "react";
import { Plus, Users, Mail, Shield, Building2, MoreVertical, Trash2, UserPlus, Loader2, CheckCircle2, X, UserX, UserCheck, Ban } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { TableHeader as CRMTableHeader } from "@/components/crm/TableHeader";
import { TableFooter } from "@/components/crm/TableFooter";
import { AddNewRow } from "@/components/crm/AddNewRow";
import { useUsersRoles, type UserWithRoles, type EntityRole } from "@/hooks/use-users-roles";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRoles } from "@/hooks/use-user-roles";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import InvitationsManager from "@/components/settings/InvitationsManager";

const entityLabels: Record<string, string> = {
  influencers: "Influencers",
  resellers: "Resellers",
  suppliers: "Suppliers",
  corporate_management: "Corp Mgmt",
};

function EntityRoleBadge({ role, onRemove }: { role: { id: string; role_name: string; entity_table: string }; onRemove?: () => void }) {
  return (
    <Badge variant="secondary" className="gap-1 pr-1 text-xs">
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

export default function UsersRoles() {
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
    suspendUser,
    isSuspendingUser,
    unsuspendUser,
    isUnsuspendingUser,
    deleteUser,
    isDeletingUser,
  } = useUsersRoles();

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [isSendingInvite, setIsSendingInvite] = useState(false);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [assigningUserId, setAssigningUserId] = useState<string | null>(null);
  const [selectedEntityRole, setSelectedEntityRole] = useState<string>("");

  const columns = [
    { key: "select", label: "", width: "w-10" },
    { key: "name", label: "Name", icon: Users, width: "min-w-[200px]" },
    { key: "email", label: "Email", icon: Mail, width: "min-w-[220px]" },
    { key: "role", label: "Role", icon: Shield, width: "min-w-[120px]" },
    { key: "entity_roles", label: "Entity Access", icon: Building2, width: "min-w-[200px]" },
    { key: "status", label: "Status", width: "min-w-[100px]" },
    { key: "actions", label: "", width: "w-10" },
  ];

  const toggleSelect = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedIds(newSet);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === users.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(users.map(u => u.id)));
  };

  const getInitials = (name: string | null, email: string) => {
    if (name) return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
    return email.slice(0, 2).toUpperCase();
  };

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

      if (response.data?.success === false || response.data?.error || response.error) {
        const errorCode = response.data?.error;
        const errorMessage = response.data?.message || response.error?.message || "Failed to send invite";
        
        if (errorCode === "already_registered" || errorMessage.includes("already registered")) {
          toast({
            title: "User already exists",
            description: "This email is already registered. You can assign roles to them from the user list.",
          });
          setInviteDialogOpen(false);
          setIsSendingInvite(false);
          return;
        }
        
        if (errorCode === "already_pending" || errorMessage.includes("already pending")) {
          toast({
            title: "Invitation pending",
            description: "An invitation has already been sent to this email.",
          });
          setInviteDialogOpen(false);
          setIsSendingInvite(false);
          return;
        }
        
        throw new Error(errorMessage);
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

  const openAssignDialog = (userId: string) => {
    setAssigningUserId(userId);
    setSelectedEntityRole("");
    setAssignDialogOpen(true);
  };

  const handleAssignRole = () => {
    if (selectedEntityRole && assigningUserId) {
      assignEntityRole({ userId: assigningUserId, entityRoleId: selectedEntityRole });
      setSelectedEntityRole("");
      setAssignDialogOpen(false);
      setAssigningUserId(null);
    }
  };

  const getAvailableEntityRoles = (userItem: UserWithRoles) => {
    const assignedIds = new Set(userItem.entity_roles.map(r => r.id));
    return entityRoles.filter(r => !assignedIds.has(r.id));
  };

  const aggregations = [
    { label: "Total Users", value: users.length },
    { label: "Admins", value: users.filter(u => u.app_role === "admin").length },
    { label: "Active", value: users.filter(u => u.status === "active").length },
    { label: "Suspended", value: users.filter(u => u.status === "suspended").length },
  ];

  return (
    <div className="h-full flex flex-col bg-background">
      <CRMTableHeader title="Users" count={users.length} />

      <div className="flex-1 overflow-hidden flex flex-col">
        {isLoadingUsers ? (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-muted-foreground">Loading users...</p>
          </div>
        ) : !user ? (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-muted-foreground">Please log in to view users</p>
          </div>
        ) : users.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center">
            <Users className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">No users yet</h3>
            <p className="text-muted-foreground mb-4">
              Invite your first team member to get started
            </p>
            {isAdmin && (
              <Button onClick={() => setInviteDialogOpen(true)}>
                <UserPlus className="h-4 w-4 mr-2" />
                Invite User
              </Button>
            )}
          </div>
        ) : (
          <ScrollArea className="flex-1">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  {columns.map((col) => (
                    <TableHead key={col.key} className={`${col.width} bg-muted/50`}>
                      {col.key === "select" ? (
                        <Checkbox 
                          checked={selectedIds.size === users.length && users.length > 0} 
                          onCheckedChange={toggleSelectAll} 
                        />
                      ) : col.key === "actions" ? null : (
                        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                          {col.icon && <col.icon className="h-3.5 w-3.5" />}
                          {col.label}
                        </div>
                      )}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((userItem) => {
                  const isCurrentUser = userItem.id === user?.id;
                  return (
                    <TableRow key={userItem.id} className="group">
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Checkbox 
                          checked={selectedIds.has(userItem.id)} 
                          onCheckedChange={() => toggleSelect(userItem.id)} 
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-6 w-6">
                            <AvatarFallback className="text-xs bg-primary/10 text-primary">
                              {getInitials(userItem.display_name, userItem.email)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="font-medium truncate">
                            {userItem.display_name || userItem.email}
                          </span>
                          {isCurrentUser && (
                            <Badge variant="outline" className="text-xs">You</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground truncate">
                        {userItem.email}
                      </TableCell>
                      <TableCell>
                        <Select
                          value={userItem.app_role}
                          onValueChange={(value) => updateAppRole({ userId: userItem.id, role: value as "admin" | "member" })}
                          disabled={isCurrentUser}
                        >
                          <SelectTrigger className="h-7 w-[100px] text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="admin">
                              <span className="flex items-center gap-1">
                                <Shield className="h-3 w-3" />
                                Admin
                              </span>
                            </SelectItem>
                            <SelectItem value="member">Member</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {userItem.entity_roles.length === 0 ? (
                            <span className="text-muted-foreground text-xs">—</span>
                          ) : (
                            userItem.entity_roles.map((role) => (
                              <EntityRoleBadge
                                key={role.id}
                                role={role}
                                onRemove={!isCurrentUser ? () => removeEntityRole({ userId: userItem.id, entityRoleId: role.id }) : undefined}
                              />
                            ))
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {userItem.status === "suspended" ? (
                          <Badge variant="outline" className="gap-1 text-xs text-orange-600 border-orange-200 bg-orange-50">
                            <Ban className="h-3 w-3" />
                            Suspended
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="gap-1 text-xs text-green-600 border-green-200 bg-green-50">
                            <CheckCircle2 className="h-3 w-3" />
                            Active
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-popover z-50">
                            <DropdownMenuLabel>Manage User</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => openAssignDialog(userItem.id)}>
                              <Plus className="h-4 w-4 mr-2" />
                              Assign Entity Role
                            </DropdownMenuItem>
                            {!isCurrentUser && (
                              <>
                                <DropdownMenuSeparator />
                                {userItem.status === "suspended" ? (
                                  <DropdownMenuItem 
                                    onClick={() => unsuspendUser(userItem.id)}
                                    disabled={isUnsuspendingUser}
                                  >
                                    {isUnsuspendingUser ? (
                                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    ) : (
                                      <UserCheck className="h-4 w-4 mr-2" />
                                    )}
                                    Reactivate User
                                  </DropdownMenuItem>
                                ) : (
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <DropdownMenuItem 
                                        onSelect={(e) => e.preventDefault()}
                                        className="text-orange-600 focus:text-orange-600"
                                      >
                                        <Ban className="h-4 w-4 mr-2" />
                                        Suspend User
                                      </DropdownMenuItem>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>Suspend user?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                          This will suspend {userItem.display_name || userItem.email}. They will no longer be able to access the system until reactivated.
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction
                                          onClick={() => suspendUser(userItem.id)}
                                          className="bg-orange-600 text-white hover:bg-orange-700"
                                          disabled={isSuspendingUser}
                                        >
                                          {isSuspendingUser ? (
                                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                          ) : (
                                            <Ban className="h-4 w-4 mr-2" />
                                          )}
                                          Suspend
                                        </AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
                                )}
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <DropdownMenuItem 
                                      onSelect={(e) => e.preventDefault()}
                                      className="text-destructive focus:text-destructive"
                                    >
                                      <Trash2 className="h-4 w-4 mr-2" />
                                      Delete User
                                    </DropdownMenuItem>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Delete user?</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        This will permanently delete {userItem.display_name || userItem.email} and remove all their data. This action cannot be undone.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                                      <AlertDialogAction
                                        onClick={() => deleteUser(userItem.id)}
                                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                        disabled={isDeletingUser}
                                      >
                                        {isDeletingUser ? (
                                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                        ) : (
                                          <Trash2 className="h-4 w-4 mr-2" />
                                        )}
                                        Delete
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {isAdmin && (
                  <AddNewRow colSpan={columns.length} onClick={() => setInviteDialogOpen(true)} label="Invite User" />
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        )}

        {users.length > 0 && <TableFooter aggregations={aggregations} />}
      </div>

      {/* Pending Invitations Section */}
      {isAdmin && users.length > 0 && (
        <div className="border-t">
          <div className="px-4 py-3">
            <h3 className="text-sm font-medium text-muted-foreground mb-3">Pending Invitations</h3>
            <InvitationsManager />
          </div>
        </div>
      )}

      {/* Invite User Dialog */}
      <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
        <DialogContent className="max-w-md">
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

      {/* Assign Entity Role Dialog */}
      <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Entity Role</DialogTitle>
            <DialogDescription>
              Assign an entity role to control which entity types this user can manage.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Select value={selectedEntityRole} onValueChange={setSelectedEntityRole}>
              <SelectTrigger>
                <SelectValue placeholder="Select an entity role..." />
              </SelectTrigger>
              <SelectContent className="max-h-[300px]">
                {assigningUserId && getAvailableEntityRoles(users.find(u => u.id === assigningUserId)!).length === 0 ? (
                  <SelectItem value="none" disabled>
                    All roles already assigned
                  </SelectItem>
                ) : (
                  assigningUserId && getAvailableEntityRoles(users.find(u => u.id === assigningUserId)!).map((role) => (
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
    </div>
  );
}
