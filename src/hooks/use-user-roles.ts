import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { EntityRole, UserEntityRole } from "@/types/roles";

interface UserRoleData {
  isAdmin: boolean;
  entityRoles: UserEntityRole[];
  hasEntityRole: (entityTable: string) => boolean;
  canAccessEntity: (entityTable: string) => boolean;
}

export function useUserRoles(): UserRoleData & { isLoading: boolean } {
  const { user } = useAuth();

  // Check if user is admin
  const { data: isAdmin = false, isLoading: isAdminLoading } = useQuery({
    queryKey: ["user-is-admin", user?.id],
    queryFn: async () => {
      if (!user?.id) return false;
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .maybeSingle();
      
      if (error) {
        console.error("Error checking admin role:", error);
        return false;
      }
      return !!data;
    },
    enabled: !!user?.id,
  });

  // Fetch user's entity roles
  const { data: entityRoles = [], isLoading: isRolesLoading } = useQuery({
    queryKey: ["user-entity-roles", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("user_entity_roles")
        .select(`
          id,
          user_id,
          entity_role_id,
          assigned_by,
          assigned_at,
          entity_role:entity_roles(id, name, slug, description, entity_table, created_at)
        `)
        .eq("user_id", user.id);
      
      if (error) {
        console.error("Error fetching entity roles:", error);
        return [];
      }
      
      return (data || []).map((item) => ({
        ...item,
        entity_role: Array.isArray(item.entity_role) ? item.entity_role[0] : item.entity_role,
      })) as UserEntityRole[];
    },
    enabled: !!user?.id,
  });

  // Helper to check if user has a specific entity role
  const hasEntityRole = (entityTable: string): boolean => {
    if (isAdmin) return true;
    return entityRoles.some((r) => r.entity_role?.entity_table === entityTable);
  };

  // Helper to check if user can access an entity (admin or has role)
  const canAccessEntity = (entityTable: string): boolean => {
    return isAdmin || hasEntityRole(entityTable);
  };

  return {
    isAdmin,
    entityRoles,
    hasEntityRole,
    canAccessEntity,
    isLoading: isAdminLoading || isRolesLoading,
  };
}

// Hook to fetch all entity roles (for admin UI)
export function useAllEntityRoles() {
  return useQuery({
    queryKey: ["all-entity-roles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("entity_roles")
        .select("*")
        .order("name");
      
      if (error) throw error;
      return data as EntityRole[];
    },
  });
}
