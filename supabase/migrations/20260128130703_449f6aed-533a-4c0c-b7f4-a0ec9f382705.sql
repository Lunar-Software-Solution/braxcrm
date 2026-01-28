-- Drop existing contacts table and create new Companies and People structure
DROP TABLE IF EXISTS public.contacts CASCADE;

-- Create companies table
CREATE TABLE public.companies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  domain TEXT, -- extracted from email (e.g., "acme.com")
  website TEXT,
  industry TEXT,
  notes TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on companies
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

-- Create unique constraint on domain per workspace
CREATE UNIQUE INDEX companies_workspace_domain_unique ON public.companies(workspace_id, domain) WHERE domain IS NOT NULL;

-- RLS policies for companies
CREATE POLICY "Team members can view companies in their workspace"
ON public.companies FOR SELECT
USING (is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "Team members can create companies"
ON public.companies FOR INSERT
WITH CHECK (is_workspace_member(auth.uid(), workspace_id) AND auth.uid() = created_by);

CREATE POLICY "Team members can update companies in their workspace"
ON public.companies FOR UPDATE
USING (is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "Team members can delete companies in their workspace"
ON public.companies FOR DELETE
USING (is_workspace_member(auth.uid(), workspace_id));

-- Create people table
CREATE TABLE public.people (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  title TEXT,
  phone TEXT,
  notes TEXT,
  avatar_url TEXT,
  is_auto_created BOOLEAN NOT NULL DEFAULT false, -- flag for auto-created from email
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on people
ALTER TABLE public.people ENABLE ROW LEVEL SECURITY;

-- Create unique constraint on email per workspace
CREATE UNIQUE INDEX people_workspace_email_unique ON public.people(workspace_id, LOWER(email));

-- RLS policies for people
CREATE POLICY "Team members can view people in their workspace"
ON public.people FOR SELECT
USING (is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "Team members can create people"
ON public.people FOR INSERT
WITH CHECK (is_workspace_member(auth.uid(), workspace_id) AND auth.uid() = created_by);

CREATE POLICY "Team members can update people in their workspace"
ON public.people FOR UPDATE
USING (is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "Team members can delete people in their workspace"
ON public.people FOR DELETE
USING (is_workspace_member(auth.uid(), workspace_id));

-- Create email_messages table to track/cache emails locally
CREATE TABLE public.email_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  microsoft_message_id TEXT NOT NULL, -- Graph API message ID
  person_id UUID REFERENCES public.people(id) ON DELETE SET NULL,
  direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  subject TEXT,
  body_preview TEXT,
  received_at TIMESTAMP WITH TIME ZONE NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  has_attachments BOOLEAN NOT NULL DEFAULT false,
  conversation_id TEXT,
  folder_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on email_messages
ALTER TABLE public.email_messages ENABLE ROW LEVEL SECURITY;

-- Unique constraint on microsoft message ID per workspace
CREATE UNIQUE INDEX email_messages_workspace_msgid_unique ON public.email_messages(workspace_id, microsoft_message_id);

-- Index for faster lookups
CREATE INDEX email_messages_person_id_idx ON public.email_messages(person_id);
CREATE INDEX email_messages_received_at_idx ON public.email_messages(received_at DESC);

-- RLS policies for email_messages
CREATE POLICY "Team members can view emails in their workspace"
ON public.email_messages FOR SELECT
USING (is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "Team members can create emails"
ON public.email_messages FOR INSERT
WITH CHECK (is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "Team members can update emails in their workspace"
ON public.email_messages FOR UPDATE
USING (is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "Team members can delete emails in their workspace"
ON public.email_messages FOR DELETE
USING (is_workspace_member(auth.uid(), workspace_id));

-- Create triggers for updated_at
CREATE TRIGGER update_companies_updated_at
  BEFORE UPDATE ON public.companies
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_people_updated_at
  BEFORE UPDATE ON public.people
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();