
# Plan: Split Suppliers into Product Suppliers and Expense Suppliers

## Overview
Splitting the current "Suppliers" entity into two distinct types:
1. **Product Suppliers** - Vendors selling products for resale (electronics, mobile phones, etc.)
2. **Expense Suppliers** - Vendors providing services/expenses (travel, marketing, SaaS tools, etc.)

## Database Changes

### Step 1: Rename Existing Table and Role
The existing `suppliers` table will be renamed to `product_suppliers`, and the associated entity role will be updated.

### Step 2: Create New expense_suppliers Table
A new table for expense suppliers with the same structure.

### Step 3: Update Junction Table
The `email_suppliers` junction table will be renamed to `email_product_suppliers` and a new `email_expense_suppliers` table will be created.

## Visual Changes

### Sidebar Navigation (Before → After)

| Before | After |
|--------|-------|
| Suppliers (blue, Truck icon) | Product Suppliers (blue, Package icon) |
| | Expense Suppliers (orange, Receipt icon) |

```text
ORGANISATIONS
├── Influencers (pink)
├── Resellers (green)
├── Product Suppliers (blue) ← Renamed
├── Expense Suppliers (orange) ← NEW
├── Corporate Management (cyan)
├── Personal Contacts (purple)
└── Subscriptions (amber)
```

## Files to Change

| File | Change |
|------|--------|
| `src/types/entities.ts` | Replace `Supplier` with `ProductSupplier` and add `ExpenseSupplier` |
| `src/types/activities.ts` | Update `EntityTable` type and labels |
| `src/types/roles.ts` | Update `ENTITY_TABLE_CONFIG` with both supplier types |
| `src/pages/Suppliers.tsx` | Rename to `ProductSuppliers.tsx` |
| `src/pages/ExpenseSuppliers.tsx` | Create new page |
| `src/components/layout/CRMSidebar.tsx` | Update navigation with both supplier types |
| `src/App.tsx` | Update routes |
| `src/hooks/use-email-entities.ts` | Update to use `product_suppliers` table |

## Technical Details

### Database Migration

```sql
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
```

### Type Definitions

```typescript
// src/types/entities.ts
export interface ProductSupplier {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  notes: string | null;
  avatar_url: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface ExpenseSupplier {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  notes: string | null;
  avatar_url: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export type EntityType = 
  | "influencers" 
  | "resellers" 
  | "product_suppliers"
  | "expense_suppliers"
  | "corporate_management" 
  | "personal_contacts" 
  | "subscriptions";
```

### Page Components

```typescript
// src/pages/ProductSuppliers.tsx
import EntityList from "./EntityList";

export default function ProductSuppliers() {
  return (
    <EntityList
      entityType="product_suppliers"
      title="Product Suppliers"
      singularTitle="Product Supplier"
      color="#3b82f6"
    />
  );
}

// src/pages/ExpenseSuppliers.tsx
import EntityList from "./EntityList";

export default function ExpenseSuppliers() {
  return (
    <EntityList
      entityType="expense_suppliers"
      title="Expense Suppliers"
      singularTitle="Expense Supplier"
      color="#f97316"
    />
  );
}
```

## Implementation Order

1. Run database migration to rename table, create new table, update roles, and update junction tables
2. Update TypeScript types (`entities.ts`, `activities.ts`, `roles.ts`)
3. Rename `Suppliers.tsx` to `ProductSuppliers.tsx` and update contents
4. Create `ExpenseSuppliers.tsx` page
5. Update routes in `App.tsx`
6. Update sidebar navigation in `CRMSidebar.tsx`
7. Update `use-email-entities.ts` hook for new table names

## Existing Data
All 12 existing suppliers will remain in the renamed `product_suppliers` table. You can manually move any that are expense-related to the new `expense_suppliers` table after implementation.

## Features Included
Both entity types will automatically support:
- Spreadsheet-style list view with selection
- Detail panel with Home, Tasks, Notes, and Files tabs
- CRUD operations
- Role-based access control (separate manager roles for each)
- File attachments
- Email linking
