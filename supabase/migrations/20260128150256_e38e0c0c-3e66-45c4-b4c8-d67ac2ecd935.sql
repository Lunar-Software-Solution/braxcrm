-- Create enum for rule action types
CREATE TYPE public.rule_action_type AS ENUM (
  'visibility',
  'tag',
  'extract_attachments',
  'extract_invoice',
  'move_folder',
  'mark_priority'
);

-- Create enum for invoice status
CREATE TYPE public.invoice_status AS ENUM (
  'pending',
  'reviewed',
  'approved',
  'rejected'
);

-- 1. email_categories - Stores category definitions
CREATE TABLE public.email_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#6366f1',
  icon TEXT DEFAULT 'tag',
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(workspace_id, name)
);

-- 2. email_rules - Stores rules linked to categories
CREATE TABLE public.email_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES public.email_categories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  priority INTEGER NOT NULL DEFAULT 0,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 3. email_rule_actions - Stores actions for each rule
CREATE TABLE public.email_rule_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id UUID NOT NULL REFERENCES public.email_rules(id) ON DELETE CASCADE,
  action_type rule_action_type NOT NULL,
  config JSONB NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 4. email_tags - Stores available tags
CREATE TABLE public.email_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#6366f1',
  outlook_category TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(workspace_id, name)
);

-- 5. email_message_tags - Junction table for email-tag relationships
CREATE TABLE public.email_message_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email_id UUID NOT NULL REFERENCES public.email_messages(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES public.email_tags(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(email_id, tag_id)
);

-- 6. email_message_categories - Stores AI classification results
CREATE TABLE public.email_message_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email_id UUID NOT NULL REFERENCES public.email_messages(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES public.email_categories(id) ON DELETE CASCADE,
  confidence DECIMAL(3,2) NOT NULL DEFAULT 0,
  processed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(email_id, category_id)
);

-- 7. email_visibility_groups - Defines which team members can see emails
CREATE TABLE public.email_visibility_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(workspace_id, name)
);

-- 8. email_visibility_group_members - Group membership
CREATE TABLE public.email_visibility_group_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.email_visibility_groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(group_id, user_id)
);

-- 9. extracted_invoices - Stores extracted invoice data
CREATE TABLE public.extracted_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  email_id UUID NOT NULL REFERENCES public.email_messages(id) ON DELETE CASCADE,
  vendor_name TEXT,
  invoice_number TEXT,
  amount DECIMAL(15,2),
  currency TEXT DEFAULT 'USD',
  due_date DATE,
  raw_extraction JSONB,
  status invoice_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add new columns to email_messages
ALTER TABLE public.email_messages
ADD COLUMN category_id UUID REFERENCES public.email_categories(id) ON DELETE SET NULL,
ADD COLUMN ai_confidence DECIMAL(3,2),
ADD COLUMN visibility_group_id UUID REFERENCES public.email_visibility_groups(id) ON DELETE SET NULL,
ADD COLUMN is_processed BOOLEAN NOT NULL DEFAULT false;

-- Enable RLS on all new tables
ALTER TABLE public.email_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_rule_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_message_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_message_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_visibility_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_visibility_group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.extracted_invoices ENABLE ROW LEVEL SECURITY;

-- RLS Policies for email_categories
CREATE POLICY "Team members can view categories in their workspace"
  ON public.email_categories FOR SELECT
  USING (is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "Team members can create categories"
  ON public.email_categories FOR INSERT
  WITH CHECK (is_workspace_member(auth.uid(), workspace_id) AND auth.uid() = created_by);

CREATE POLICY "Team members can update categories in their workspace"
  ON public.email_categories FOR UPDATE
  USING (is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "Team members can delete categories in their workspace"
  ON public.email_categories FOR DELETE
  USING (is_workspace_member(auth.uid(), workspace_id));

-- RLS Policies for email_rules
CREATE POLICY "Team members can view rules in their workspace"
  ON public.email_rules FOR SELECT
  USING (is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "Team members can create rules"
  ON public.email_rules FOR INSERT
  WITH CHECK (is_workspace_member(auth.uid(), workspace_id) AND auth.uid() = created_by);

CREATE POLICY "Team members can update rules in their workspace"
  ON public.email_rules FOR UPDATE
  USING (is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "Team members can delete rules in their workspace"
  ON public.email_rules FOR DELETE
  USING (is_workspace_member(auth.uid(), workspace_id));

-- RLS Policies for email_rule_actions (via rule's workspace)
CREATE POLICY "Team members can view rule actions"
  ON public.email_rule_actions FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.email_rules r
    WHERE r.id = rule_id AND is_workspace_member(auth.uid(), r.workspace_id)
  ));

CREATE POLICY "Team members can create rule actions"
  ON public.email_rule_actions FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.email_rules r
    WHERE r.id = rule_id AND is_workspace_member(auth.uid(), r.workspace_id)
  ));

CREATE POLICY "Team members can update rule actions"
  ON public.email_rule_actions FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.email_rules r
    WHERE r.id = rule_id AND is_workspace_member(auth.uid(), r.workspace_id)
  ));

CREATE POLICY "Team members can delete rule actions"
  ON public.email_rule_actions FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.email_rules r
    WHERE r.id = rule_id AND is_workspace_member(auth.uid(), r.workspace_id)
  ));

-- RLS Policies for email_tags
CREATE POLICY "Team members can view tags in their workspace"
  ON public.email_tags FOR SELECT
  USING (is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "Team members can create tags"
  ON public.email_tags FOR INSERT
  WITH CHECK (is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "Team members can update tags in their workspace"
  ON public.email_tags FOR UPDATE
  USING (is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "Team members can delete tags in their workspace"
  ON public.email_tags FOR DELETE
  USING (is_workspace_member(auth.uid(), workspace_id));

-- RLS Policies for email_message_tags (via email's workspace)
CREATE POLICY "Team members can view message tags"
  ON public.email_message_tags FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.email_messages e
    WHERE e.id = email_id AND is_workspace_member(auth.uid(), e.workspace_id)
  ));

CREATE POLICY "Team members can create message tags"
  ON public.email_message_tags FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.email_messages e
    WHERE e.id = email_id AND is_workspace_member(auth.uid(), e.workspace_id)
  ));

CREATE POLICY "Team members can delete message tags"
  ON public.email_message_tags FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.email_messages e
    WHERE e.id = email_id AND is_workspace_member(auth.uid(), e.workspace_id)
  ));

-- RLS Policies for email_message_categories (via email's workspace)
CREATE POLICY "Team members can view message categories"
  ON public.email_message_categories FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.email_messages e
    WHERE e.id = email_id AND is_workspace_member(auth.uid(), e.workspace_id)
  ));

CREATE POLICY "Team members can create message categories"
  ON public.email_message_categories FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.email_messages e
    WHERE e.id = email_id AND is_workspace_member(auth.uid(), e.workspace_id)
  ));

CREATE POLICY "Team members can update message categories"
  ON public.email_message_categories FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.email_messages e
    WHERE e.id = email_id AND is_workspace_member(auth.uid(), e.workspace_id)
  ));

CREATE POLICY "Team members can delete message categories"
  ON public.email_message_categories FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.email_messages e
    WHERE e.id = email_id AND is_workspace_member(auth.uid(), e.workspace_id)
  ));

-- RLS Policies for email_visibility_groups
CREATE POLICY "Team members can view visibility groups in their workspace"
  ON public.email_visibility_groups FOR SELECT
  USING (is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "Team members can create visibility groups"
  ON public.email_visibility_groups FOR INSERT
  WITH CHECK (is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "Team members can update visibility groups in their workspace"
  ON public.email_visibility_groups FOR UPDATE
  USING (is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "Team members can delete visibility groups in their workspace"
  ON public.email_visibility_groups FOR DELETE
  USING (is_workspace_member(auth.uid(), workspace_id));

-- RLS Policies for email_visibility_group_members (via group's workspace)
CREATE POLICY "Team members can view group members"
  ON public.email_visibility_group_members FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.email_visibility_groups g
    WHERE g.id = group_id AND is_workspace_member(auth.uid(), g.workspace_id)
  ));

CREATE POLICY "Team members can manage group members"
  ON public.email_visibility_group_members FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.email_visibility_groups g
    WHERE g.id = group_id AND is_workspace_member(auth.uid(), g.workspace_id)
  ));

CREATE POLICY "Team members can delete group members"
  ON public.email_visibility_group_members FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.email_visibility_groups g
    WHERE g.id = group_id AND is_workspace_member(auth.uid(), g.workspace_id)
  ));

-- RLS Policies for extracted_invoices
CREATE POLICY "Team members can view invoices in their workspace"
  ON public.extracted_invoices FOR SELECT
  USING (is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "Team members can create invoices"
  ON public.extracted_invoices FOR INSERT
  WITH CHECK (is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "Team members can update invoices in their workspace"
  ON public.extracted_invoices FOR UPDATE
  USING (is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "Team members can delete invoices in their workspace"
  ON public.extracted_invoices FOR DELETE
  USING (is_workspace_member(auth.uid(), workspace_id));

-- Create updated_at triggers for tables that need it
CREATE TRIGGER update_email_categories_updated_at
  BEFORE UPDATE ON public.email_categories
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_email_rules_updated_at
  BEFORE UPDATE ON public.email_rules
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for performance
CREATE INDEX idx_email_categories_workspace ON public.email_categories(workspace_id);
CREATE INDEX idx_email_rules_workspace ON public.email_rules(workspace_id);
CREATE INDEX idx_email_rules_category ON public.email_rules(category_id);
CREATE INDEX idx_email_rule_actions_rule ON public.email_rule_actions(rule_id);
CREATE INDEX idx_email_tags_workspace ON public.email_tags(workspace_id);
CREATE INDEX idx_email_message_tags_email ON public.email_message_tags(email_id);
CREATE INDEX idx_email_message_tags_tag ON public.email_message_tags(tag_id);
CREATE INDEX idx_email_message_categories_email ON public.email_message_categories(email_id);
CREATE INDEX idx_email_visibility_groups_workspace ON public.email_visibility_groups(workspace_id);
CREATE INDEX idx_email_visibility_group_members_group ON public.email_visibility_group_members(group_id);
CREATE INDEX idx_extracted_invoices_workspace ON public.extracted_invoices(workspace_id);
CREATE INDEX idx_extracted_invoices_email ON public.extracted_invoices(email_id);
CREATE INDEX idx_email_messages_category ON public.email_messages(category_id);
CREATE INDEX idx_email_messages_visibility_group ON public.email_messages(visibility_group_id);
CREATE INDEX idx_email_messages_is_processed ON public.email_messages(is_processed);