
# Plan: Complete Entity-Based Email Automation Flow

## Overview
Refactor the email processing pipeline to use the new entity-based system (`entity_table`, `entity_automation_rules`) instead of the old category-based system (`category_id`, `email_rules`). This includes:
1. Skip AI classification if person is already mapped to an entity
2. Update the Review Queue to show entity types instead of categories
3. Create a new `process-entity-rules` edge function
4. Wire everything together in the sync flow

## Current vs New Flow

```text
CURRENT FLOW (broken - uses old category_id):
  Sync -> classify-email (sets category_id) -> Review Queue (filters by category_id)
       -> process-email-rules (uses email_rules table)

NEW FLOW (entity-based):
  Sync -> Check people_entities for existing mapping
       -> If found: use cached entity_table (skip AI)
       -> If not: classify-email (sets entity_table)
       -> Review Queue (filters by entity_table)
       -> process-entity-rules (uses entity_automation_rules table)
```

## Implementation Steps

### Phase 1: Update sync-emails to Skip AI for Known Mappings

**File:** `supabase/functions/sync-emails/index.ts`

Changes:
1. Pass `personId` to the classification step
2. Query `people_entities` for existing entity mapping before calling AI
3. If mapping found, update `email_messages.entity_table` directly and skip AI
4. Update `classifyAndProcessEmail` to accept `personId` and handle cached mapping
5. Add `emailsSkippedAi` counter to track efficiency gains

### Phase 2: Update classify-email to Support person_id Lookup

**File:** `supabase/functions/classify-email/index.ts`

Changes:
1. Add optional `person_id` parameter to request interface
2. At start of function, check `people_entities` for existing mapping
3. If mapping exists, return early with cached result (confidence: 1.0)
4. This provides a fallback in case sync-emails doesn't catch it

### Phase 3: Create process-entity-rules Edge Function

**File:** `supabase/functions/process-entity-rules/index.ts` (NEW)

This function replaces `process-email-rules` for the new entity-based system:

1. Accept `email_id` and `entity_table` (instead of `category_id`)
2. Fetch actions from `entity_automation_rules` + `entity_rule_actions` for the given `entity_table`
3. Execute each action type:
   - `visibility`: Set `visibility_group_id` on email
   - `tag`: Add tags via `email_message_tags`
   - `extract_invoice`: Call `extract-invoice` edge function
   - `mark_priority`: Update email priority in Outlook
   - `link_entity`: Create entry in `email_influencers` / `email_resellers` / etc.
4. Log results to `email_rule_logs`
5. Mark email as `is_processed = true`

### Phase 4: Update Review Queue to Use entity_table

**File:** `src/hooks/use-review-queue.ts`

Changes:
1. Update `ReviewQueueEmail` interface:
   - Change `category_id` to `entity_table`
   - Remove `category` relation, add entity name display
2. Update query filter: `.not("entity_table", "is", null)` instead of `.not("category_id", "is", null)`
3. Update `updateCategory` mutation to become `updateEntityType` mutation (updates `entity_table`)
4. Update `processEmails` to call `process-entity-rules` with `entity_table`

**File:** `src/components/email/ReviewQueueTable.tsx`

Changes:
1. Replace `CategorySelector` with `EntitySelector` dropdown
2. Display entity type name (e.g., "Influencers", "Resellers") with icon
3. Update column header from "Category" to "Entity Type"

**File:** `src/pages/EmailReviewQueue.tsx`

Changes:
1. Update header text to reference "entity types"
2. Update entity selector integration

### Phase 5: Update usePendingEmailCount Hook

**File:** `src/hooks/use-review-queue.ts`

Changes:
1. Update filter from `.not("category_id", "is", null)` to `.not("entity_table", "is", null)`

## Database Schema Used

No new tables needed. Uses existing:
- `email_messages.entity_table` - stores classified entity type
- `email_messages.ai_confidence` - stores classification confidence
- `email_messages.is_processed` - tracks if rules have been applied
- `people_entities` - junction table for person-to-entity mappings
- `entity_automation_rules` - rules per entity type
- `entity_rule_actions` - actions for each rule

## Entity Types

The 7 entity types:
1. `influencers` - Social media influencers, content creators
2. `resellers` - Distributors, retailers, resale partners
3. `product_suppliers` - Vendors selling products for resale
4. `expense_suppliers` - Service providers and expense vendors
5. `corporate_management` - Legal, accounting, corporate entities
6. `personal_contacts` - Friends, family, personal acquaintances
7. `subscriptions` - Recurring subscriptions and SaaS services

## Files to Create/Modify

| File | Action |
|------|--------|
| `supabase/functions/sync-emails/index.ts` | Modify - Add people_entities check |
| `supabase/functions/classify-email/index.ts` | Modify - Add person_id param |
| `supabase/functions/process-entity-rules/index.ts` | Create - New entity-based processor |
| `src/hooks/use-review-queue.ts` | Modify - Use entity_table |
| `src/components/email/ReviewQueueTable.tsx` | Modify - Show entity types |
| `src/components/email/EntitySelector.tsx` | Create - Entity type dropdown |
| `src/pages/EmailReviewQueue.tsx` | Modify - Update labels |

## Edge Cases Handled

1. **New person (no mapping)**: Falls through to AI classification
2. **Person has multiple entity mappings**: Uses first/oldest mapping
3. **No entity rules defined**: Returns null classification gracefully
4. **Email already processed**: Skipped during sync
5. **AI classification fails**: Error logged, email stays in queue for retry

## Technical Details

### Entity-to-Link-Table Mapping

```typescript
const ENTITY_LINK_TABLES: Record<string, { table: string; idField: string }> = {
  influencers: { table: "email_influencers", idField: "influencer_id" },
  resellers: { table: "email_resellers", idField: "reseller_id" },
  product_suppliers: { table: "email_product_suppliers", idField: "product_supplier_id" },
  expense_suppliers: { table: "email_expense_suppliers", idField: "expense_supplier_id" },
  corporate_management: { table: "email_corporate_management", idField: "corporate_management_id" },
  personal_contacts: { table: "email_personal_contacts", idField: "personal_contact_id" },
  subscriptions: { table: "email_subscriptions", idField: "subscription_id" },
};
```

### Skip AI Logic in sync-emails

```typescript
async function getExistingEntityMapping(supabase: any, personId: string): Promise<string | null> {
  const { data: mapping } = await supabase
    .from("people_entities")
    .select("entity_table")
    .eq("person_id", personId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  
  return mapping?.entity_table || null;
}

// In classifyAndProcessEmail:
if (personId) {
  const existingEntity = await getExistingEntityMapping(supabase, personId);
  if (existingEntity) {
    await supabase
      .from("email_messages")
      .update({ entity_table: existingEntity, ai_confidence: 1.0 })
      .eq("id", emailId);
    return { classified: true, skippedAi: true };
  }
}
// Else call AI...
```

## Summary

This refactor completes the transition from category-based to entity-based email automation:
- Emails are classified by entity type (not category)
- Known senders skip AI (using `people_entities` cache)
- Review Queue shows entity types with ability to override
- Processing uses `entity_automation_rules` for configurable actions
- Full audit trail in `email_rule_logs`
