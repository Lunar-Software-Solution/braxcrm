-- Rename subscriptions table to subscription_suppliers
ALTER TABLE public.subscriptions RENAME TO subscription_suppliers;

-- Rename the junction table 
ALTER TABLE public.email_subscriptions RENAME TO email_subscription_suppliers;

-- Rename the foreign key column in the junction table
ALTER TABLE public.email_subscription_suppliers RENAME COLUMN subscription_id TO subscription_supplier_id;

-- Update entity_roles for this entity type
UPDATE public.entity_roles 
SET entity_table = 'subscription_suppliers', 
    slug = 'subscription_suppliers',
    name = 'Subscription Suppliers'
WHERE entity_table = 'subscriptions';

-- Update any entity_fields that reference subscriptions
UPDATE public.entity_fields 
SET entity_table = 'subscription_suppliers' 
WHERE entity_table = 'subscriptions';

-- Update any entity_field_values that reference subscriptions
UPDATE public.entity_field_values 
SET entity_table = 'subscription_suppliers' 
WHERE entity_table = 'subscriptions';

-- Update any entity_files that reference subscriptions
UPDATE public.entity_files 
SET entity_table = 'subscription_suppliers' 
WHERE entity_table = 'subscriptions';

-- Update any entity_automation_rules that reference subscriptions
UPDATE public.entity_automation_rules 
SET entity_table = 'subscription_suppliers' 
WHERE entity_table = 'subscriptions';

-- Update any email_sequences that reference subscriptions
UPDATE public.email_sequences 
SET entity_table = 'subscription_suppliers' 
WHERE entity_table = 'subscriptions';

-- Update any email_triggers that reference subscriptions
UPDATE public.email_triggers 
SET entity_table = 'subscription_suppliers' 
WHERE entity_table = 'subscriptions';

-- Rename index
ALTER INDEX IF EXISTS idx_subscriptions_status RENAME TO idx_subscription_suppliers_status;

-- Drop existing RLS policies on renamed tables and recreate them
DROP POLICY IF EXISTS "Role-based delete for email_subscriptions" ON public.email_subscription_suppliers;
DROP POLICY IF EXISTS "Role-based insert for email_subscriptions" ON public.email_subscription_suppliers;
DROP POLICY IF EXISTS "Role-based select for email_subscriptions" ON public.email_subscription_suppliers;

-- Recreate RLS policies for junction table
CREATE POLICY "Role-based delete for email_subscription_suppliers" 
ON public.email_subscription_suppliers 
FOR DELETE 
USING (has_role(auth.uid(), 'admin'::app_role) OR has_entity_role(auth.uid(), 'subscription_suppliers'::text));

CREATE POLICY "Role-based insert for email_subscription_suppliers" 
ON public.email_subscription_suppliers 
FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_entity_role(auth.uid(), 'subscription_suppliers'::text));

CREATE POLICY "Role-based select for email_subscription_suppliers" 
ON public.email_subscription_suppliers 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role) OR has_entity_role(auth.uid(), 'subscription_suppliers'::text) OR (EXISTS ( SELECT 1
   FROM email_messages e
  WHERE ((e.id = email_subscription_suppliers.email_id) AND (e.user_id = auth.uid())))));

-- Drop and recreate RLS policies for main table with new name
DROP POLICY IF EXISTS "Role-based delete for subscriptions" ON public.subscription_suppliers;
DROP POLICY IF EXISTS "Role-based insert for subscriptions" ON public.subscription_suppliers;
DROP POLICY IF EXISTS "Role-based select for subscriptions" ON public.subscription_suppliers;
DROP POLICY IF EXISTS "Role-based update for subscriptions" ON public.subscription_suppliers;

CREATE POLICY "Role-based delete for subscription_suppliers" 
ON public.subscription_suppliers 
FOR DELETE 
USING (has_role(auth.uid(), 'admin'::app_role) OR has_entity_role(auth.uid(), 'subscription_suppliers'::text));

CREATE POLICY "Role-based insert for subscription_suppliers" 
ON public.subscription_suppliers 
FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_entity_role(auth.uid(), 'subscription_suppliers'::text));

CREATE POLICY "Role-based select for subscription_suppliers" 
ON public.subscription_suppliers 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role) OR has_entity_role(auth.uid(), 'subscription_suppliers'::text) OR can_view_record(auth.uid(), id, 'subscription_suppliers'::text));

CREATE POLICY "Role-based update for subscription_suppliers" 
ON public.subscription_suppliers 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'::app_role) OR has_entity_role(auth.uid(), 'subscription_suppliers'::text));