
# Plan: Add Subscriptions Entity Type

## Overview
Adding a new "Subscriptions" entity type to track subscription-based services (like Lovable, SaaS tools, etc.). This will follow the same pattern as the existing entities (Influencers, Resellers, Suppliers, etc.).

## What Will Be Created

### 1. Database Table
A new `subscriptions` table with the same core fields as other entities:
- `id` - UUID primary key
- `name` - Subscription/service name (e.g., "Lovable", "GitHub", "Figma")
- `email` - Contact email for the subscription
- `phone` - Contact phone
- `notes` - Additional notes
- `avatar_url` - Logo/avatar for the service
- `created_by` - User who created the record
- `created_at` / `updated_at` - Timestamps

### 2. Security (RLS Policies)
Following the existing RBAC pattern:
- Admins can do everything
- Users with "Subscription Manager" role can manage all subscription records
- Users can view records assigned to them via `record_role_assignments`

### 3. Entity Role
A new entry in `entity_roles` table:
- Name: "Subscription Manager"
- Slug: `subscription_manager`
- Entity table: `subscriptions`

### 4. Frontend Changes

| File | Change |
|------|--------|
| `src/types/entities.ts` | Add `Subscription` interface and update `EntityType` union |
| `src/types/activities.ts` | Add `subscriptions` to `EntityTable` type |
| `src/types/roles.ts` | Add subscriptions to `ENTITY_TABLE_CONFIG` |
| `src/pages/Subscriptions.tsx` | New page using `EntityList` component |
| `src/components/layout/CRMSidebar.tsx` | Add navigation link with `CreditCard` icon |
| `src/App.tsx` | Add route for `/subscriptions` |

## Visual Preview

The Subscriptions page will appear in the sidebar under "ORGANISATIONS" with an orange/amber color theme and a credit card icon:

```text
ORGANISATIONS
├── Influencers (pink)
├── Resellers (green)
├── Suppliers (blue)
├── Corporate Management (cyan)
├── Personal Contacts (purple)
└── Subscriptions (amber) ← NEW
```

## Technical Details

### Database Migration SQL
```sql
-- Create subscriptions table
CREATE TABLE public.subscriptions (
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

-- Enable RLS
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- RLS Policies (same pattern as other entities)
CREATE POLICY "Role-based select for subscriptions"
  ON public.subscriptions FOR SELECT
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_entity_role(auth.uid(), 'subscriptions')
    OR can_view_record(auth.uid(), id, 'subscriptions')
  );

CREATE POLICY "Role-based insert for subscriptions"
  ON public.subscriptions FOR INSERT
  WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_entity_role(auth.uid(), 'subscriptions')
  );

CREATE POLICY "Role-based update for subscriptions"
  ON public.subscriptions FOR UPDATE
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_entity_role(auth.uid(), 'subscriptions')
  );

CREATE POLICY "Role-based delete for subscriptions"
  ON public.subscriptions FOR DELETE
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_entity_role(auth.uid(), 'subscriptions')
  );

-- Add updated_at trigger
CREATE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert entity role
INSERT INTO public.entity_roles (name, slug, entity_table, description)
VALUES (
  'Subscription Manager',
  'subscription_manager',
  'subscriptions',
  'Full access to Subscriptions and linked People'
);
```

### Type Updates
```typescript
// src/types/entities.ts
export interface Subscription {
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

export type EntityType = "influencers" | "resellers" | "suppliers" 
  | "corporate_management" | "personal_contacts" | "subscriptions";

export type Entity = Influencer | Reseller | Supplier 
  | CorporateManagement | PersonalContact | Subscription;
```

## Implementation Order
1. Run database migration to create table, RLS policies, and entity role
2. Update TypeScript types (`entities.ts`, `activities.ts`, `roles.ts`)
3. Create `Subscriptions.tsx` page component
4. Add route in `App.tsx`
5. Add sidebar navigation in `CRMSidebar.tsx`

## Features Included
Once implemented, Subscriptions will automatically support:
- List view with spreadsheet-style table
- Detail panel with Home, Tasks, Notes, and Files tabs
- CRUD operations (Create, Read, Update, Delete)
- Role-based access control
- File attachments
- Linked tasks and notes
