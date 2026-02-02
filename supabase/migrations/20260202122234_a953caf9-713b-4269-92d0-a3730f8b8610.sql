-- Drop old RLS policies and create new ones for affiliates
DROP POLICY IF EXISTS "Role-based delete for influencers" ON public.affiliates;
DROP POLICY IF EXISTS "Role-based insert for influencers" ON public.affiliates;
DROP POLICY IF EXISTS "Role-based select for influencers" ON public.affiliates;
DROP POLICY IF EXISTS "Role-based update for influencers" ON public.affiliates;

CREATE POLICY "Role-based delete for affiliates" ON public.affiliates FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role) OR has_entity_role(auth.uid(), 'affiliates'::text));
CREATE POLICY "Role-based insert for affiliates" ON public.affiliates FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_entity_role(auth.uid(), 'affiliates'::text));
CREATE POLICY "Role-based select for affiliates" ON public.affiliates FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role) OR has_entity_role(auth.uid(), 'affiliates'::text) OR can_view_record(auth.uid(), id, 'affiliates'::text));
CREATE POLICY "Role-based update for affiliates" ON public.affiliates FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role) OR has_entity_role(auth.uid(), 'affiliates'::text));

-- Drop old RLS policies and create new ones for services_suppliers
DROP POLICY IF EXISTS "Role-based delete for expense_suppliers" ON public.services_suppliers;
DROP POLICY IF EXISTS "Role-based insert for expense_suppliers" ON public.services_suppliers;
DROP POLICY IF EXISTS "Role-based select for expense_suppliers" ON public.services_suppliers;
DROP POLICY IF EXISTS "Role-based update for expense_suppliers" ON public.services_suppliers;

CREATE POLICY "Role-based delete for services_suppliers" ON public.services_suppliers FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role) OR has_entity_role(auth.uid(), 'services_suppliers'::text));
CREATE POLICY "Role-based insert for services_suppliers" ON public.services_suppliers FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_entity_role(auth.uid(), 'services_suppliers'::text));
CREATE POLICY "Role-based select for services_suppliers" ON public.services_suppliers FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role) OR has_entity_role(auth.uid(), 'services_suppliers'::text) OR can_view_record(auth.uid(), id, 'services_suppliers'::text));
CREATE POLICY "Role-based update for services_suppliers" ON public.services_suppliers FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role) OR has_entity_role(auth.uid(), 'services_suppliers'::text));

-- Drop old RLS policies and create new ones for email_affiliates
DROP POLICY IF EXISTS "Role-based delete for email_influencers" ON public.email_affiliates;
DROP POLICY IF EXISTS "Role-based insert for email_influencers" ON public.email_affiliates;
DROP POLICY IF EXISTS "Role-based select for email_influencers" ON public.email_affiliates;

CREATE POLICY "Role-based delete for email_affiliates" ON public.email_affiliates FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role) OR has_entity_role(auth.uid(), 'affiliates'::text));
CREATE POLICY "Role-based insert for email_affiliates" ON public.email_affiliates FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_entity_role(auth.uid(), 'affiliates'::text));
CREATE POLICY "Role-based select for email_affiliates" ON public.email_affiliates FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role) OR has_entity_role(auth.uid(), 'affiliates'::text) OR (EXISTS ( SELECT 1 FROM email_messages e WHERE ((e.id = email_affiliates.email_id) AND (e.user_id = auth.uid())))));

-- Drop old RLS policies and create new ones for email_services_suppliers
DROP POLICY IF EXISTS "Role-based delete for email_expense_suppliers" ON public.email_services_suppliers;
DROP POLICY IF EXISTS "Role-based insert for email_expense_suppliers" ON public.email_services_suppliers;
DROP POLICY IF EXISTS "Role-based select for email_expense_suppliers" ON public.email_services_suppliers;

CREATE POLICY "Role-based delete for email_services_suppliers" ON public.email_services_suppliers FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role) OR has_entity_role(auth.uid(), 'services_suppliers'::text));
CREATE POLICY "Role-based insert for email_services_suppliers" ON public.email_services_suppliers FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_entity_role(auth.uid(), 'services_suppliers'::text));
CREATE POLICY "Role-based select for email_services_suppliers" ON public.email_services_suppliers FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role) OR has_entity_role(auth.uid(), 'services_suppliers'::text) OR (EXISTS ( SELECT 1 FROM email_messages e WHERE ((e.id = email_services_suppliers.email_id) AND (e.user_id = auth.uid())))));