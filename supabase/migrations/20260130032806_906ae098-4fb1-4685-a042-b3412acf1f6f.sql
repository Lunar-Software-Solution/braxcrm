-- Rename carriers table to logistic_suppliers
ALTER TABLE public.carriers RENAME TO logistic_suppliers;

-- Rename email_carriers junction table to email_logistic_suppliers
ALTER TABLE public.email_carriers RENAME TO email_logistic_suppliers;

-- Rename the foreign key column in the junction table
ALTER TABLE public.email_logistic_suppliers RENAME COLUMN carrier_id TO logistic_supplier_id;

-- Update entity_roles table
UPDATE public.entity_roles 
SET name = 'Logistic Suppliers Manager', 
    slug = 'logistic_suppliers_manager',
    entity_table = 'logistic_suppliers',
    description = 'Can manage logistic suppliers records'
WHERE slug = 'carriers_manager';

-- Update email_tags
UPDATE public.email_tags 
SET name = 'Logistic Supplier' 
WHERE name = 'Carrier';

-- Drop old RLS policies on logistic_suppliers (renamed from carriers)
DROP POLICY IF EXISTS "Role-based delete for carriers" ON public.logistic_suppliers;
DROP POLICY IF EXISTS "Role-based insert for carriers" ON public.logistic_suppliers;
DROP POLICY IF EXISTS "Role-based select for carriers" ON public.logistic_suppliers;
DROP POLICY IF EXISTS "Role-based update for carriers" ON public.logistic_suppliers;

-- Create new RLS policies for logistic_suppliers
CREATE POLICY "Role-based select for logistic_suppliers" ON public.logistic_suppliers
  FOR SELECT USING (
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_entity_role(auth.uid(), 'logistic_suppliers'::text) OR
    can_view_record(auth.uid(), id, 'logistic_suppliers'::text)
  );

CREATE POLICY "Role-based insert for logistic_suppliers" ON public.logistic_suppliers
  FOR INSERT WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_entity_role(auth.uid(), 'logistic_suppliers'::text)
  );

CREATE POLICY "Role-based update for logistic_suppliers" ON public.logistic_suppliers
  FOR UPDATE USING (
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_entity_role(auth.uid(), 'logistic_suppliers'::text)
  );

CREATE POLICY "Role-based delete for logistic_suppliers" ON public.logistic_suppliers
  FOR DELETE USING (
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_entity_role(auth.uid(), 'logistic_suppliers'::text)
  );

-- Drop old RLS policies on email_logistic_suppliers (renamed from email_carriers)
DROP POLICY IF EXISTS "Role-based delete for email_carriers" ON public.email_logistic_suppliers;
DROP POLICY IF EXISTS "Role-based insert for email_carriers" ON public.email_logistic_suppliers;
DROP POLICY IF EXISTS "Role-based select for email_carriers" ON public.email_logistic_suppliers;

-- Create new RLS policies for email_logistic_suppliers
CREATE POLICY "Role-based select for email_logistic_suppliers" ON public.email_logistic_suppliers
  FOR SELECT USING (
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_entity_role(auth.uid(), 'logistic_suppliers'::text) OR
    EXISTS (SELECT 1 FROM email_messages e WHERE e.id = email_logistic_suppliers.email_id AND e.user_id = auth.uid())
  );

CREATE POLICY "Role-based insert for email_logistic_suppliers" ON public.email_logistic_suppliers
  FOR INSERT WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_entity_role(auth.uid(), 'logistic_suppliers'::text)
  );

CREATE POLICY "Role-based delete for email_logistic_suppliers" ON public.email_logistic_suppliers
  FOR DELETE USING (
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_entity_role(auth.uid(), 'logistic_suppliers'::text)
  );