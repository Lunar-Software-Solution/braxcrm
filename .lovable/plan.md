

# Notes, Tasks, and Opportunities Entity Mapping

This plan outlines the implementation of Notes, Tasks, and Opportunities as CRM features that can be linked to any entity (Influencers, Resellers, Suppliers, Corporate Management, Personal Contacts) or to a Person.

## Overview

We will create three new core CRM features with a flexible linking system using a polymorphic pattern - each record stores the entity table name and entity ID, allowing it to link to any entity type or person.

## Database Design

### 1. Notes Table
Simple text notes that can be attached to any entity or person.

**Fields:**
- `id` - Primary key
- `title` - Optional title for the note
- `content` - The note text (required)
- `entity_table` - Which table the note links to (e.g., 'influencers', 'people')
- `entity_id` - The ID of the linked record
- `created_by` - User who created the note
- `created_at`, `updated_at` - Timestamps

### 2. Tasks Table
Tasks with assignments, due dates, and status tracking.

**Fields:**
- `id` - Primary key
- `title` - Task title (required)
- `description` - Detailed description
- `entity_table` - Which table the task links to
- `entity_id` - The ID of the linked record
- `status` - enum: 'todo', 'in_progress', 'completed', 'cancelled'
- `priority` - enum: 'low', 'medium', 'high', 'urgent'
- `due_date` - When the task is due
- `assigned_to` - User ID assigned to this task
- `created_by` - User who created the task
- `completed_at` - When the task was completed
- `created_at`, `updated_at` - Timestamps

### 3. Opportunities Table
Sales opportunities with pipeline stages and values.

**Fields:**
- `id` - Primary key
- `name` - Opportunity name (required)
- `description` - Details about the opportunity
- `entity_table` - Which table the opportunity links to
- `entity_id` - The ID of the linked record
- `stage` - enum: 'lead', 'qualified', 'proposal', 'negotiation', 'won', 'lost'
- `value` - Monetary value
- `currency` - Currency code (default 'USD')
- `probability` - Percentage chance of winning (0-100)
- `expected_close_date` - Expected closing date
- `closed_at` - When the opportunity was closed
- `created_by` - User who created the opportunity
- `created_at`, `updated_at` - Timestamps

## Security (RLS Policies)

Each table will have RLS policies that:
- Allow admins full access
- Allow users to view/manage records where they have the appropriate entity role
- Allow users to view/manage their own created records
- Use existing `has_role()`, `has_entity_role()`, and `can_view_record()` functions

## Implementation Steps

### Phase 1: Database Setup
1. Create `task_status` and `task_priority` enums
2. Create `opportunity_stage` enum
3. Create `notes` table with RLS policies
4. Create `tasks` table with RLS policies
5. Create `opportunities` table with RLS policies
6. Add `updated_at` triggers to all new tables

### Phase 2: Type Definitions
1. Add Note, Task, Opportunity interfaces to types
2. Create a shared `LinkableEntity` type for the polymorphic linking

### Phase 3: Hooks
1. Create `use-notes.ts` hook for CRUD operations
2. Create `use-tasks.ts` hook for CRUD operations
3. Create `use-opportunities.ts` hook for CRUD operations

### Phase 4: UI Components

**Reusable Components:**
- `NoteCard` - Display a single note
- `TaskCard` - Display a task with status/priority badges
- `OpportunityCard` - Display opportunity with stage and value
- `NoteDialog` - Create/edit note form
- `TaskDialog` - Create/edit task form
- `OpportunityDialog` - Create/edit opportunity form
- `EntityLinker` - Dropdown to select entity type and record

**Page Updates:**
- Update `PersonDetail.tsx` to show actual notes/tasks in their tabs
- Add notes/tasks/opportunities tabs to entity detail views (if created later)
- Create dedicated list pages for Tasks and Opportunities in sidebar

### Phase 5: Sidebar Navigation
- Add "Tasks" under a new "CRM" or "Activity" section
- Add "Opportunities" under the same section

## Technical Details

### Polymorphic Linking Pattern

```text
+------------------+
|      notes       |
+------------------+
| entity_table     |---> 'influencers' | 'resellers' | 'suppliers' | 
| entity_id        |     'corporate_management' | 'personal_contacts' | 'people'
+------------------+
```

This pattern allows:
- A note linked to Influencer: `entity_table = 'influencers', entity_id = '<influencer_uuid>'`
- A note linked to Person: `entity_table = 'people', entity_id = '<person_uuid>'`

### RLS Policy Example

```sql
CREATE POLICY "View notes based on entity access"
ON notes FOR SELECT USING (
  has_role(auth.uid(), 'admin') OR
  created_by = auth.uid() OR
  (entity_table = 'people' AND can_view_person_via_entity(auth.uid(), entity_id)) OR
  has_entity_role(auth.uid(), entity_table) OR
  can_view_record(auth.uid(), entity_id, entity_table)
);
```

## Files to Create

| File | Purpose |
|------|---------|
| `src/types/activities.ts` | Type definitions for Notes, Tasks, Opportunities |
| `src/hooks/use-notes.ts` | CRUD operations for notes |
| `src/hooks/use-tasks.ts` | CRUD operations for tasks |
| `src/hooks/use-opportunities.ts` | CRUD operations for opportunities |
| `src/components/crm/NoteCard.tsx` | Note display component |
| `src/components/crm/TaskCard.tsx` | Task display component |
| `src/components/crm/OpportunityCard.tsx` | Opportunity display component |
| `src/components/crm/NoteDialog.tsx` | Note create/edit form |
| `src/components/crm/TaskDialog.tsx` | Task create/edit form |
| `src/components/crm/OpportunityDialog.tsx` | Opportunity create/edit form |
| `src/components/crm/EntityLinker.tsx` | Entity selector dropdown |
| `src/pages/Tasks.tsx` | Tasks list page |
| `src/pages/Opportunities.tsx` | Opportunities list page |

## Files to Modify

| File | Changes |
|------|---------|
| `src/pages/PersonDetail.tsx` | Wire up actual Notes/Tasks tabs with data |
| `src/components/layout/CRMSidebar.tsx` | Add Tasks and Opportunities navigation |
| `src/App.tsx` | Add routes for Tasks and Opportunities pages |

## Summary

This implementation uses a polymorphic pattern where Notes, Tasks, and Opportunities can link to any entity type (including People) via `entity_table` + `entity_id` columns. This provides:

- Maximum flexibility for linking
- Single source of truth for each activity type
- Consistent RLS based on entity roles
- Reusable components across the application

