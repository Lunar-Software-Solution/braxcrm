-- Phase 1: Replace Companies with Objects System

-- 1. Create object_types table
CREATE TABLE public.object_types (
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

-- 2. Create person_object_types junction table
CREATE TABLE public.person_object_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id UUID NOT NULL REFERENCES public.people(id) ON DELETE CASCADE,
  object_type_id UUID NOT NULL REFERENCES public.object_types(id) ON DELETE CASCADE,
  assigned_by UUID,
  assigned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  source TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'email_rule', 'ai_suggestion')),
  UNIQUE(person_id, object_type_id)
);

-- 3. Create email_object_types junction table
CREATE TABLE public.email_object_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email_id UUID NOT NULL REFERENCES public.email_messages(id) ON DELETE CASCADE,
  object_type_id UUID NOT NULL REFERENCES public.object_types(id) ON DELETE CASCADE,
  assigned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(email_id, object_type_id)
);

-- 4. Add assign_object_type to the rule_action_type enum
ALTER TYPE public.rule_action_type ADD VALUE 'assign_object_type';

-- 5. Enable RLS on all new tables
ALTER TABLE public.object_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.person_object_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_object_types ENABLE ROW LEVEL SECURITY;

-- 6. RLS policies for object_types
CREATE POLICY "Team members can view object types in their workspace"
  ON public.object_types FOR SELECT
  USING (is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "Team members can create object types"
  ON public.object_types FOR INSERT
  WITH CHECK (is_workspace_member(auth.uid(), workspace_id) AND auth.uid() = created_by);

CREATE POLICY "Team members can update object types in their workspace"
  ON public.object_types FOR UPDATE
  USING (is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "Team members can delete object types in their workspace"
  ON public.object_types FOR DELETE
  USING (is_workspace_member(auth.uid(), workspace_id));

-- 7. RLS policies for person_object_types (check through people table)
CREATE POLICY "Team members can view person object types"
  ON public.person_object_types FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.people p
    WHERE p.id = person_object_types.person_id
    AND is_workspace_member(auth.uid(), p.workspace_id)
  ));

CREATE POLICY "Team members can create person object types"
  ON public.person_object_types FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.people p
    WHERE p.id = person_object_types.person_id
    AND is_workspace_member(auth.uid(), p.workspace_id)
  ));

CREATE POLICY "Team members can delete person object types"
  ON public.person_object_types FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.people p
    WHERE p.id = person_object_types.person_id
    AND is_workspace_member(auth.uid(), p.workspace_id)
  ));

-- 8. RLS policies for email_object_types (check through email_messages table)
CREATE POLICY "Team members can view email object types"
  ON public.email_object_types FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.email_messages e
    WHERE e.id = email_object_types.email_id
    AND is_workspace_member(auth.uid(), e.workspace_id)
  ));

CREATE POLICY "Team members can create email object types"
  ON public.email_object_types FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.email_messages e
    WHERE e.id = email_object_types.email_id
    AND is_workspace_member(auth.uid(), e.workspace_id)
  ));

CREATE POLICY "Team members can delete email object types"
  ON public.email_object_types FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.email_messages e
    WHERE e.id = email_object_types.email_id
    AND is_workspace_member(auth.uid(), e.workspace_id)
  ));

-- 9. Add updated_at trigger for object_types
CREATE TRIGGER update_object_types_updated_at
  BEFORE UPDATE ON public.object_types
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 10. Remove company_id from people table
ALTER TABLE public.people DROP COLUMN IF EXISTS company_id;

-- 11. Drop companies table (this will also drop its RLS policies)
DROP TABLE IF EXISTS public.companies CASCADE;