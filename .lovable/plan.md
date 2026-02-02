# Entity Status & Approval Workflow

## Status: ✅ IMPLEMENTED

This plan has been implemented with the following components:

## Database Changes (Completed)
- Created `entity_status` enum: `'draft'`, `'pending'`, `'under_review'`, `'approved'`, `'rejected'`
- Added columns to all 11 entity tables:
  - `status` (entity_status, defaults to 'approved')
  - `reviewed_by`, `reviewed_at`, `rejection_reason`
  - `source`, `source_reference`
- Created indexes for status filtering

## Frontend Implementation (Completed)

### New Files Created:
- `src/types/approvals.ts` - Status types and color mappings
- `src/hooks/use-entity-approvals.ts` - Approval workflow hook
- `src/pages/EntityApprovalHub.tsx` - Dashboard showing all entity approval counts
- `src/pages/EntityApprovalQueue.tsx` - Kanban board per entity type
- `src/components/approvals/StatusBadge.tsx` - Visual status indicator
- `src/components/approvals/ApprovalEntityCard.tsx` - Card for approval views
- `src/components/approvals/ApprovalDetailPanel.tsx` - Side panel with actions
- `src/components/approvals/ApprovalKanban.tsx` - 5-column Kanban board

### Files Modified:
- `src/types/entities.ts` - Added status fields to all entity interfaces
- `src/hooks/use-entities.ts` - Filter by status, defaults to 'approved' only
- `src/App.tsx` - Added `/approvals` and `/approvals/:entityType` routes
- `src/components/layout/CRMSidebar.tsx` - Added Approvals nav with pending badge
- `src/components/crm/EntityDetailPanel.tsx` - Made entity interface flexible

## Workflow

```text
External Sources (Email/Import)    Manual Entry
         |                              |
         v                              v
    +--------+   +----------+   +------------+   +---------+   +---------+
    |  Draft | → |  Pending | → |   Under    | → | Approved| or| Rejected|
    +--------+   +----------+   |   Review   |   +---------+   +---------+
                                +------------+
```

## Next Steps (If Needed)
- Update edge functions (`prepare-for-rules`, `prepare-webhook-for-rules`) to set `status='pending'` and `source='email'/'import'` when creating entities
- Add drag-and-drop for Kanban columns


