
# Replace Companies with Objects System

## Overview

This plan replaces the current **Companies** entity with a more flexible **Objects** system. Instead of linking People to Companies, People will be assigned to customizable **Object Types** (e.g., Influencers, Suppliers, Resellers). Email rules can automatically assign People to these Object Types based on email classification.

## Current State vs New Architecture

```text
CURRENT:
+----------+     +---------+     +---------------+
|  People  | --> | Company |     | Email Rules   |
+----------+     +---------+     +---------------+

NEW:
+----------+     +-------------+     +---------------+
|  People  | --> | Object Type |     | Email Rules   |
+----------+     +-------------+     +---------------+
      ^                ^                     |
      |                +---------------------+
      |                  (assign_object_type action)
      +--------------------------------------+
        (can also assign person directly)
```

## Database Changes

### Tables to DROP
- `companies` table (after migrating any needed data/removing references)

### Tables to CREATE

**1. object_types** - Defines the types of objects (Influencer, Supplier, Reseller, etc.)
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| workspace_id | uuid | FK to workspaces |
| name | text | Type name (e.g., "Influencer") |
| description | text | Description for context |
| color | text | UI display color |
| icon | text | Icon identifier |
| is_active | boolean | Whether type is enabled |
| sort_order | integer | Display order |
| created_by | uuid | Creator user ID |
| created_at | timestamp | Creation time |
| updated_at | timestamp | Last update |

**2. person_object_types** - Junction table linking People to Object Types (many-to-many)
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| person_id | uuid | FK to people |
| object_type_id | uuid | FK to object_types |
| assigned_by | uuid | Who assigned it (user or null for auto) |
| assigned_at | timestamp | When assigned |
| source | text | "manual", "email_rule", "ai_suggestion" |

**3. email_object_types** - Junction table linking Emails to Object Types
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| email_id | uuid | FK to email_messages |
| object_type_id | uuid | FK to object_types |
| assigned_at | timestamp | When assigned |

### Schema Updates

**people** table modifications:
- Remove `company_id` column (foreign key to companies)

**email_rule_actions** - Add new action type:
- Add `assign_object_type` to the `rule_action_type` enum

## New Rule Action Type

```typescript
// New action type
type RuleActionType = 
  | 'visibility'
  | 'tag'
  | 'extract_attachments'
  | 'extract_invoice'
  | 'move_folder'
  | 'mark_priority'
  | 'assign_object_type'; // NEW

// Config for the new action
interface AssignObjectTypeConfig {
  object_type_ids: string[];       // Which object types to assign
  assign_to_person: boolean;       // Assign to the Person
  assign_to_email: boolean;        // Assign to the Email
  create_person_if_missing: boolean; // Auto-create person if not exists
}
```

## Edge Function Updates

### process-email-rules/index.ts
Add handler for the new `assign_object_type` action:
1. Find or create the Person linked to the email
2. Insert records into `person_object_types` 
3. Insert records into `email_object_types`

## UI Changes

### Navigation (CRMSidebar.tsx)
- Remove "Companies" link
- Add "Objects" link (or rename to fit your terminology)

### Pages to DELETE
- `src/pages/Companies.tsx`

### Pages to CREATE

**Objects.tsx** - Manage Object Types
- List all Object Types with name, color, description
- Add/Edit/Delete Object Types
- Show count of People assigned to each type

### Pages to MODIFY

**People.tsx**
- Remove "Company" column from table
- Add "Object Types" column showing assigned types as badges
- Update filter to filter by Object Type instead of Company
- Update Add/Edit dialog to allow assigning Object Types

**PersonDetail.tsx**
- Remove Company display
- Add Object Types section showing assigned types
- Allow adding/removing Object Types manually

**Settings.tsx (Email Rules section)**
- Add UI for configuring the new `assign_object_type` rule action
- Multi-select for Object Types
- Checkboxes for "Assign to Person" / "Assign to Email"

## Types Updates

### src/types/crm.ts
```typescript
// Remove Company interface
// Update Person interface to remove company_id and company

export interface ObjectType {
  id: string;
  workspace_id: string;
  name: string;
  description: string | null;
  color: string;
  icon: string;
  is_active: boolean;
  sort_order: number;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface PersonObjectType {
  id: string;
  person_id: string;
  object_type_id: string;
  assigned_by: string | null;
  assigned_at: string;
  source: 'manual' | 'email_rule' | 'ai_suggestion';
  object_type?: ObjectType;
}

export interface Person {
  id: string;
  workspace_id: string;
  // company_id REMOVED
  // company REMOVED
  name: string;
  email: string;
  title?: string;
  phone?: string;
  notes?: string;
  avatar_url?: string;
  city?: string;
  linkedin_url?: string;
  twitter_handle?: string;
  is_auto_created: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
  // NEW
  object_types?: PersonObjectType[];
}
```

### src/types/email-rules.ts
```typescript
// Add new action type
export type RuleActionType = 
  | 'visibility'
  | 'tag'
  | 'extract_attachments'
  | 'extract_invoice'
  | 'move_folder'
  | 'mark_priority'
  | 'assign_object_type';

// Add config type
export interface AssignObjectTypeConfig {
  object_type_ids: string[];
  assign_to_person: boolean;
  assign_to_email: boolean;
}
```

## Hooks Updates

### src/hooks/use-crm.ts
- Remove all Company-related functions
- Add Object Type CRUD functions
- Update Person queries to include object_types join

### src/hooks/use-email-rules.ts  
- Add hooks for managing the new action type config

## sync-emails Edge Function
- Remove Company auto-creation logic
- Keep Person auto-creation
- Remove company_id assignment on Person

## Implementation Phases

**Phase 1: Database Migration**
1. Create `object_types` table with RLS
2. Create `person_object_types` junction table with RLS
3. Create `email_object_types` junction table with RLS  
4. Add `assign_object_type` to the enum
5. Remove `company_id` from `people` table
6. Drop `companies` table

**Phase 2: Type & Hook Updates**
1. Update `src/types/crm.ts`
2. Update `src/types/email-rules.ts`
3. Update `src/hooks/use-crm.ts` 
4. Add Object Type hooks

**Phase 3: Edge Function Updates**
1. Update `sync-emails` to remove Company logic
2. Update `process-email-rules` to handle `assign_object_type`

**Phase 4: UI Updates**
1. Create `Objects.tsx` page
2. Update `People.tsx` - remove Company, add Object Types
3. Update `PersonDetail.tsx`
4. Update `CRMSidebar.tsx` navigation
5. Update `App.tsx` routes
6. Delete `Companies.tsx`

**Phase 5: Settings UI for Rule Action**
1. Add Object Type selector in rule action config
2. Add checkboxes for assignment options

## Files Summary

| File | Action | Purpose |
|------|--------|---------|
| `supabase/migrations/XXXX_objects_system.sql` | Create | New tables, drop companies |
| `src/types/crm.ts` | Modify | Replace Company with ObjectType |
| `src/types/email-rules.ts` | Modify | Add assign_object_type action |
| `src/hooks/use-crm.ts` | Modify | Remove Company, add ObjectType |
| `src/hooks/use-object-types.ts` | Create | Object Type CRUD hooks |
| `supabase/functions/sync-emails/index.ts` | Modify | Remove Company logic |
| `supabase/functions/process-email-rules/index.ts` | Modify | Add assign_object_type handler |
| `src/pages/Objects.tsx` | Create | Object Types management page |
| `src/pages/People.tsx` | Modify | Remove Company, add Object Types |
| `src/pages/PersonDetail.tsx` | Modify | Show Object Types instead of Company |
| `src/pages/Companies.tsx` | Delete | No longer needed |
| `src/components/layout/CRMSidebar.tsx` | Modify | Update navigation |
| `src/App.tsx` | Modify | Update routes |

## Example Default Object Types

When setting up, users can create types like:
- **Influencers** - Content creators and social media personalities
- **Suppliers** - Vendors and product suppliers
- **Resellers** - Distribution and sales partners
- **Customers** - Direct customers
- **Prospects** - Potential customers
- **Partners** - Strategic partners

## Security Considerations

- All new tables use workspace-based RLS policies using `is_workspace_member()`
- Junction tables validate access through parent table relationships
- Object Type assignment respects workspace boundaries
