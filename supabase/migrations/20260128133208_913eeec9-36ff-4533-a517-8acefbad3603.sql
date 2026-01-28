-- Add unique constraint on team_members for user_id and workspace_id
-- This allows proper upsert when adding team members
CREATE UNIQUE INDEX IF NOT EXISTS team_members_user_workspace_unique 
ON public.team_members (user_id, workspace_id);