
# Plan: Auto-Create Person/Sender and Entity Records During Rules Processing

## Overview
Currently, Person/Sender and Entity records are only created when an Entity Automation Rule with a `link_entity` action is configured. This means if rules are missing or don't include this action, emails get processed but no CRM records are created.

This plan modifies the `process-entity-rules` edge function to **always** create the necessary Person/Sender and Entity records when processing emails, regardless of whether a `link_entity` action exists in the rules.

---

## Current Behavior
1. Classification determines `is_person` and suggests `entity_table`
2. User sends email to Rules Processing Queue (setting `entity_table`)
3. Processing invokes `process-entity-rules` edge function
4. Records are ONLY created if rules contain a `link_entity` action
5. If no rules or no `link_entity` action, email is marked processed without creating records

## Proposed Behavior
1. Same classification and queue steps
2. When processing, BEFORE running any rule actions:
   - If `is_person = true`: Create Person record (if not exists) and Entity record (if not exists), link them
   - If `is_person = false`: Create Sender record (if not exists) and Entity record (if not exists), link them
3. Then run any configured rule actions normally
4. Existing `link_entity` action becomes optional (for backward compatibility)

---

## Implementation Steps

### Step 1: Create Missing Email Link Tables
**Type:** Database Migration

Create the missing link tables for entity types that don't have them:

```text
+------------------------+
| email_subscriptions    |
+------------------------+
| id (uuid, PK)          |
| email_id (uuid, FK)    |
| subscription_id (uuid) |
| assigned_at (timestamptz) |
+------------------------+

+------------------------+
| email_personal_contacts|
+------------------------+
| id (uuid, PK)          |
| email_id (uuid, FK)    |
| personal_contact_id    |
| assigned_at (timestamptz) |
+------------------------+
```

Add appropriate RLS policies matching the existing patterns.

### Step 2: Update Edge Function Entity Mapping
**File:** `supabase/functions/process-entity-rules/index.ts`

Update `ENTITY_LINK_TABLES` to include all 8 entity types:
```typescript
const ENTITY_LINK_TABLES: Record<string, { table: string; idField: string }> = {
  influencers: { table: "email_influencers", idField: "influencer_id" },
  resellers: { table: "email_resellers", idField: "reseller_id" },
  product_suppliers: { table: "email_product_suppliers", idField: "product_supplier_id" },
  expense_suppliers: { table: "email_expense_suppliers", idField: "expense_supplier_id" },
  corporate_management: { table: "email_corporate_management", idField: "corporate_management_id" },
  personal_contacts: { table: "email_personal_contacts", idField: "personal_contact_id" },
  subscriptions: { table: "email_subscriptions", idField: "subscription_id" },
  marketing_sources: { table: "email_marketing_sources", idField: "marketing_source_id" },
};
```

### Step 3: Add Auto-Creation Logic Before Rule Processing
**File:** `supabase/functions/process-entity-rules/index.ts`

Add a new function `ensureRecordsExist()` that runs before any rule actions:

```typescript
async function ensureRecordsExist(
  supabase: SupabaseClient,
  emailId: string,
  entityTable: string,
  userId: string
): Promise<{ personId?: string; senderId?: string; entityId?: string }> {
  // 1. Get email details
  const { data: email } = await supabase
    .from("email_messages")
    .select("person_id, sender_id, sender_email, sender_name, is_person")
    .eq("id", emailId)
    .single();

  const isPerson = email?.is_person ?? true;
  
  if (isPerson) {
    // 2a. Create Person if needed
    let personId = email?.person_id;
    if (!personId && email?.sender_email) {
      personId = await findOrCreatePerson(supabase, email.sender_email, email.sender_name, userId);
      // Update email with person_id
      await supabase.from("email_messages").update({ person_id: personId }).eq("id", emailId);
    }
    
    // 3a. Create Entity if needed and link to person
    if (personId) {
      const entityId = await findOrCreateEntityForPerson(supabase, personId, entityTable, userId);
      // Link email to entity
      await linkEmailToEntity(supabase, emailId, entityTable, entityId);
      return { personId, entityId };
    }
  } else {
    // 2b. Create Sender if needed
    let senderId = email?.sender_id;
    if (!senderId && email?.sender_email) {
      senderId = await createSenderFromEmail(supabase, email.sender_email, email.sender_name, userId);
      await supabase.from("email_messages").update({ sender_id: senderId }).eq("id", emailId);
    }
    
    // 3b. Create Entity if needed and link to sender
    if (senderId) {
      const entityId = await findOrCreateEntityForSender(supabase, senderId, entityTable, userId);
      // Link email to entity
      await linkEmailToEntity(supabase, emailId, entityTable, entityId);
      return { senderId, entityId };
    }
  }
  
  return {};
}
```

### Step 4: Integrate Auto-Creation into Main Handler
**File:** `supabase/functions/process-entity-rules/index.ts`

Modify the main `serve()` handler to call `ensureRecordsExist()` before processing rules:

```typescript
// After validating request parameters and before fetching rules:
await ensureRecordsExist(supabase, email_id, entity_table, userId);

// Then continue with existing rule fetching and processing logic
```

### Step 5: Make link_entity Action Optional
The existing `link_entity` action in rules becomes redundant for basic linking but can remain for advanced scenarios (e.g., linking to different entity types, custom logic).

---

## Files Changed

| File | Change |
|------|--------|
| Database Migration | Create `email_subscriptions` and `email_personal_contacts` tables |
| `supabase/functions/process-entity-rules/index.ts` | Add auto-creation logic before rule processing |

---

## Summary
After this change:
- Every processed email automatically gets a Person OR Sender record
- Every processed email automatically gets an Entity record in the target table
- Records are properly linked (Person-to-Entity via `people_entities`, Sender-to-Entity via `senders.entity_id`)
- Email is linked to Entity via the appropriate link table
- Existing rules continue to work, but `link_entity` action is no longer required for basic functionality
