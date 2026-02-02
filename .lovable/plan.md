

# Entity Status & Approval Workflow

## Overview

This plan adds an approval workflow directly to each entity table. New entities created from external sources (email queue, import endpoints) will start with a "pending" status and move through a Kanban-style approval process (Draft, Pending, Under Review, Approved, Rejected).

## Workflow Concept

```text
External Sources                           Manual Entry
    |                                           |
    v                                           v
+--------+     +----------+     +------------+     +---------+     +---------+
|  Draft | --> |  Pending | --> | Under      | --> | Approved| or | Rejected|
+--------+     +----------+     | Review     |     +---------+     +---------+
                                +------------+
```

- **Draft**: Manually created, incomplete records
- **Pending**: Ingested from email queue or import endpoints, awaiting review
- **Under Review**: Being actively evaluated
- **Approved**: Fully approved entity, visible in main entity list
- **Rejected**: Declined entities, kept for records

---

## Database Changes

### 1. Create entity_status enum

```sql
CREATE TYPE entity_status AS ENUM ('draft', 'pending', 'under_review', 'approved', 'rejected');
```

### 2. Add status column to all 11 entity tables

For each entity table (affiliates, vigile_partners, brax_distributors, product_suppliers, services_suppliers, corporate_management, personal_contacts, subscriptions, marketing_sources, merchant_accounts, logistic_suppliers):

```sql
ALTER TABLE public.<entity_table> 
  ADD COLUMN status entity_status NOT NULL DEFAULT 'approved';

-- Additional approval tracking fields
ALTER TABLE public.<entity_table>
  ADD COLUMN reviewed_by UUID REFERENCES auth.users(id),
  ADD COLUMN reviewed_at TIMESTAMPTZ,
  ADD COLUMN rejection_reason TEXT,
  ADD COLUMN source TEXT DEFAULT 'manual',
  ADD COLUMN source_reference TEXT;
```

- **status**: Current approval stage
- **reviewed_by**: User who approved/rejected
- **reviewed_at**: When the review decision was made
- **rejection_reason**: Why it was rejected (if applicable)
- **source**: Where the entity came from (manual, email, import)
- **source_reference**: External ID or email ID for tracing

### 3. Create index for faster filtering

```sql
CREATE INDEX idx_<table>_status ON public.<table>(status);
```

---

## Frontend Components

### New Pages

| Page | Route | Purpose |
|------|-------|---------|
| EntityApprovalHub | `/approvals` | Dashboard showing pending counts by entity type |
| EntityApprovalQueue | `/approvals/:entityType` | Kanban board for a specific entity type |

### New Components

| Component | Purpose |
|-----------|---------|
| `ApprovalKanban` | Kanban board with status columns (similar to Opportunities page) |
| `ApprovalEntityCard` | Card displaying entity summary with status badge |
| `ApprovalDetailPanel` | Side panel showing full entity details with approve/reject actions |
| `StatusBadge` | Visual indicator for entity status |

### UI Layout

The Approval Queue will feature:
- Five-column Kanban: Draft | Pending | Under Review | Approved | Rejected
- Draggable cards between columns (status change)
- Click on card opens detail panel with:
  - Full entity information
  - Source information (email, import, manual)
  - Action buttons: Move to Review, Approve, Reject
  - Rejection reason input when rejecting

---

## Hook Changes

### New Hook: `use-entity-approvals.ts`

```typescript
export function useEntityApprovals(entityType: EntityType) {
  // List entities by status
  // Update entity status (with review tracking)
  // Approve entity
  // Reject entity (with reason)
  // Get pending counts per entity type
}
```

### Modify: `use-entities.ts`

- Add optional `status` filter parameter
- Default to showing only `approved` entities in main entity lists
- Add `includeAllStatuses` option for approval views

---

## Edge Function Updates

### Modify: `prepare-for-rules` (Email Queue)

When creating new entities, set:
- `status = 'pending'`
- `source = 'email'`
- `source_reference = email_id`

### Modify: `prepare-webhook-for-rules` (Import Queue)

When creating new entities, set:
- `status = 'pending'`
- `source = 'import'`
- `source_reference = webhook_event_id`

---

## Navigation Updates

Add to CRMSidebar:
- "Approvals" menu item with pending count badge
- Route to `/approvals` hub page

---

## Technical Details

### Database Migration SQL

```sql
-- Create entity status enum
CREATE TYPE entity_status AS ENUM ('draft', 'pending', 'under_review', 'approved', 'rejected');

-- Add columns to all entity tables (repeated for each table)
ALTER TABLE public.affiliates 
  ADD COLUMN status entity_status NOT NULL DEFAULT 'approved',
  ADD COLUMN reviewed_by UUID REFERENCES auth.users(id),
  ADD COLUMN reviewed_at TIMESTAMPTZ,
  ADD COLUMN rejection_reason TEXT,
  ADD COLUMN source TEXT DEFAULT 'manual',
  ADD COLUMN source_reference TEXT;

CREATE INDEX idx_affiliates_status ON public.affiliates(status);

-- Repeat for: vigile_partners, brax_distributors, product_suppliers, 
-- services_suppliers, corporate_management, personal_contacts, 
-- subscriptions, marketing_sources, merchant_accounts, logistic_suppliers
```

### Type Definitions

```typescript
// src/types/entities.ts
export type EntityStatus = 'draft' | 'pending' | 'under_review' | 'approved' | 'rejected';

export const entityStatusLabels: Record<EntityStatus, string> = {
  draft: 'Draft',
  pending: 'Pending',
  under_review: 'Under Review',
  approved: 'Approved',
  rejected: 'Rejected',
};

export const entityStatusColors: Record<EntityStatus, string> = {
  draft: 'bg-muted text-muted-foreground',
  pending: 'bg-yellow-100 text-yellow-800',
  under_review: 'bg-blue-100 text-blue-800',
  approved: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
};

// Updated entity interface
export interface BaseEntity {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  notes: string | null;
  avatar_url: string | null;
  status: EntityStatus;
  source: string | null;
  source_reference: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  rejection_reason: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}
```

### Files to Create

1. `src/types/approvals.ts` - Approval-specific types
2. `src/hooks/use-entity-approvals.ts` - Approval workflow hook
3. `src/pages/EntityApprovalHub.tsx` - Hub page with entity type counts
4. `src/pages/EntityApprovalQueue.tsx` - Kanban per entity type
5. `src/components/approvals/ApprovalKanban.tsx` - Kanban board component
6. `src/components/approvals/ApprovalEntityCard.tsx` - Entity card for approval view
7. `src/components/approvals/ApprovalDetailPanel.tsx` - Side panel with actions
8. `src/components/approvals/StatusBadge.tsx` - Status indicator badge

### Files to Modify

1. `src/types/entities.ts` - Add status field to all entity interfaces
2. `src/hooks/use-entities.ts` - Filter by status, default to approved
3. `src/pages/EntityList.tsx` - Show status badge, filter options
4. `src/App.tsx` - Add approval routes
5. `src/components/layout/CRMSidebar.tsx` - Add Approvals navigation
6. `supabase/functions/prepare-for-rules/index.ts` - Set pending status on entity creation
7. `supabase/functions/prepare-webhook-for-rules/index.ts` - Set pending status on entity creation

---

## Summary

This implementation:
- Adds approval workflow directly to entity tables (no separate applications table)
- Uses an enum for status consistency across all 11 entity types
- Entities from email/import queues enter as "pending"
- Manual entries can start as "draft" or go directly to "approved"
- Provides a Kanban-style approval interface similar to the existing Opportunities page
- Maintains backward compatibility (existing entities default to "approved")
- Tracks approval history with reviewer and timestamp

