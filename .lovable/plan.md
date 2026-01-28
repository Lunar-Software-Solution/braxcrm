
# AI Email Sorter Implementation Plan

## Overview

This feature adds an intelligent email classification system that automatically categorizes incoming emails and applies configurable rules. The system uses Lovable AI to analyze email content and match it against user-defined categories, then executes associated actions like visibility controls, tagging, and specialized processing (e.g., invoice extraction).

## System Architecture

```text
+-------------------+     +-----------------------+     +------------------+
|  Incoming Email   | --> |   classify-email      | --> |  Apply Rules     |
|  (sync-emails)    |     |   Edge Function       |     |  Edge Function   |
+-------------------+     +-----------------------+     +------------------+
                                    |                            |
                                    v                            v
                          +------------------+          +------------------+
                          |  Lovable AI      |          |  Rule Actions:   |
                          |  (Gemini Flash)  |          |  - Tags (Outlook)|
                          +------------------+          |  - Visibility    |
                                                        |  - Attachments   |
                                                        |  - Invoices      |
                                                        +------------------+
```

## Database Schema

### New Tables

**1. email_categories** - Stores category definitions
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| workspace_id | uuid | FK to workspaces |
| name | text | Category name (e.g., "Invoice", "Newsletter") |
| description | text | Description for AI context |
| color | text | UI display color |
| icon | text | Icon identifier |
| is_active | boolean | Whether category is enabled |
| sort_order | integer | Display order |
| created_by | uuid | Creator user ID |
| created_at | timestamp | Creation time |
| updated_at | timestamp | Last update |

**2. email_rules** - Stores rules linked to categories
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| workspace_id | uuid | FK to workspaces |
| category_id | uuid | FK to email_categories |
| name | text | Rule name |
| is_active | boolean | Whether rule is enabled |
| priority | integer | Execution order (higher = first) |
| created_by | uuid | Creator user ID |
| created_at | timestamp | Creation time |
| updated_at | timestamp | Last update |

**3. email_rule_actions** - Stores actions for each rule
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| rule_id | uuid | FK to email_rules |
| action_type | enum | "visibility", "tag", "extract_attachments", "extract_invoice", "move_folder", "mark_priority" |
| config | jsonb | Action-specific configuration |
| is_active | boolean | Whether action is enabled |
| created_at | timestamp | Creation time |

**4. email_tags** - Stores available tags
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| workspace_id | uuid | FK to workspaces |
| name | text | Tag name |
| color | text | Tag color |
| outlook_category | text | Corresponding Outlook category name |
| created_at | timestamp | Creation time |

**5. email_message_tags** - Junction table for email-tag relationships
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| email_id | uuid | FK to email_messages |
| tag_id | uuid | FK to email_tags |
| created_at | timestamp | When tag was applied |

**6. email_message_categories** - Stores AI classification results
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| email_id | uuid | FK to email_messages |
| category_id | uuid | FK to email_categories |
| confidence | decimal | AI confidence score (0-1) |
| processed_at | timestamp | When classified |

**7. email_visibility_groups** - Defines which team members can see emails
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| workspace_id | uuid | FK to workspaces |
| name | text | Group name |
| description | text | Group description |
| created_at | timestamp | Creation time |

**8. email_visibility_group_members** - Group membership
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| group_id | uuid | FK to email_visibility_groups |
| user_id | uuid | Team member user ID |
| created_at | timestamp | When added |

**9. extracted_invoices** - Stores extracted invoice data
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| workspace_id | uuid | FK to workspaces |
| email_id | uuid | FK to email_messages |
| vendor_name | text | Extracted vendor |
| invoice_number | text | Extracted invoice # |
| amount | decimal | Total amount |
| currency | text | Currency code |
| due_date | date | Payment due date |
| raw_extraction | jsonb | Full AI extraction result |
| status | text | "pending", "reviewed", "approved" |
| created_at | timestamp | Extraction time |

### Schema Updates

**email_messages** - Add new columns:
- `category_id` (uuid, nullable) - FK to email_categories
- `ai_confidence` (decimal, nullable) - Classification confidence
- `visibility_group_id` (uuid, nullable) - FK to email_visibility_groups
- `is_processed` (boolean, default false) - Whether AI processing complete

## Edge Functions

### 1. classify-email
Receives email content and uses Lovable AI to determine category.

**Input:**
- Email subject, body preview, sender info
- Workspace categories with descriptions

**Process:**
1. Build prompt with category definitions
2. Call Lovable AI (Gemini Flash for speed)
3. Return category ID and confidence score

### 2. process-email-rules
Applies all active rules for a categorized email.

**Input:**
- Email ID
- Category ID

**Process:**
1. Fetch all active rules for category
2. For each rule action:
   - **visibility**: Set visibility_group_id on email
   - **tag**: Create email_message_tags records + sync to Outlook
   - **extract_attachments**: Queue attachment processing
   - **extract_invoice**: Call extract-invoice function
   - **move_folder**: Call Graph API to move email
   - **mark_priority**: Update email importance in Outlook

### 3. extract-invoice
Uses Lovable AI to extract invoice data from email/attachments.

**Input:**
- Email body content
- Attachment metadata

**Process:**
1. Analyze email body for invoice patterns
2. Extract: vendor, invoice #, amount, currency, due date
3. Store in extracted_invoices table
4. Return structured data

### 4. sync-outlook-tags
Syncs local tags to Outlook categories.

**Input:**
- Email Microsoft message ID
- Tag names to apply

**Process:**
1. Get email categories from Outlook
2. Create missing categories
3. Apply categories to email

## Integration with Existing Flow

Modify `sync-emails` edge function to:
1. After upserting email, check if `is_processed` is false
2. Call `classify-email` to get category
3. Call `process-email-rules` to apply actions
4. Set `is_processed = true`

## UI Components

### Settings Page Additions

**1. Email Rules Settings Section**
- Located in Settings page as new card
- Tabs: Categories | Rules | Tags | Visibility Groups

**2. Categories Management**
- List of categories with name, color, icon, description
- Add/Edit/Delete category modal
- Drag to reorder

**3. Rules Management**
- List rules grouped by category
- Each rule shows: name, category, active actions, priority
- Rule editor with:
  - Category selector
  - Action checkboxes with configuration:
    - Visibility: dropdown to select group
    - Tags: multi-select tags
    - Extract attachments: folder name/pattern
    - Extract invoice: toggle on/off
    - Move folder: Outlook folder selector
    - Mark priority: high/normal/low

**4. Tags Management**
- List of tags with name, color
- Outlook category sync status indicator
- Add/Edit/Delete tag

**5. Visibility Groups Management**
- List of groups with member count
- Group editor with team member selector

### Email List Enhancements

- Show category badge on each email
- Show tags as colored pills
- Filter by category/tags
- Confidence indicator (optional)

### Invoice Dashboard (Future)

- List of extracted invoices
- Review/approve workflow
- Export to accounting

## Implementation Phases

**Phase 1: Database & Core Infrastructure**
- Create all new tables with RLS policies
- Update email_messages schema
- Create TypeScript types

**Phase 2: AI Classification Edge Function**
- Build classify-email function
- Integrate with sync-emails
- Test with sample emails

**Phase 3: Rules Engine**
- Build process-email-rules function
- Implement visibility action
- Implement tagging action

**Phase 4: Settings UI**
- Categories management
- Rules management
- Tags management
- Visibility groups

**Phase 5: Outlook Sync**
- sync-outlook-tags function
- Bi-directional category sync

**Phase 6: Invoice Extraction**
- extract-invoice function
- Invoice storage and display
- Review workflow

## Security Considerations

- All tables use workspace-based RLS
- Only workspace members can view/edit rules
- Visibility groups restrict email access within workspace
- AI processing happens server-side in edge functions
- Outlook API calls authenticated via stored tokens

## Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `supabase/migrations/XXXX_email_rules_schema.sql` | Create | New tables and RLS |
| `supabase/functions/classify-email/index.ts` | Create | AI classification |
| `supabase/functions/process-email-rules/index.ts` | Create | Rules engine |
| `supabase/functions/extract-invoice/index.ts` | Create | Invoice extraction |
| `supabase/functions/sync-outlook-tags/index.ts` | Create | Outlook tag sync |
| `supabase/functions/sync-emails/index.ts` | Modify | Add classification call |
| `supabase/config.toml` | Modify | Add new functions |
| `src/types/email-rules.ts` | Create | TypeScript types |
| `src/hooks/use-email-rules.ts` | Create | Rules CRUD hook |
| `src/pages/Settings.tsx` | Modify | Add rules section |
| `src/components/settings/EmailRulesSettings.tsx` | Create | Rules UI container |
| `src/components/settings/CategoriesManager.tsx` | Create | Categories CRUD |
| `src/components/settings/RulesManager.tsx` | Create | Rules CRUD |
| `src/components/settings/TagsManager.tsx` | Create | Tags CRUD |
| `src/components/settings/VisibilityGroupsManager.tsx` | Create | Groups CRUD |
| `src/components/email/EmailCategoryBadge.tsx` | Create | Category display |
| `src/components/email/EmailTagsList.tsx` | Create | Tags display |
