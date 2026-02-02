-- Update RLS policies for vigile_partners (drop old resellers policies and create new ones)
DROP POLICY IF EXISTS "Role-based select for resellers" ON public.vigile_partners;
DROP POLICY IF EXISTS "Role-based insert for resellers" ON public.vigile_partners;
DROP POLICY IF EXISTS "Role-based update for resellers" ON public.vigile_partners;
DROP POLICY IF EXISTS "Role-based delete for resellers" ON public.vigile_partners;

CREATE POLICY "Role-based select for vigile_partners" ON public.vigile_partners
FOR SELECT USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_entity_role(auth.uid(), 'vigile_partners'::text) OR 
  can_view_record(auth.uid(), id, 'vigile_partners'::text)
);

CREATE POLICY "Role-based insert for vigile_partners" ON public.vigile_partners
FOR INSERT WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_entity_role(auth.uid(), 'vigile_partners'::text)
);

CREATE POLICY "Role-based update for vigile_partners" ON public.vigile_partners
FOR UPDATE USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_entity_role(auth.uid(), 'vigile_partners'::text)
);

CREATE POLICY "Role-based delete for vigile_partners" ON public.vigile_partners
FOR DELETE USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_entity_role(auth.uid(), 'vigile_partners'::text)
);

-- Update RLS policies for email_vigile_partners (drop old email_resellers policies)
DROP POLICY IF EXISTS "Role-based select for email_resellers" ON public.email_vigile_partners;
DROP POLICY IF EXISTS "Role-based insert for email_resellers" ON public.email_vigile_partners;
DROP POLICY IF EXISTS "Role-based delete for email_resellers" ON public.email_vigile_partners;

CREATE POLICY "Role-based select for email_vigile_partners" ON public.email_vigile_partners
FOR SELECT USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_entity_role(auth.uid(), 'vigile_partners'::text) OR 
  EXISTS (SELECT 1 FROM email_messages e WHERE e.id = email_vigile_partners.email_id AND e.user_id = auth.uid())
);

CREATE POLICY "Role-based insert for email_vigile_partners" ON public.email_vigile_partners
FOR INSERT WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_entity_role(auth.uid(), 'vigile_partners'::text)
);

CREATE POLICY "Role-based delete for email_vigile_partners" ON public.email_vigile_partners
FOR DELETE USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_entity_role(auth.uid(), 'vigile_partners'::text)
);