// User roles management hook
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "./use-toast";

export interface UserWithRoles {
  id: string;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
  app_role: "admin" | "member";
  status: "active" | "suspended";
  suspended_at: string | null;
  entity_roles: {
    id: string;
    role_name: string;
    entity_table: string;
  }[];
}

export interface EntityRole {
  id: string;
  name: string;
  slug: string;
  entity_table: string;
  description: string | null;
}

export function useUsersRoles() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch all users with their roles
  const {
    data: users = [],
    isLoading: isLoadingUsers,
    refetch: refetchUsers,
  } = useQuery({
    queryKey: ["users-with-roles"],
    queryFn: async () => {
      // Get all profiles
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("user_id, email, display_name, avatar_url, status, suspended_at")
        .order("display_name");

      if (profilesError) throw profilesError;

      // Get all user_roles
      const { data: userRoles, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id, role");

      if (rolesError) throw rolesError;

      // Get all user_entity_roles with entity_roles
      const { data: entityRoleAssignments, error: entityError } = await supabase
        .from("user_entity_roles")
        .select(`
          user_id,
          entity_role:entity_roles(id, name, entity_table)
        `);

      if (entityError) throw entityError;

      // Build user objects
      const usersMap = new Map<string, UserWithRoles>();

      for (const profile of profiles || []) {
        const appRole = userRoles?.find(r => r.user_id === profile.user_id)?.role || "member";
        const entityRoles = (entityRoleAssignments || [])
          .filter(era => era.user_id === profile.user_id)
          .map(era => ({
            id: (era.entity_role as any)?.id,
            role_name: (era.entity_role as any)?.name,
            entity_table: (era.entity_role as any)?.entity_table,
          }))
          .filter(r => r.id);

        usersMap.set(profile.user_id, {
          id: profile.user_id,
          email: profile.email || "",
          display_name: profile.display_name,
          avatar_url: profile.avatar_url,
          app_role: appRole as "admin" | "member",
          status: (profile.status as "active" | "suspended") || "active",
          suspended_at: profile.suspended_at,
          entity_roles: entityRoles,
        });
      }

      return Array.from(usersMap.values());
    },
    enabled: !!user,
  });

  // Fetch all available entity roles
  const { data: entityRoles = [] } = useQuery({
    queryKey: ["entity-roles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("entity_roles")
        .select("id, name, slug, entity_table, description")
        .order("name");

      if (error) throw error;
      return data as EntityRole[];
    },
    enabled: !!user,
  });

  // Update user app role (admin/member)
  const updateAppRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: "admin" | "member" }) => {
      const { error } = await supabase
        .from("user_roles")
        .update({ role })
        .eq("user_id", userId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users-with-roles"] });
      toast({ title: "Role updated", description: "User role has been changed." });
    },
    onError: (error) => {
      toast({
        title: "Error updating role",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Assign entity role to user
  const assignEntityRoleMutation = useMutation({
    mutationFn: async ({ userId, entityRoleId }: { userId: string; entityRoleId: string }) => {
      const { error } = await supabase
        .from("user_entity_roles")
        .insert({
          user_id: userId,
          entity_role_id: entityRoleId,
          assigned_by: user?.id,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users-with-roles"] });
      toast({ title: "Role assigned", description: "Entity role has been assigned." });
    },
    onError: (error) => {
      toast({
        title: "Error assigning role",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Remove entity role from user
  const removeEntityRoleMutation = useMutation({
    mutationFn: async ({ userId, entityRoleId }: { userId: string; entityRoleId: string }) => {
      const { error } = await supabase
        .from("user_entity_roles")
        .delete()
        .eq("user_id", userId)
        .eq("entity_role_id", entityRoleId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users-with-roles"] });
      toast({ title: "Role removed", description: "Entity role has been removed." });
    },
    onError: (error) => {
      toast({
        title: "Error removing role",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Suspend user (admin only via edge function)
  const suspendUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      const { data: sessionData } = await supabase.auth.getSession();
      const response = await supabase.functions.invoke("admin-update-password", {
        body: { userId, action: "suspend" },
        headers: {
          Authorization: `Bearer ${sessionData.session?.access_token}`,
        },
      });

      if (response.error || response.data?.error) {
        throw new Error(response.data?.error || response.error?.message || "Failed to suspend user");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users-with-roles"] });
      toast({ title: "User suspended", description: "The user has been suspended and can no longer access the system." });
    },
    onError: (error) => {
      toast({
        title: "Error suspending user",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Unsuspend user (admin only via edge function)
  const unsuspendUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      const { data: sessionData } = await supabase.auth.getSession();
      const response = await supabase.functions.invoke("admin-update-password", {
        body: { userId, action: "unsuspend" },
        headers: {
          Authorization: `Bearer ${sessionData.session?.access_token}`,
        },
      });

      if (response.error || response.data?.error) {
        throw new Error(response.data?.error || response.error?.message || "Failed to reactivate user");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users-with-roles"] });
      toast({ title: "User reactivated", description: "The user has been reactivated and can access the system again." });
    },
    onError: (error) => {
      toast({
        title: "Error reactivating user",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete user (admin only via edge function)
  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      const { data: sessionData } = await supabase.auth.getSession();
      const response = await supabase.functions.invoke("admin-update-password", {
        body: { userId, action: "delete" },
        headers: {
          Authorization: `Bearer ${sessionData.session?.access_token}`,
        },
      });

      if (response.error || response.data?.error) {
        throw new Error(response.data?.error || response.error?.message || "Failed to delete user");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users-with-roles"] });
      toast({ title: "User deleted", description: "The user has been removed from the system." });
    },
    onError: (error) => {
      toast({
        title: "Error deleting user",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    users,
    isLoadingUsers,
    refetchUsers,
    entityRoles,
    updateAppRole: updateAppRoleMutation.mutate,
    isUpdatingAppRole: updateAppRoleMutation.isPending,
    assignEntityRole: assignEntityRoleMutation.mutate,
    isAssigningEntityRole: assignEntityRoleMutation.isPending,
    removeEntityRole: removeEntityRoleMutation.mutate,
    isRemovingEntityRole: removeEntityRoleMutation.isPending,
    suspendUser: suspendUserMutation.mutate,
    isSuspendingUser: suspendUserMutation.isPending,
    unsuspendUser: unsuspendUserMutation.mutate,
    isUnsuspendingUser: unsuspendUserMutation.isPending,
    deleteUser: deleteUserMutation.mutate,
    isDeletingUser: deleteUserMutation.isPending,
  };
}
