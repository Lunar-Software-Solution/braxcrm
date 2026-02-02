-- Step 1: Rename resellers table to vigile_partners
ALTER TABLE public.resellers RENAME TO vigile_partners;

-- Step 2: Rename email_resellers junction table to email_vigile_partners
ALTER TABLE public.email_resellers RENAME TO email_vigile_partners;

-- Step 3: Rename the reseller_id column to vigile_partner_id
ALTER TABLE public.email_vigile_partners RENAME COLUMN reseller_id TO vigile_partner_id;

-- Step 4: Create brax_distributors table
CREATE TABLE public.brax_distributors (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  notes TEXT,
  avatar_url TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on brax_distributors
ALTER TABLE public.brax_distributors ENABLE ROW LEVEL SECURITY;

-- RLS policies for brax_distributors
CREATE POLICY "Role-based select for brax_distributors" ON public.brax_distributors
FOR SELECT USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_entity_role(auth.uid(), 'brax_distributors'::text) OR 
  can_view_record(auth.uid(), id, 'brax_distributors'::text)
);

CREATE POLICY "Role-based insert for brax_distributors" ON public.brax_distributors
FOR INSERT WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_entity_role(auth.uid(), 'brax_distributors'::text)
);

CREATE POLICY "Role-based update for brax_distributors" ON public.brax_distributors
FOR UPDATE USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_entity_role(auth.uid(), 'brax_distributors'::text)
);

CREATE POLICY "Role-based delete for brax_distributors" ON public.brax_distributors
FOR DELETE USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_entity_role(auth.uid(), 'brax_distributors'::text)
);

-- Create updated_at trigger for brax_distributors
CREATE TRIGGER update_brax_distributors_updated_at
  BEFORE UPDATE ON public.brax_distributors
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Step 5: Create email_brax_distributors junction table
CREATE TABLE public.email_brax_distributors (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email_id UUID NOT NULL REFERENCES public.email_messages(id) ON DELETE CASCADE,
  brax_distributor_id UUID NOT NULL REFERENCES public.brax_distributors(id) ON DELETE CASCADE,
  assigned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(email_id, brax_distributor_id)
);

-- Enable RLS on email_brax_distributors
ALTER TABLE public.email_brax_distributors ENABLE ROW LEVEL SECURITY;

-- RLS policies for email_brax_distributors
CREATE POLICY "Role-based select for email_brax_distributors" ON public.email_brax_distributors
FOR SELECT USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_entity_role(auth.uid(), 'brax_distributors'::text) OR 
  EXISTS (SELECT 1 FROM email_messages e WHERE e.id = email_brax_distributors.email_id AND e.user_id = auth.uid())
);

CREATE POLICY "Role-based insert for email_brax_distributors" ON public.email_brax_distributors
FOR INSERT WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_entity_role(auth.uid(), 'brax_distributors'::text)
);

CREATE POLICY "Role-based delete for email_brax_distributors" ON public.email_brax_distributors
FOR DELETE USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_entity_role(auth.uid(), 'brax_distributors'::text)
);

-- Step 6: Create entity roles for both new entities
INSERT INTO public.entity_roles (entity_table, name, slug, description)
VALUES 
  ('brax_distributors', 'Brax Distributors', 'brax_distributors', 'Access to Brax Distributors entity');

-- Update existing resellers role to vigile_partners
UPDATE public.entity_roles 
SET entity_table = 'vigile_partners', name = 'Vigile Partners', slug = 'vigile_partners', description = 'Access to Vigile Partners entity'
WHERE entity_table = 'resellers' OR slug = 'resellers';

-- Step 7: Update all metadata references from resellers to vigile_partners
UPDATE public.entity_fields SET entity_table = 'vigile_partners' WHERE entity_table = 'resellers';
UPDATE public.entity_field_values SET entity_table = 'vigile_partners' WHERE entity_table = 'resellers';
UPDATE public.entity_files SET entity_table = 'vigile_partners' WHERE entity_table = 'resellers';
UPDATE public.notes SET entity_table = 'vigile_partners' WHERE entity_table = 'resellers';
UPDATE public.opportunities SET entity_table = 'vigile_partners' WHERE entity_table = 'resellers';
UPDATE public.tasks SET entity_table = 'vigile_partners' WHERE entity_table = 'resellers';
UPDATE public.chat_conversations SET entity_table = 'vigile_partners' WHERE entity_table = 'resellers';
UPDATE public.email_messages SET entity_table = 'vigile_partners' WHERE entity_table = 'resellers';
UPDATE public.email_sequences SET entity_table = 'vigile_partners' WHERE entity_table = 'resellers';
UPDATE public.email_triggers SET entity_table = 'vigile_partners' WHERE entity_table = 'resellers';
UPDATE public.entity_automation_rules SET entity_table = 'vigile_partners' WHERE entity_table = 'resellers';