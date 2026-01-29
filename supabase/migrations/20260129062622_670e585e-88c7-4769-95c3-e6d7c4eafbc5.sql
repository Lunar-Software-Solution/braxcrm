-- Create workspace_settings table for storing workspace-level preferences
CREATE TABLE public.workspace_settings (
  workspace_id UUID PRIMARY KEY REFERENCES public.workspaces(id) ON DELETE CASCADE,
  auto_process_emails BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.workspace_settings ENABLE ROW LEVEL SECURITY;

-- RLS policies for workspace members
CREATE POLICY "Team members can view settings"
  ON public.workspace_settings FOR SELECT
  USING (is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "Team members can update settings"
  ON public.workspace_settings FOR UPDATE
  USING (is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "Team members can insert settings"
  ON public.workspace_settings FOR INSERT
  WITH CHECK (is_workspace_member(auth.uid(), workspace_id));

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_workspace_settings_updated_at
  BEFORE UPDATE ON public.workspace_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();