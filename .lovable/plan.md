

# Email Review Queue Implementation Plan

## Overview
Create a new "Review Queue" page that allows users to review AI-classified emails before rules are automatically applied. This gives users a final checkpoint to verify categorization accuracy and improve the AI classification prompt over time.

## What You'll Get
- A dedicated page showing emails that have been categorized by AI but not yet processed by rules
- Ability to manually change categories if the AI got it wrong
- Batch processing to send multiple emails through rule processing at once
- A toggle to enable/disable automatic processing (for users who want to skip the review step)
- Visual indicators showing AI confidence scores to highlight uncertain classifications

## Architecture

The solution separates the existing "classify + process" flow into two distinct phases:

```text
Current Flow:
  sync-emails → classify-email → process-email-rules (all automatic)

New Flow (with auto-process OFF):
  sync-emails → classify-email → [PAUSE] → Review Queue → process-email-rules

New Flow (with auto-process ON):
  sync-emails → classify-email → process-email-rules (same as before)
```

## Implementation Steps

### 1. Database Changes
Add a workspace setting to control auto-processing behavior:
- Create new `workspace_settings` table with columns:
  - `workspace_id` (UUID, primary key, references workspaces)
  - `auto_process_emails` (boolean, default: true for backward compatibility)
  - `created_at`, `updated_at`
- Add RLS policies for workspace members

### 2. New Page: Email Review Queue
Create `src/pages/EmailReviewQueue.tsx`:
- Fetch emails where `category_id IS NOT NULL` AND `is_processed = false`
- Display as a table/list with columns:
  - Sender / Subject / Preview
  - Category (with color badge)
  - Confidence score (visual indicator, e.g., progress bar or percentage)
  - Received date
- Include search/filter functionality
- Add selection checkboxes for batch operations

### 3. Category Change Feature
- Dropdown or popover to select a different category for each email
- On change, call the classify-email endpoint with manual override OR directly update `category_id` in the database
- Update the `email_message_categories` table to track the change

### 4. Batch Processing
- "Process Selected" button to send selected emails through `process-email-rules`
- "Process All" button with confirmation dialog
- Show progress indicator during processing
- Refresh the list after processing completes

### 5. Auto-Process Toggle
- Add a toggle switch in the page header
- When ON: the sync-emails function continues to process rules immediately after classification
- When OFF: sync-emails only classifies, leaving emails in the review queue
- Store preference in `workspace_settings` table

### 6. Backend Modifications
Update `supabase/functions/sync-emails/index.ts`:
- Check the workspace's `auto_process_emails` setting
- If false, skip calling `process-email-rules` after classification
- Emails will remain with `is_processed = false` for manual review

### 7. Navigation
- Add "Review Queue" link to the sidebar under Workspace section
- Show badge with count of pending emails

### 8. Hook for Review Queue Data
Create `src/hooks/use-review-queue.ts`:
- Fetch pending emails (categorized but not processed)
- Mutations for updating category, processing emails
- Fetch/update workspace auto-process setting

## New Files to Create
1. `src/pages/EmailReviewQueue.tsx` - Main review queue page
2. `src/hooks/use-review-queue.ts` - Data fetching and mutations
3. `src/components/email/ReviewQueueTable.tsx` - Table component for displaying emails
4. `src/components/email/CategorySelector.tsx` - Reusable category dropdown
5. `supabase/migrations/xxx_workspace_settings.sql` - Database migration

## Files to Modify
1. `src/App.tsx` - Add route for `/review-queue`
2. `src/components/layout/CRMSidebar.tsx` - Add navigation link with pending count badge
3. `supabase/functions/sync-emails/index.ts` - Check auto-process setting before calling process-email-rules

## Technical Details

### Review Queue Query
```sql
SELECT 
  em.*,
  ec.name as category_name,
  ec.color as category_color
FROM email_messages em
LEFT JOIN email_categories ec ON em.category_id = ec.id
WHERE em.workspace_id = $1
  AND em.category_id IS NOT NULL
  AND em.is_processed = false
ORDER BY em.received_at DESC
```

### Workspace Settings Table
```sql
CREATE TABLE workspace_settings (
  workspace_id UUID PRIMARY KEY REFERENCES workspaces(id) ON DELETE CASCADE,
  auto_process_emails BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS policies for workspace members
ALTER TABLE workspace_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team members can view settings"
  ON workspace_settings FOR SELECT
  USING (is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "Team members can update settings"
  ON workspace_settings FOR UPDATE
  USING (is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "Team members can insert settings"
  ON workspace_settings FOR INSERT
  WITH CHECK (is_workspace_member(auth.uid(), workspace_id));
```

### UI Layout
```text
+---------------------------------------------------------------+
| Review Queue                          [Auto-process: Toggle]  |
+---------------------------------------------------------------+
| [Search...]                    [Process Selected] [Process All]|
+---------------------------------------------------------------+
| [ ] | Sender        | Subject     | Category   | Conf | Date  |
+---------------------------------------------------------------+
| [x] | John Smith    | Invoice...  | Invoices ● | 92%  | Today |
| [ ] | Jane Doe      | Question... | Support  ● | 67%  | Today |
| [x] | Acme Corp     | Meeting...  | Sales    ● | 45%  | Yest  |
+---------------------------------------------------------------+
| Showing 3 emails pending review                                |
+---------------------------------------------------------------+
```

### Confidence Visualization
- High confidence (>80%): Green indicator
- Medium confidence (50-80%): Yellow/amber indicator  
- Low confidence (<50%): Red indicator, highlighted for review

