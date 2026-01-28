import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface Workspace {
  id: string;
  name: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export function useWorkspace() {
  const { user } = useAuth();
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const getOrCreateWorkspace = useCallback(async (userId: string): Promise<Workspace> => {
    // First, check if user is already a member of any workspace
    const { data: memberships, error: membershipError } = await supabase
      .from("team_members")
      .select("workspace_id")
      .eq("user_id", userId)
      .limit(1);

    if (membershipError) throw membershipError;

    if (memberships && memberships.length > 0) {
      // User has a workspace, fetch it
      const { data: existingWorkspace, error: workspaceError } = await supabase
        .from("workspaces")
        .select("*")
        .eq("id", memberships[0].workspace_id)
        .single();

      if (workspaceError) throw workspaceError;
      return existingWorkspace;
    }

    // No workspace found, check if user created one (might not be in team_members yet)
    const { data: ownedWorkspaces, error: ownedError } = await supabase
      .from("workspaces")
      .select("*")
      .eq("created_by", userId)
      .limit(1);

    if (ownedError) throw ownedError;

    if (ownedWorkspaces && ownedWorkspaces.length > 0) {
      // Add user to team_members if not already there
      await supabase
        .from("team_members")
        .upsert({
          workspace_id: ownedWorkspaces[0].id,
          user_id: userId,
          role: "admin",
        }, { onConflict: "workspace_id,user_id" })
        .select();

      return ownedWorkspaces[0];
    }

    // Create a new workspace for the user
    const { data: newWorkspace, error: createError } = await supabase
      .from("workspaces")
      .insert({
        name: "My Workspace",
        created_by: userId,
      })
      .select()
      .single();

    if (createError) throw createError;

    // Add user as admin of the workspace
    await supabase
      .from("team_members")
      .insert({
        workspace_id: newWorkspace.id,
        user_id: userId,
        role: "admin",
      });

    return newWorkspace;
  }, []);

  useEffect(() => {
    if (!user) {
      setWorkspace(null);
      setLoading(false);
      return;
    }

    const loadWorkspace = async () => {
      try {
        setLoading(true);
        setError(null);
        const ws = await getOrCreateWorkspace(user.id);
        setWorkspace(ws);
      } catch (err) {
        console.error("Failed to load workspace:", err);
        setError(err instanceof Error ? err : new Error("Unknown error"));
      } finally {
        setLoading(false);
      }
    };

    loadWorkspace();
  }, [user, getOrCreateWorkspace]);

  return {
    workspace,
    workspaceId: workspace?.id ?? null,
    loading,
    error,
  };
}
