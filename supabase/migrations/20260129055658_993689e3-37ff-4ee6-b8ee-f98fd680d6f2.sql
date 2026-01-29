-- Create corporate_management table
CREATE TABLE public.corporate_management (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  notes TEXT,
  avatar_url TEXT,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.corporate_management ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Team members can view corporate_management" 
ON public.corporate_management 
FOR SELECT 
USING (is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "Team members can create corporate_management" 
ON public.corporate_management 
FOR INSERT 
WITH CHECK (is_workspace_member(auth.uid(), workspace_id) AND auth.uid() = created_by);

CREATE POLICY "Team members can update corporate_management" 
ON public.corporate_management 
FOR UPDATE 
USING (is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "Team members can delete corporate_management" 
ON public.corporate_management 
FOR DELETE 
USING (is_workspace_member(auth.uid(), workspace_id));

-- Trigger for updated_at
CREATE TRIGGER update_corporate_management_updated_at
BEFORE UPDATE ON public.corporate_management
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create email_corporate_management junction table
CREATE TABLE public.email_corporate_management (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email_id UUID NOT NULL REFERENCES public.email_messages(id) ON DELETE CASCADE,
  corporate_management_id UUID NOT NULL REFERENCES public.corporate_management(id) ON DELETE CASCADE,
  assigned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(email_id, corporate_management_id)
);

-- Enable RLS
ALTER TABLE public.email_corporate_management ENABLE ROW LEVEL SECURITY;

-- RLS Policies for junction table
CREATE POLICY "Team members can view email_corporate_management" 
ON public.email_corporate_management 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM email_messages e 
  WHERE e.id = email_corporate_management.email_id 
  AND is_workspace_member(auth.uid(), e.workspace_id)
));

CREATE POLICY "Team members can create email_corporate_management" 
ON public.email_corporate_management 
FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM email_messages e 
  WHERE e.id = email_corporate_management.email_id 
  AND is_workspace_member(auth.uid(), e.workspace_id)
));

CREATE POLICY "Team members can delete email_corporate_management" 
ON public.email_corporate_management 
FOR DELETE 
USING (EXISTS (
  SELECT 1 FROM email_messages e 
  WHERE e.id = email_corporate_management.email_id 
  AND is_workspace_member(auth.uid(), e.workspace_id)
));