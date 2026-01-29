-- Create enums for task status and priority
CREATE TYPE public.task_status AS ENUM ('todo', 'in_progress', 'completed', 'cancelled');
CREATE TYPE public.task_priority AS ENUM ('low', 'medium', 'high', 'urgent');
CREATE TYPE public.opportunity_stage AS ENUM ('lead', 'qualified', 'proposal', 'negotiation', 'won', 'lost');

-- Create notes table
CREATE TABLE public.notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT,
  content TEXT NOT NULL,
  entity_table TEXT NOT NULL,
  entity_id UUID NOT NULL,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create tasks table
CREATE TABLE public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  entity_table TEXT NOT NULL,
  entity_id UUID NOT NULL,
  status public.task_status NOT NULL DEFAULT 'todo',
  priority public.task_priority NOT NULL DEFAULT 'medium',
  due_date DATE,
  assigned_to UUID,
  created_by UUID NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create opportunities table
CREATE TABLE public.opportunities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  entity_table TEXT NOT NULL,
  entity_id UUID NOT NULL,
  stage public.opportunity_stage NOT NULL DEFAULT 'lead',
  value NUMERIC,
  currency TEXT DEFAULT 'USD',
  probability INTEGER CHECK (probability >= 0 AND probability <= 100),
  expected_close_date DATE,
  closed_at TIMESTAMP WITH TIME ZONE,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.opportunities ENABLE ROW LEVEL SECURITY;

-- Create updated_at triggers
CREATE TRIGGER update_notes_updated_at
  BEFORE UPDATE ON public.notes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tasks_updated_at
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_opportunities_updated_at
  BEFORE UPDATE ON public.opportunities
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- RLS Policies for notes
CREATE POLICY "View notes based on entity access"
ON public.notes FOR SELECT USING (
  has_role(auth.uid(), 'admin') OR
  created_by = auth.uid() OR
  (entity_table = 'people' AND can_view_person_via_entity(auth.uid(), entity_id)) OR
  has_entity_role(auth.uid(), entity_table) OR
  can_view_record(auth.uid(), entity_id, entity_table)
);

CREATE POLICY "Insert notes for accessible entities"
ON public.notes FOR INSERT WITH CHECK (
  has_role(auth.uid(), 'admin') OR
  created_by = auth.uid()
);

CREATE POLICY "Update own notes"
ON public.notes FOR UPDATE USING (
  has_role(auth.uid(), 'admin') OR
  created_by = auth.uid()
);

CREATE POLICY "Delete own notes"
ON public.notes FOR DELETE USING (
  has_role(auth.uid(), 'admin') OR
  created_by = auth.uid()
);

-- RLS Policies for tasks
CREATE POLICY "View tasks based on entity access"
ON public.tasks FOR SELECT USING (
  has_role(auth.uid(), 'admin') OR
  created_by = auth.uid() OR
  assigned_to = auth.uid() OR
  (entity_table = 'people' AND can_view_person_via_entity(auth.uid(), entity_id)) OR
  has_entity_role(auth.uid(), entity_table) OR
  can_view_record(auth.uid(), entity_id, entity_table)
);

CREATE POLICY "Insert tasks for accessible entities"
ON public.tasks FOR INSERT WITH CHECK (
  has_role(auth.uid(), 'admin') OR
  created_by = auth.uid()
);

CREATE POLICY "Update own or assigned tasks"
ON public.tasks FOR UPDATE USING (
  has_role(auth.uid(), 'admin') OR
  created_by = auth.uid() OR
  assigned_to = auth.uid()
);

CREATE POLICY "Delete own tasks"
ON public.tasks FOR DELETE USING (
  has_role(auth.uid(), 'admin') OR
  created_by = auth.uid()
);

-- RLS Policies for opportunities
CREATE POLICY "View opportunities based on entity access"
ON public.opportunities FOR SELECT USING (
  has_role(auth.uid(), 'admin') OR
  created_by = auth.uid() OR
  (entity_table = 'people' AND can_view_person_via_entity(auth.uid(), entity_id)) OR
  has_entity_role(auth.uid(), entity_table) OR
  can_view_record(auth.uid(), entity_id, entity_table)
);

CREATE POLICY "Insert opportunities for accessible entities"
ON public.opportunities FOR INSERT WITH CHECK (
  has_role(auth.uid(), 'admin') OR
  created_by = auth.uid()
);

CREATE POLICY "Update own opportunities"
ON public.opportunities FOR UPDATE USING (
  has_role(auth.uid(), 'admin') OR
  created_by = auth.uid()
);

CREATE POLICY "Delete own opportunities"
ON public.opportunities FOR DELETE USING (
  has_role(auth.uid(), 'admin') OR
  created_by = auth.uid()
);

-- Create indexes for common queries
CREATE INDEX idx_notes_entity ON public.notes(entity_table, entity_id);
CREATE INDEX idx_notes_created_by ON public.notes(created_by);
CREATE INDEX idx_tasks_entity ON public.tasks(entity_table, entity_id);
CREATE INDEX idx_tasks_assigned_to ON public.tasks(assigned_to);
CREATE INDEX idx_tasks_status ON public.tasks(status);
CREATE INDEX idx_tasks_due_date ON public.tasks(due_date);
CREATE INDEX idx_opportunities_entity ON public.opportunities(entity_table, entity_id);
CREATE INDEX idx_opportunities_stage ON public.opportunities(stage);