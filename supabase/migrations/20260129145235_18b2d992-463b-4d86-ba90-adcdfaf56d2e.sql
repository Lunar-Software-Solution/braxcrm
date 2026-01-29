-- Update personal_contacts RLS policies to allow users to see their own contacts

-- Drop existing policies
DROP POLICY IF EXISTS "Role-based select for personal_contacts" ON public.personal_contacts;
DROP POLICY IF EXISTS "Role-based insert for personal_contacts" ON public.personal_contacts;
DROP POLICY IF EXISTS "Role-based update for personal_contacts" ON public.personal_contacts;
DROP POLICY IF EXISTS "Role-based delete for personal_contacts" ON public.personal_contacts;

-- Recreate policies that include created_by check for personal access
CREATE POLICY "Role-based select for personal_contacts" 
ON public.personal_contacts 
FOR SELECT 
USING (
  has_role(auth.uid(), 'admin'::app_role) 
  OR created_by = auth.uid()
  OR has_entity_role(auth.uid(), 'personal_contacts'::text) 
  OR can_view_record(auth.uid(), id, 'personal_contacts'::text)
);

CREATE POLICY "Role-based insert for personal_contacts" 
ON public.personal_contacts 
FOR INSERT 
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) 
  OR created_by = auth.uid()
  OR has_entity_role(auth.uid(), 'personal_contacts'::text)
);

CREATE POLICY "Role-based update for personal_contacts" 
ON public.personal_contacts 
FOR UPDATE 
USING (
  has_role(auth.uid(), 'admin'::app_role) 
  OR created_by = auth.uid()
  OR has_entity_role(auth.uid(), 'personal_contacts'::text)
);

CREATE POLICY "Role-based delete for personal_contacts" 
ON public.personal_contacts 
FOR DELETE 
USING (
  has_role(auth.uid(), 'admin'::app_role) 
  OR created_by = auth.uid()
  OR has_entity_role(auth.uid(), 'personal_contacts'::text)
);