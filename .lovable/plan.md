

# Plan: Add Reprocess Rules Feature to Processing Logs

## Overview

Add the ability to reprocess emails through the automation rules engine from the **Rules Log** tab. This resets the processed state while preserving the entity classification, allowing users to re-test their automation rules without re-classifying emails.

---

## What "Reprocess Rules" Will Do

When a user selects emails and clicks "Reprocess Selected":

1. **Clear rule execution logs** - Delete entries from `email_rule_logs` for those emails
2. **Remove entity links** - Delete from all 10 entity junction tables (e.g., `email_influencers`, `email_resellers`, etc.)
3. **Remove applied tags** - Delete from `email_message_tags`
4. **Reset processed flag** - Set `is_processed = false` on the emails
5. **Preserve classification** - Keep `entity_table`, `is_person`, and `ai_confidence` intact

The emails will then appear in the **Pending Processing** tab and can be processed again through the rules queue.

---

## Changes

### 1. Create New Hook: `src/hooks/use-reprocess-emails.ts`

A dedicated hook for reprocessing emails:

- `reprocessEmails(emailIds: string[])` mutation that:
  - Deletes from `email_rule_logs`
  - Deletes from all 10 entity junction tables
  - Deletes from `email_message_tags`
  - Updates `email_messages` to set `is_processed = false`
  - Invalidates relevant query caches

### 2. Update Rules Log Page: `src/pages/RulesLog.tsx`

**Add to the Rules Log tab:**

- Checkbox column for selecting rows
- "Select All" checkbox in header
- Toolbar above the table with:
  - Selection count indicator
  - "Reprocess Selected" button with `RotateCcw` icon
  - Confirmation dialog before executing

**UI Flow:**
1. User checks emails they want to reprocess
2. Clicks "Reprocess Selected" button
3. Confirmation dialog appears explaining what will happen
4. On confirm, emails are reset and moved to Pending Processing

---

## Technical Details

### Entity Junction Tables to Clear

All 10 tables will be cleared for selected emails:

```text
email_influencers
email_resellers
email_product_suppliers
email_expense_suppliers
email_corporate_management
email_personal_contacts
email_subscriptions
email_marketing_sources
email_merchant_accounts
email_logistic_suppliers
```

### Hook Structure

```text
src/hooks/use-reprocess-emails.ts
├── useReprocessEmails()
│   └── reprocessEmails(emailIds: string[]) - Main mutation
│       ├── Delete from email_rule_logs
│       ├── Delete from all entity junction tables
│       ├── Delete from email_message_tags
│       ├── Update email_messages.is_processed = false
│       └── Invalidate queries
```

---

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `src/hooks/use-reprocess-emails.ts` | Create | New hook with reprocess mutation |
| `src/pages/RulesLog.tsx` | Modify | Add selection UI and reprocess button to Rules Log tab |

---

## User Experience

1. Navigate to **Processing Logs** > **Rules Log** tab
2. See checkbox column on the left side of each row
3. Select emails by clicking checkboxes (or use "Select All")
4. Click **"Reprocess Selected"** button in toolbar
5. Confirm in dialog that explains: "This will reset X email(s) for reprocessing. Tags and entity links will be removed, but the entity classification will be preserved."
6. Emails move to **Pending Processing** tab
7. User can process them via the Rules Processing Queue page

