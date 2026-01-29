-- Step 1: Rename suppliers table to product_suppliers
ALTER TABLE public.suppliers RENAME TO product_suppliers;

-- Step 2: Drop existing RLS policies on the renamed table
DROP POLICY IF EXISTS "Role-based select for suppliers" ON public.product_suppliers;
DROP POLICY IF EXISTS "Role-based insert for suppliers" ON public.product_suppliers;
DROP POLICY IF EXISTS "Role-based update for suppliers" ON public.product_suppliers;
DROP POLICY IF EXISTS "Role-based delete for suppliers" ON public.product_suppliers;

-- Step 3: Create new RLS policies for product_suppliers
CREATE POLICY "Role-based select for product_suppliers"
  ON public.product_suppliers FOR SELECT
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_entity_role(auth.uid(), 'product_suppliers')
    OR can_view_record(auth.uid(), id, 'product_suppliers')
  );

CREATE POLICY "Role-based insert for product_suppliers"
  ON public.product_suppliers FOR INSERT
  WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_entity_role(auth.uid(), 'product_suppliers')
  );

CREATE POLICY "Role-based update for product_suppliers"
  ON public.product_suppliers FOR UPDATE
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_entity_role(auth.uid(), 'product_suppliers')
  );

CREATE POLICY "Role-based delete for product_suppliers"
  ON public.product_suppliers FOR DELETE
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_entity_role(auth.uid(), 'product_suppliers')
  );

-- Step 4: Update entity role
UPDATE public.entity_roles 
SET name = 'Product Supplier Manager',
    slug = 'product_supplier_manager',
    entity_table = 'product_suppliers',
    description = 'Full access to Product Suppliers and linked People'
WHERE entity_table = 'suppliers';

-- Step 5: Rename email_suppliers junction table
ALTER TABLE public.email_suppliers RENAME TO email_product_suppliers;
ALTER TABLE public.email_product_suppliers RENAME COLUMN supplier_id TO product_supplier_id;

-- Step 6: Update RLS policies on email_product_suppliers
DROP POLICY IF EXISTS "Role-based select for email_suppliers" ON public.email_product_suppliers;
DROP POLICY IF EXISTS "Role-based insert for email_suppliers" ON public.email_product_suppliers;
DROP POLICY IF EXISTS "Role-based delete for email_suppliers" ON public.email_product_suppliers;

CREATE POLICY "Role-based select for email_product_suppliers"
  ON public.email_product_suppliers FOR SELECT
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_entity_role(auth.uid(), 'product_suppliers')
    OR EXISTS (
      SELECT 1 FROM email_messages e
      WHERE e.id = email_product_suppliers.email_id AND e.user_id = auth.uid()
    )
  );

CREATE POLICY "Role-based insert for email_product_suppliers"
  ON public.email_product_suppliers FOR INSERT
  WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_entity_role(auth.uid(), 'product_suppliers')
  );

CREATE POLICY "Role-based delete for email_product_suppliers"
  ON public.email_product_suppliers FOR DELETE
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_entity_role(auth.uid(), 'product_suppliers')
  );

-- Step 7: Create expense_suppliers table
CREATE TABLE public.expense_suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text,
  phone text,
  notes text,
  avatar_url text,
  created_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Step 8: Enable RLS on expense_suppliers
ALTER TABLE public.expense_suppliers ENABLE ROW LEVEL SECURITY;

-- Step 9: Create RLS policies for expense_suppliers
CREATE POLICY "Role-based select for expense_suppliers"
  ON public.expense_suppliers FOR SELECT
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_entity_role(auth.uid(), 'expense_suppliers')
    OR can_view_record(auth.uid(), id, 'expense_suppliers')
  );

CREATE POLICY "Role-based insert for expense_suppliers"
  ON public.expense_suppliers FOR INSERT
  WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_entity_role(auth.uid(), 'expense_suppliers')
  );

CREATE POLICY "Role-based update for expense_suppliers"
  ON public.expense_suppliers FOR UPDATE
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_entity_role(auth.uid(), 'expense_suppliers')
  );

CREATE POLICY "Role-based delete for expense_suppliers"
  ON public.expense_suppliers FOR DELETE
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_entity_role(auth.uid(), 'expense_suppliers')
  );

-- Step 10: Add trigger for updated_at
CREATE TRIGGER update_expense_suppliers_updated_at
  BEFORE UPDATE ON public.expense_suppliers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Step 11: Create expense supplier manager role
INSERT INTO public.entity_roles (name, slug, entity_table, description)
VALUES (
  'Expense Supplier Manager',
  'expense_supplier_manager',
  'expense_suppliers',
  'Full access to Expense Suppliers and linked People'
);

-- Step 12: Create email_expense_suppliers junction table
CREATE TABLE public.email_expense_suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email_id uuid NOT NULL,
  expense_supplier_id uuid NOT NULL,
  assigned_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.email_expense_suppliers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Role-based select for email_expense_suppliers"
  ON public.email_expense_suppliers FOR SELECT
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_entity_role(auth.uid(), 'expense_suppliers')
    OR EXISTS (
      SELECT 1 FROM email_messages e
      WHERE e.id = email_expense_suppliers.email_id AND e.user_id = auth.uid()
    )
  );

CREATE POLICY "Role-based insert for email_expense_suppliers"
  ON public.email_expense_suppliers FOR INSERT
  WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_entity_role(auth.uid(), 'expense_suppliers')
  );

CREATE POLICY "Role-based delete for email_expense_suppliers"
  ON public.email_expense_suppliers FOR DELETE
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_entity_role(auth.uid(), 'expense_suppliers')
  );