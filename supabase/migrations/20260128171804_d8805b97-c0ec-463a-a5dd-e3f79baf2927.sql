-- Add new action type for assigning entities
ALTER TYPE rule_action_type ADD VALUE IF NOT EXISTS 'assign_entity';

-- Create linking tables for email-entity relationships
CREATE TABLE IF NOT EXISTS public.email_influencers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email_id UUID NOT NULL REFERENCES email_messages(id) ON DELETE CASCADE,
  influencer_id UUID NOT NULL REFERENCES influencers(id) ON DELETE CASCADE,
  assigned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(email_id, influencer_id)
);

CREATE TABLE IF NOT EXISTS public.email_resellers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email_id UUID NOT NULL REFERENCES email_messages(id) ON DELETE CASCADE,
  reseller_id UUID NOT NULL REFERENCES resellers(id) ON DELETE CASCADE,
  assigned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(email_id, reseller_id)
);

CREATE TABLE IF NOT EXISTS public.email_suppliers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email_id UUID NOT NULL REFERENCES email_messages(id) ON DELETE CASCADE,
  supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  assigned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(email_id, supplier_id)
);

-- Enable RLS
ALTER TABLE public.email_influencers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_resellers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_suppliers ENABLE ROW LEVEL SECURITY;

-- RLS policies for email_influencers
CREATE POLICY "Team members can view email influencers" ON public.email_influencers
FOR SELECT USING (
  EXISTS (SELECT 1 FROM email_messages e WHERE e.id = email_id AND is_workspace_member(auth.uid(), e.workspace_id))
);

CREATE POLICY "Team members can create email influencers" ON public.email_influencers
FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM email_messages e WHERE e.id = email_id AND is_workspace_member(auth.uid(), e.workspace_id))
);

CREATE POLICY "Team members can delete email influencers" ON public.email_influencers
FOR DELETE USING (
  EXISTS (SELECT 1 FROM email_messages e WHERE e.id = email_id AND is_workspace_member(auth.uid(), e.workspace_id))
);

-- RLS policies for email_resellers
CREATE POLICY "Team members can view email resellers" ON public.email_resellers
FOR SELECT USING (
  EXISTS (SELECT 1 FROM email_messages e WHERE e.id = email_id AND is_workspace_member(auth.uid(), e.workspace_id))
);

CREATE POLICY "Team members can create email resellers" ON public.email_resellers
FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM email_messages e WHERE e.id = email_id AND is_workspace_member(auth.uid(), e.workspace_id))
);

CREATE POLICY "Team members can delete email resellers" ON public.email_resellers
FOR DELETE USING (
  EXISTS (SELECT 1 FROM email_messages e WHERE e.id = email_id AND is_workspace_member(auth.uid(), e.workspace_id))
);

-- RLS policies for email_suppliers
CREATE POLICY "Team members can view email suppliers" ON public.email_suppliers
FOR SELECT USING (
  EXISTS (SELECT 1 FROM email_messages e WHERE e.id = email_id AND is_workspace_member(auth.uid(), e.workspace_id))
);

CREATE POLICY "Team members can create email suppliers" ON public.email_suppliers
FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM email_messages e WHERE e.id = email_id AND is_workspace_member(auth.uid(), e.workspace_id))
);

CREATE POLICY "Team members can delete email suppliers" ON public.email_suppliers
FOR DELETE USING (
  EXISTS (SELECT 1 FROM email_messages e WHERE e.id = email_id AND is_workspace_member(auth.uid(), e.workspace_id))
);