-- Create personal_contacts table
CREATE TABLE public.personal_contacts (
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

-- Enable RLS
ALTER TABLE public.personal_contacts ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (same pattern as other entities)
CREATE POLICY "Role-based select for personal_contacts" 
ON public.personal_contacts 
FOR SELECT 
USING (
  has_role(auth.uid(), 'admin'::app_role) 
  OR has_entity_role(auth.uid(), 'personal_contacts'::text)
  OR can_view_record(auth.uid(), id, 'personal_contacts'::text)
);

CREATE POLICY "Role-based insert for personal_contacts" 
ON public.personal_contacts 
FOR INSERT 
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) 
  OR has_entity_role(auth.uid(), 'personal_contacts'::text)
);

CREATE POLICY "Role-based update for personal_contacts" 
ON public.personal_contacts 
FOR UPDATE 
USING (
  has_role(auth.uid(), 'admin'::app_role) 
  OR has_entity_role(auth.uid(), 'personal_contacts'::text)
);

CREATE POLICY "Role-based delete for personal_contacts" 
ON public.personal_contacts 
FOR DELETE 
USING (
  has_role(auth.uid(), 'admin'::app_role) 
  OR has_entity_role(auth.uid(), 'personal_contacts'::text)
);

-- Create trigger for updated_at
CREATE TRIGGER update_personal_contacts_updated_at
BEFORE UPDATE ON public.personal_contacts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create the entity role for Personal Contact Manager
INSERT INTO public.entity_roles (name, slug, entity_table, description)
VALUES ('Personal Contact Manager', 'personal_contact_manager', 'personal_contacts', 'Full access to Personal Contacts and linked People');