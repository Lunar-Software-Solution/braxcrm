
# Email Sending Automation Implementation Plan

## Overview

This plan implements a HubSpot-style email automation system that includes both **Email Sequences** (multi-step drip campaigns) and **Triggered Emails** (event-based single sends). The system will target both People records and Entity contacts (Influencers, Resellers, Suppliers, etc.) using Microsoft Graph API for email delivery.

---

## System Architecture

```text
+---------------------------+
|    Email Automation UI    |
|  (Sequences + Triggers)   |
+-----------+---------------+
            |
            v
+---------------------------+     +---------------------------+
|  email_sequences table    |     |  email_triggers table     |
|  - Steps & timing         |     |  - Event conditions       |
|  - Templates              |     |  - Target filters         |
+-----------+---------------+     +-----------+---------------+
            |                                 |
            v                                 v
+---------------------------------------------------+
|           email_templates table                    |
|  - Subject line + Body (with merge fields)        |
|  - Personalization tokens                         |
+---------------------------------------------------+
            |
            v
+---------------------------------------------------+
|        sequence_enrollments / trigger_logs        |
|  - Track who received what + when                 |
+---------------------------------------------------+
            |
            v
+---------------------------------------------------+
|        send-automated-email Edge Function         |
|  - Resolve templates + merge fields               |
|  - Send via Microsoft Graph API                   |
+---------------------------------------------------+
```

---

## Database Schema

### 1. Email Templates Table
Stores reusable email templates with personalization support.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| name | text | Template name |
| subject | text | Email subject (supports merge fields) |
| body_html | text | HTML body content |
| body_text | text | Plain text fallback |
| merge_fields | jsonb | Available personalization tokens |
| is_active | boolean | Enable/disable template |
| created_by | uuid | Owner reference |
| created_at | timestamptz | Creation timestamp |
| updated_at | timestamptz | Last modification |

### 2. Email Sequences Table
Defines multi-step automated email campaigns.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| name | text | Sequence name |
| description | text | Sequence description |
| is_active | boolean | Enable/disable sequence |
| entity_table | text | Target entity type (nullable for People) |
| created_by | uuid | Owner reference |
| created_at | timestamptz | Creation timestamp |
| updated_at | timestamptz | Last modification |

### 3. Sequence Steps Table
Individual steps within a sequence.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| sequence_id | uuid | Parent sequence reference |
| step_order | integer | Execution order |
| template_id | uuid | Email template to send |
| delay_days | integer | Days to wait before sending |
| delay_hours | integer | Additional hours delay |
| is_active | boolean | Enable/disable step |
| created_at | timestamptz | Creation timestamp |

### 4. Sequence Enrollments Table
Tracks contacts enrolled in sequences.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| sequence_id | uuid | Sequence reference |
| contact_type | text | 'person' or entity table name |
| contact_id | uuid | Reference to person/entity record |
| contact_email | text | Recipient email address |
| current_step | integer | Current step in sequence |
| status | text | 'active', 'completed', 'paused', 'unsubscribed' |
| enrolled_at | timestamptz | Enrollment timestamp |
| next_send_at | timestamptz | Scheduled next email time |
| completed_at | timestamptz | Completion timestamp |
| enrolled_by | uuid | User who enrolled contact |

### 5. Email Triggers Table
Event-based single email automation rules.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| name | text | Trigger name |
| description | text | Trigger description |
| trigger_type | text | Event type (entity_created, field_updated, etc.) |
| entity_table | text | Target entity type |
| conditions | jsonb | Filter conditions |
| template_id | uuid | Email template to send |
| delay_minutes | integer | Delay before sending |
| is_active | boolean | Enable/disable trigger |
| created_by | uuid | Owner reference |
| created_at | timestamptz | Creation timestamp |
| updated_at | timestamptz | Last modification |

### 6. Automation Send Log Table
Comprehensive logging for all sent emails.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| automation_type | text | 'sequence' or 'trigger' |
| automation_id | uuid | Sequence or Trigger ID |
| enrollment_id | uuid | Enrollment reference (for sequences) |
| contact_type | text | 'person' or entity table |
| contact_id | uuid | Contact reference |
| contact_email | text | Recipient email |
| template_id | uuid | Template used |
| subject | text | Resolved subject line |
| status | text | 'pending', 'sent', 'failed', 'bounced' |
| sent_at | timestamptz | Send timestamp |
| error_message | text | Error details if failed |
| microsoft_message_id | text | Graph API response ID |

---

## Edge Functions

### 1. `send-automated-email`
Processes individual email sends with template merging.

**Responsibilities:**
- Resolve merge fields from contact data (name, email, entity fields)
- Replace personalization tokens in subject and body
- Send via Microsoft Graph API using connected account
- Log send results to automation_send_log

### 2. `process-sequence-queue`
Scheduled function to process sequence enrollments.

**Responsibilities:**
- Query enrollments where `next_send_at <= now()` and `status = 'active'`
- Send email for current step
- Advance to next step or mark as completed
- Calculate and set `next_send_at` for next step

### 3. `fire-email-trigger`
Called by database triggers when events occur.

**Responsibilities:**
- Evaluate trigger conditions against the event data
- Check if contact should receive email (not recently sent, not unsubscribed)
- Queue email for immediate or delayed sending

---

## Frontend Components

### 1. Email Automation Hub Page (`/email-automation-hub`)
Main dashboard showing:
- Overview statistics (active sequences, enrolled contacts, emails sent)
- List of Sequences with quick actions
- List of Triggers with quick actions
- Recent send activity log

### 2. Sequence Builder
Visual editor for creating/editing sequences:
- Sequence settings (name, target entity type)
- Step list with drag-to-reorder
- Add/remove steps with template selection
- Delay configuration per step
- Enrollment management (manual + bulk enroll)

### 3. Trigger Editor
Form-based configuration for triggers:
- Trigger event selection (entity created, field changed, etc.)
- Condition builder for filtering
- Template selection
- Delay settings

### 4. Template Editor
Rich text editor for email templates:
- Subject line with merge field picker
- HTML body editor with formatting toolbar
- Preview with sample data
- Merge field reference sidebar

### 5. Enrollment Manager
Interface for managing sequence enrollments:
- Bulk enroll from entity lists
- View current enrollees and their progress
- Pause/resume/remove enrollments
- Filter by status

---

## Available Merge Fields

Based on the CRM data model:

**Person Fields:**
- `{{person.name}}` - Full name
- `{{person.email}}` - Email address
- `{{person.title}}` - Job title
- `{{person.phone}}` - Phone number
- `{{person.city}}` - City

**Entity Fields (dynamic based on entity type):**
- `{{entity.name}}` - Entity record name
- `{{entity.email}}` - Entity email
- `{{entity.phone}}` - Entity phone

**System Fields:**
- `{{current_date}}` - Today's date
- `{{sender.name}}` - Sending user's name
- `{{sender.email}}` - Sending user's email

---

## Trigger Event Types

| Event Type | Description | Available For |
|------------|-------------|---------------|
| entity_created | New record added | All entity tables |
| entity_updated | Record modified | All entity tables |
| person_created | New person added | People table |
| person_linked | Person linked to entity | People + entities |
| email_classified | Email classified to entity | All entity tables |
| manual | Manually triggered | All |

---

## Security Considerations

1. **RLS Policies**: All new tables will have appropriate Row-Level Security
2. **Template Injection Prevention**: Merge fields will be sanitized to prevent XSS
3. **Rate Limiting**: Implement sending limits to prevent abuse
4. **Unsubscribe Handling**: Track and respect unsubscribe requests
5. **Microsoft Account Access**: Use existing token management system

---

## Implementation Steps

### Phase 1: Database & Core Infrastructure
1. Create database tables with migrations
2. Add RLS policies for all new tables
3. Create base types and interfaces

### Phase 2: Email Templates
4. Build `email_templates` CRUD hooks
5. Create Template Editor component with merge field support
6. Add template preview functionality

### Phase 3: Email Sequences
7. Build sequence management hooks
8. Create Sequence Builder UI with step editor
9. Implement enrollment management
10. Create `process-sequence-queue` edge function
11. Set up pg_cron job for sequence processing

### Phase 4: Email Triggers
12. Build trigger management hooks
13. Create Trigger Editor UI
14. Implement database triggers for event firing
15. Create `fire-email-trigger` edge function

### Phase 5: Email Sending
16. Create `send-automated-email` edge function
17. Integrate with Microsoft Graph API
18. Implement comprehensive logging

### Phase 6: UI & Dashboard
19. Create Email Automation Hub page
20. Add navigation and sidebar links
21. Build analytics dashboard
22. Add bulk enrollment from entity pages

---

## Technical Details

### pg_cron Schedule
The sequence processor will run every 5 minutes:
```sql
SELECT cron.schedule(
  'process-email-sequences',
  '*/5 * * * *',
  $$ SELECT net.http_post(...) $$
);
```

### Merge Field Resolution Example
```typescript
function resolveMergeFields(template: string, context: MergeContext): string {
  return template.replace(/\{\{(\w+)\.(\w+)\}\}/g, (match, entity, field) => {
    return context[entity]?.[field] ?? match;
  });
}
```

### Files to Create
- `src/pages/EmailAutomationHub.tsx` - Main automation dashboard
- `src/pages/SequenceBuilder.tsx` - Sequence creation/editing
- `src/pages/TriggerEditor.tsx` - Trigger configuration
- `src/pages/TemplateEditor.tsx` - Email template management
- `src/components/automation/SequenceStepEditor.tsx`
- `src/components/automation/TriggerConditionBuilder.tsx`
- `src/components/automation/MergeFieldPicker.tsx`
- `src/components/automation/TemplatePreview.tsx`
- `src/components/automation/EnrollmentTable.tsx`
- `src/hooks/use-email-templates.ts`
- `src/hooks/use-email-sequences.ts`
- `src/hooks/use-email-triggers.ts`
- `src/hooks/use-sequence-enrollments.ts`
- `src/types/email-automation.ts`
- `supabase/functions/send-automated-email/index.ts`
- `supabase/functions/process-sequence-queue/index.ts`
- `supabase/functions/fire-email-trigger/index.ts`

### Files to Modify
- `src/App.tsx` - Add new routes
- `src/components/layout/CRMSidebar.tsx` - Add navigation items
