

# Migration Plan: Entity-Based Role Access Control (RBAC)

## Overview

This plan transitions from a workspace-based architecture to an entity-based role access control system where:

- **Entity-Based Roles**: Automatic roles matching entity types (Influencer Manager, Reseller Manager, Supplier Manager, Corporate Manager)
- **People-Entity Linking**: A junction table links People to Entities for visibility
- **Combined Visibility**: Users see entities they manage + People linked to those entities + specific records assigned via email rules
- **Admin Override**: Admin role sees all data across the system

---

## Current vs. New Architecture

### Current State
- All data scoped by `workspace_id`
- Users access data through workspace membership (`team_members` table)
- No direct link between People and Entities (Influencers, Resellers, etc.)
- Entity tables are standalone contact records

### New State  
- Data scoped by user roles and entity assignments
- Users access entity data based on their assigned roles
- People linked to Entities via `people_entities` junction table
- Email rules can assign specific records to roles for targeted visibility

---

## Phase 1: Database Schema - New Tables

### 1.1 Entity Roles Table
Predefined roles matching entity types:

```sql
CREATE TABLE entity_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  slug text NOT NULL UNIQUE, -- 'influencer_manager', 'reseller_manager', etc.
  description text,
  entity_table text NOT NULL, -- 'influencers', 'resellers', etc.
  created_at timestamptz DEFAULT now()
);

-- Insert system roles
INSERT INTO entity_roles (name, slug, entity_table) VALUES
  ('Influencer Manager', 'influencer_manager', 'influencers'),
  ('Reseller Manager', 'reseller_manager', 'resellers'),
  ('Supplier Manager', 'supplier_manager', 'suppliers'),
  ('Corporate Manager', 'corporate_manager', 'corporate_management');
```

### 1.2 User Entity Roles Table
Assigns entity roles to users:

```sql
CREATE TABLE user_entity_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entity_role_id uuid NOT NULL REFERENCES entity_roles(id) ON DELETE CASCADE,
  assigned_by uuid REFERENCES auth.users(id),
  assigned_at timestamptz DEFAULT now(),
  UNIQUE(user_id, entity_role_id)
);
```

### 1.3 People-Entities Junction Table
Links People to Entity tables:

```sql
CREATE TABLE people_entities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id uuid NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  entity_table text NOT NULL, -- 'influencers', 'resellers', 'suppliers', 'corporate_management'
  entity_id uuid NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(person_id, entity_table, entity_id)
);
```

### 1.4 Record Role Assignments Table
For email rules to assign specific records to roles:

```sql
CREATE TABLE record_role_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_role_id uuid NOT NULL REFERENCES entity_roles(id) ON DELETE CASCADE,
  record_id uuid NOT NULL,
  table_name text NOT NULL,
  assigned_by_rule_id uuid REFERENCES email_rules(id),
  assigned_at timestamptz DEFAULT now(),
  UNIQUE(entity_role_id, record_id, table_name)
);
```

---

## Phase 2: Database Schema - Security Functions

### 2.1 Check Entity Role Function

```sql
CREATE OR REPLACE FUNCTION public.has_entity_role(
  _user_id uuid, 
  _entity_table text
) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_entity_roles uer
    JOIN entity_roles er ON er.id = uer.entity_role_id
    WHERE uer.user_id = _user_id
    AND er.entity_table = _entity_table
  )
$$;
```

### 2.2 Check Record Access Function

```sql
CREATE OR REPLACE FUNCTION public.can_view_record(
  _user_id uuid,
  _record_id uuid,
  _table_name text
) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM record_role_assignments rra
    JOIN user_entity_roles uer ON uer.entity_role_id = rra.entity_role_id
    WHERE uer.user_id = _user_id
    AND rra.record_id = _record_id
    AND rra.table_name = _table_name
  )
$$;
```

### 2.3 Check People Access via Entity Link

```sql
CREATE OR REPLACE FUNCTION public.can_view_person_via_entity(
  _user_id uuid,
  _person_id uuid
) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM people_entities pe
    JOIN entity_roles er ON er.entity_table = pe.entity_table
    JOIN user_entity_roles uer ON uer.entity_role_id = er.id
    WHERE uer.user_id = _user_id
    AND pe.person_id = _person_id
  )
$$;
```

---

## Phase 3: Remove Workspace Architecture

### 3.1 Drop Workspace Tables

```sql
DROP TABLE IF EXISTS workspace_settings CASCADE;
DROP TABLE IF EXISTS team_members CASCADE;
DROP TABLE IF EXISTS workspaces CASCADE;
DROP FUNCTION IF EXISTS public.is_workspace_member CASCADE;
```

### 3.2 Remove workspace_id Columns
Remove from all tables:
- `people`, `email_messages`, `email_categories`, `email_rules`
- `email_tags`, `email_visibility_groups`, `object_types`
- `influencers`, `resellers`, `suppliers`, `corporate_management`
- `extracted_invoices`

### 3.3 Add Missing Ownership Columns
Add `created_by` or `user_id` where needed:
- `email_tags` - add `created_by`
- `email_visibility_groups` - add `created_by`
- `email_messages` - add `user_id` (the owner/syncer)
- `extracted_invoices` - add `user_id`

---

## Phase 4: Update RLS Policies

### 4.1 Entity Tables Pattern (influencers, resellers, suppliers, corporate_management)

```sql
-- Admin or user with role can view
CREATE POLICY "select_policy" ON influencers FOR SELECT
USING (
  has_role(auth.uid(), 'admin')
  OR has_entity_role(auth.uid(), 'influencers')
  OR can_view_record(auth.uid(), id, 'influencers')
);

-- Admin or user with role can insert/update/delete
CREATE POLICY "modify_policy" ON influencers FOR ALL
USING (
  has_role(auth.uid(), 'admin')
  OR has_entity_role(auth.uid(), 'influencers')
);
```

### 4.2 People Table Pattern

```sql
-- View people linked to user's entity roles, or specific assignments
CREATE POLICY "select_people" ON people FOR SELECT
USING (
  has_role(auth.uid(), 'admin')
  OR can_view_person_via_entity(auth.uid(), id)
  OR can_view_record(auth.uid(), id, 'people')
  OR created_by = auth.uid()
);

-- Insert own records, admin can insert any
CREATE POLICY "insert_people" ON people FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'admin')
  OR created_by = auth.uid()
);

-- Update own or admin
CREATE POLICY "update_people" ON people FOR UPDATE
USING (
  has_role(auth.uid(), 'admin')
  OR created_by = auth.uid()
);
```

### 4.3 Shared Tables (categories, tags, rules)

```sql
-- All authenticated can view, admin can manage
CREATE POLICY "select_shared" ON email_categories FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "admin_manage" ON email_categories FOR ALL
USING (has_role(auth.uid(), 'admin'));
```

---

## Phase 5: Update Email Rule Actions

### 5.1 Add `assign_role` Action Type

```sql
ALTER TYPE rule_action_type ADD VALUE IF NOT EXISTS 'assign_role';
```

### 5.2 Assign Role Config Type

```typescript
export interface AssignRoleConfig {
  entity_role_id: string;
  assign_to_person: boolean;
  assign_to_email: boolean;
}
```

---

## Phase 6: Edge Function Updates

### 6.1 sync-emails
- Remove `workspaceId` parameter
- Use `userId` from auth token for ownership
- Query user's entity roles for filtering what to sync

### 6.2 classify-email
- Remove `workspace_id` references
- Categories now global (admin-managed)

### 6.3 process-email-rules
- Remove `workspace_id` parameter
- Add support for `assign_role` action
- Create entries in `record_role_assignments`
- Update `assign_entity` to also create `people_entities` link

### 6.4 extract-invoice
- Replace `workspace_id` with `user_id`

---

## Phase 7: Frontend Changes

### 7.1 Files to Delete
- `src/hooks/use-workspace.ts`

### 7.2 New Files to Create

**src/types/roles.ts**
```typescript
export interface EntityRole {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  entity_table: string;
}

export interface UserEntityRole {
  id: string;
  user_id: string;
  entity_role_id: string;
  entity_role?: EntityRole;
  assigned_at: string;
}
```

**src/hooks/use-user-roles.ts**
- Fetch current user's entity roles
- Cache role information for sidebar visibility

**src/components/settings/RoleManagement.tsx**
- Admin UI to assign entity roles to users
- List all users with their roles
- Assign/remove roles

### 7.3 Hooks to Update

| Hook | Changes |
|------|---------|
| `use-entities.ts` | Remove `workspaceId` param, RLS handles filtering |
| `use-crm.ts` | Remove `workspaceId` from all functions |
| `use-email-rules.ts` | Remove `workspaceId`, add `assign_role` action support |
| `use-review-queue.ts` | Remove `workspaceId` references |

### 7.4 Pages to Update
Remove `workspaceId` usage from:
- `People.tsx`, `Objects.tsx`, `EntityList.tsx`
- `Inbox.tsx`, `EmailReviewQueue.tsx`, `Settings.tsx`
- `PersonDetail.tsx`

### 7.5 Sidebar Updates (`CRMSidebar.tsx`)
- Remove workspace dropdown
- Show entity navigation items based on user's roles
- Admin sees all items
- Regular users see only items for their assigned roles

### 7.6 Type Definition Updates
Remove `workspace_id` from:
- `src/types/crm.ts`
- `src/types/entities.ts`
- `src/types/email-rules.ts`

---

## Phase 8: Admin Role Management UI

### Settings Page Addition
- New "User Roles" tab for admins
- Table showing all users
- Multi-select to assign entity roles
- Toggle for admin status

---

## Migration Execution Order

1. **Create new tables** - entity_roles, user_entity_roles, people_entities, record_role_assignments
2. **Create security functions** - has_entity_role, can_view_record, can_view_person_via_entity
3. **Add RLS policies to new tables**
4. **Add missing columns** - created_by/user_id where needed
5. **Drop workspace columns** - Remove workspace_id from all tables
6. **Update existing RLS policies** - Switch to role-based policies
7. **Drop workspace tables** - workspaces, team_members, workspace_settings
8. **Drop is_workspace_member function**
9. **Update edge functions**
10. **Update frontend hooks and components**
11. **Add role management UI**

---

## Summary of Access Model

| User Role | Influencers | Resellers | Suppliers | Corporate | People |
|-----------|-------------|-----------|-----------|-----------|--------|
| Admin | All | All | All | All | All |
| Influencer Manager | All | - | - | - | Linked to Influencers |
| Reseller Manager | - | All | - | - | Linked to Resellers |
| Supplier Manager | - | - | All | - | Linked to Suppliers |
| Corporate Manager | - | - | - | All | Linked to Corporate |
| No Role | - | - | - | - | Own created only |

---

## Files Changed Summary

| Action | Files |
|--------|-------|
| Delete | `src/hooks/use-workspace.ts` |
| Create | `src/types/roles.ts`, `src/hooks/use-user-roles.ts`, `src/components/settings/RoleManagement.tsx` |
| Modify | 15+ frontend files (hooks, pages, components) |
| Modify | 4+ edge functions |
| Create | 1 migration file with all schema changes |

