

# Unify Email Rules and Categories with Status Indicators

## Overview

This plan consolidates "Email Categories" and "Email Rules" into a single unified concept called "Email Categories" (with embedded automation rules). It also adds clear status indicators for emails that are:
1. **Not Categorized** - New emails that haven't been classified by AI yet
2. **Rules Pending** - Emails classified by AI but automation rules not yet executed

## Current Architecture

Currently, the system has two separate concepts:
- **Email Categories**: AI classification targets (e.g., "Invoices & Billing", "Sales Inquiries")
- **Email Rules**: Automation triggered per category (e.g., apply tags, extract invoices)

The `email_messages` table tracks:
- `category_id` - Which category AI assigned
- `ai_confidence` - AI's confidence score
- `is_processed` - Whether rules have been executed

## Proposed Changes

### 1. Unified Settings UI Component

**File: `src/components/settings/EmailAutomationSettings.tsx`** (new)

Combine the current `EmailCategoriesSettings` and `EmailRulesSettings` into a single component with:

- **Category Cards** that expand to show their associated actions/rules
- Each category displays:
  - Name, description, and color
  - Toggle for active/inactive
  - Expandable section showing automation actions (formerly "rules")
  - Add action button within each category
- Remove the separate "Rules" section entirely

```text
+--------------------------------------------------+
| Email Automation                    [+ Category] |
|--------------------------------------------------|
| [Color] Invoices & Billing                    v  |
|   "Emails related to invoices..."                |
|                                                  |
|   Actions:                                       |
|   [x] Apply tag: Invoice                         |
|   [x] Extract invoice data                       |
|   [x] Mark as High priority                      |
|   [x] Link to Supplier entity                    |
|                              [+ Add Action]      |
|--------------------------------------------------|
| [Color] Sales Inquiries                       >  |
|   "Inbound leads and sales opportunities"        |
+--------------------------------------------------+
```

### 2. Enhanced Email Status System

**Add a new status indicator type** in the inbox and email preview:

| Status | Visual | Meaning |
|--------|--------|---------|
| Not Synced | (none) | Email not in our database yet |
| Not Categorized | Gray circle | Synced but AI classification not run |
| Pending Rules | Yellow clock | Classified by AI, rules not executed |
| Processed | Green checkmark | All automation complete |

**Changes to `EmailList.tsx` and `EmailPreview.tsx`:**
- Update status indicator logic to show all 4 states
- Add "Not Categorized" state for `category_id = null`
- Keep "Pending Review" for `category_id != null && is_processed = false`
- Keep "Processed" for `is_processed = true`

### 3. Database Simplification (Optional, No Migration Needed)

The current schema already supports this unified model:
- `email_categories` - Defines categories
- `email_rules` - Links rules to categories (1:many)
- `email_rule_actions` - Defines actions per rule

For simplicity, we'll create **one rule per category** (auto-created when creating a category) and let users add actions directly to the category's rule.

### 4. Update Settings Page

**File: `src/pages/Settings.tsx`**

Replace:
```tsx
<EmailCategoriesSettings />
<EmailRulesSettings />
```

With:
```tsx
<EmailAutomationSettings />
```

---

## Technical Implementation Details

### New Component: `EmailAutomationSettings.tsx`

Structure:
```typescript
- Fetches categories with their rules and actions in one query
- Each category card is expandable (accordion-style)
- Shows category info at top, actions below when expanded
- Add/edit category dialog
- Add action dialog (reuses current action config UI)
- Delete action inline
```

Key features:
- Auto-create a rule when creating a new category
- Actions are added directly to the category's rule
- If a category has no rule, create one on first action add

### Status Indicator Updates

Update `EmailList.tsx` status logic:

```tsx
// Current logic (simplified)
{metadata.is_processed ? (
  <CheckCircle2 className="text-green-500" />  // Processed
) : metadata.category_id ? (
  <Circle className="text-yellow-500" />        // Pending review
) : null}

// New logic
{metadata ? (
  metadata.is_processed ? (
    <CheckCircle2 className="text-green-500" />     // Processed
  ) : metadata.category_id ? (
    <Clock className="text-yellow-500" />            // Rules pending
  ) : (
    <CircleDashed className="text-muted-foreground" /> // Not categorized
  )
) : null}
```

### Files to Create

| File | Purpose |
|------|---------|
| `src/components/settings/EmailAutomationSettings.tsx` | Unified category + rules management |

### Files to Modify

| File | Changes |
|------|---------|
| `src/pages/Settings.tsx` | Replace category + rules components with unified component |
| `src/components/email/EmailList.tsx` | Add "Not Categorized" status indicator |
| `src/components/email/EmailPreview.tsx` | Add "Not Categorized" status display |
| `src/hooks/use-email-metadata.ts` | Ensure proper handling of null category state |

### Files to Delete

| File | Reason |
|------|--------|
| `src/components/settings/EmailCategoriesSettings.tsx` | Merged into EmailAutomationSettings |
| `src/components/settings/EmailRulesSettings.tsx` | Merged into EmailAutomationSettings |

---

## User Experience Flow

1. **Creating a Category**
   - User clicks "Add Category" in Email Automation settings
   - Fills in name, description, color
   - Category is created with an auto-generated rule
   - User can immediately add actions

2. **Adding Automation Actions**
   - Expand a category card
   - Click "Add Action"
   - Select action type (tag, extract invoice, assign entity, etc.)
   - Configure the action
   - Save - action is added to the category's rule

3. **Viewing Email Status in Inbox**
   - Gray dashed circle: "Not Categorized" - needs sync + AI classification
   - Yellow clock: "Rules Pending" - classified but waiting for rule execution
   - Green check: "Processed" - all automation complete

4. **Resetting Processing**
   - User can reset an email's processing status
   - Clears `category_id`, `ai_confidence`, `is_processed`, and tags
   - Email returns to "Not Categorized" state
   - Next sync will re-classify and re-process

