

# Entity Tickets System

## Overview

This plan creates a **ticketing system** for managing entity-specific exceptions and action items. Each ticket is linked to a specific entity and has a predefined **ticket type** based on the entity category. Tickets represent escalated issues or manual actions that need to be resolved.

## Ticket Types by Entity

| Entity Type | Ticket Types |
|-------------|--------------|
| Logistic Suppliers | Shipping Exception, Delivery Issue, Customs Hold, Carrier Dispute |
| Merchant Accounts | Manual Processing, Chargeback Review, Account Update, Compliance Action |
| Subscription Suppliers | New Subscription Setup, Renewal Request, Cancellation, Plan Change |
| Services Suppliers | Service Request, Expense Approval, Contract Review, Vendor Onboarding |
| Product Suppliers | Order Issue, Quality Dispute, Return Request, Price Adjustment |
| Affiliates | Commission Dispute, Payment Issue, Link Problem, Agreement Update |
| Vigile Partners | **New Partner Onboarding**, Certification Update, Compliance Issue, Training Request, Audit Follow-up |
| Brax Distributors | **New Distributor Onboarding**, Inventory Issue, Pricing Dispute, Territory Conflict, Performance Review |
| Corporate Management | Legal Request, Compliance Filing, Document Request, Approval Escalation |
| Personal Contacts | Follow-up Required, Introduction Request, Reference Check, Event Coordination |
| Marketing Sources | Campaign Issue, Attribution Dispute, Budget Approval, Creative Request |

## Data Model

```text
+-------------------+
|     tickets       |
+-------------------+
| id                | UUID (PK)
| ticket_number     | TEXT (auto-generated: TKT-XXXX)
| title             | TEXT
| description       | TEXT
| entity_table      | TEXT (polymorphic link)
| entity_id         | UUID (polymorphic link)
| ticket_type       | TEXT (entity-specific type)
| priority          | ENUM (low, medium, high, urgent)
| status            | ENUM (open, in_progress, waiting, resolved, closed)
| assigned_to       | UUID (FK to auth.users)
| due_date          | DATE
| resolved_at       | TIMESTAMPTZ
| resolution_notes  | TEXT
| created_by        | UUID (FK to auth.users)
| created_at        | TIMESTAMPTZ
| updated_at        | TIMESTAMPTZ
+-------------------+
```

### Status Workflow

```text
+------+     +-----------+     +---------+     +----------+     +--------+
| Open | --> | In        | --> | Waiting | --> | Resolved | --> | Closed |
+------+     | Progress  |     | (ext.)  |     +----------+     +--------+
             +-----------+           |              ^
                   ^                 |              |
                   +-----------------+--------------+
```

- **Open**: New ticket, not yet started
- **In Progress**: Being actively worked on
- **Waiting**: Waiting for external response (customer, vendor, etc.)
- **Resolved**: Issue resolved, pending confirmation
- **Closed**: Ticket completed and archived

---

## Technical Implementation

### Database Changes

1. Create `ticket_priority` and `ticket_status` enums
2. Create `tickets` table with polymorphic entity linking
3. Auto-generate ticket numbers using a sequence (TKT-01000, TKT-01001, etc.)
4. Create indexes for entity lookup, status filtering, and assignee queries
5. Enable RLS with policies for creators, assignees, and admins

### Files to Create

| File | Purpose |
|------|---------|
| `src/types/tickets.ts` | TypeScript types and entity-specific ticket type mappings |
| `src/hooks/use-tickets.ts` | Ticket CRUD operations, filtering, and status counts |
| `src/pages/Tickets.tsx` | Main Tickets page with Kanban view |
| `src/components/tickets/TicketCard.tsx` | Draggable ticket card component |
| `src/components/tickets/TicketDialog.tsx` | Create/Edit ticket dialog |
| `src/components/tickets/TicketDetailPanel.tsx` | Side panel with full ticket details |
| `src/components/tickets/TicketKanban.tsx` | 5-column Kanban board by status |
| `src/components/crm/TicketsList.tsx` | Ticket list for entity detail panels |

### Files to Modify

| File | Changes |
|------|---------|
| `src/App.tsx` | Add `/tickets` route |
| `src/components/layout/CRMSidebar.tsx` | Add Tickets to Core navigation with badge |
| `src/components/crm/CommunicationTabs.tsx` | Add Tickets tab option |

---

## UI Features

### Tickets Page (Kanban View)

5-column Kanban board: **Open** | **In Progress** | **Waiting** | **Resolved** | **Closed**

- Drag-and-drop between columns to change status
- Filter by entity type, priority, assigned user
- Search by ticket number or title
- Click card to open detail panel

### Ticket Card

- Ticket number (e.g., TKT-01023) and title
- Entity name with type badge
- Priority badge (color-coded)
- Due date with overdue indicator
- Assigned user avatar

### Ticket Dialog

- Title (required)
- Entity selector (type + specific entity)
- Ticket type dropdown (filtered by selected entity type)
- Description
- Priority selector
- Due date picker
- Assignee selector

### Entity Detail Integration

Add "Tickets" tab to entity detail panels showing tickets linked to that entity with a quick-create button.

---

## Navigation

Add "Tickets" to the Core section of the sidebar after "Tasks":

```text
Core
├── People
├── Senders
├── Tasks
├── Tickets (NEW - with open count badge)
├── Opportunities
└── Approvals
```

