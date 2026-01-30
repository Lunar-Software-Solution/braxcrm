

# Plan: Create Entity Records When Sending to Rules Queue

## Overview
Move the automatic Person/Sender and Entity record creation from the `process-entity-rules` edge function to the point when users click "Send to Rules" in the Classification Queue. This ensures records are created and linked immediately when an entity type is assigned, not later during rule execution.

---

## Current Flow
```text
Classification Queue → [Send to Rules] → Rules Queue → [Process] → Create records
                              ↓
                     Just sets entity_table
```

## Proposed Flow  
```text
Classification Queue → [Send to Rules] → Create records → Rules Queue → [Process] → Run actions only
                              ↓
                     Sets entity_table + creates Person/Sender + Entity
```

---

## Implementation Approach

There are two options for where to put this logic:

**Option A: Frontend Hook (Simpler)**
- Modify `sendToRulesMutation` in `use-classification-processing-queue.ts`
- Call a new edge function or inline logic to create records before setting `entity_table`

**Option B: Backend Edge Function (Recommended)**
- Create a new edge function `prepare-for-rules` that:
  1. Creates Person or Sender record if needed
  2. Creates Entity record in the target table if needed
  3. Links them together
  4. Sets `entity_table` on the email
- The frontend just calls this function instead of directly updating the database

I recommend **Option B** because it keeps the complex logic server-side and uses `service_role` key for cross-table operations.

---

## Implementation Steps

### Step 1: Create New Edge Function
**File:** `supabase/functions/prepare-for-rules/index.ts`

A new edge function that:
1. Accepts `email_ids[]` and `entity_table`
2. For each email, determines if it's a person or non-person sender
3. Creates Person or Sender record if needed (updates `email_messages.person_id` or `sender_id`)
4. Creates Entity record in the target table if needed
5. Links Person→Entity (via `people_entities`) or Sender→Entity (via `senders.entity_id`)
6. Links Email→Entity (via `email_[entity_type]` table)
7. Sets `entity_table` on the email to move it to Rules Queue

### Step 2: Update Frontend Hook
**File:** `src/hooks/use-classification-processing-queue.ts`

Modify `sendToRulesMutation` to call the new edge function instead of directly updating `entity_table`:

```typescript
const sendToRulesMutation = useMutation({
  mutationFn: async ({ emailIds, entityTable }) => {
    const response = await supabase.functions.invoke("prepare-for-rules", {
      body: { email_ids: emailIds, entity_table: entityTable },
    });
    if (response.error) throw new Error(response.error.message);
    return response.data;
  },
  // ... same success/error handling
});
```

### Step 3: Simplify process-entity-rules
**File:** `supabase/functions/process-entity-rules/index.ts`

Remove or make optional the `ensureRecordsExist()` call since records will already exist when emails reach the Rules Queue. Keep it as a fallback for edge cases.

---

## Edge Function Logic Detail

```typescript
// supabase/functions/prepare-for-rules/index.ts

async function prepareEmailForRules(
  supabase: SupabaseClient,
  emailId: string,
  entityTable: string,
  userId: string
): Promise<void> {
  // 1. Get email details
  const { data: email } = await supabase
    .from("email_messages")
    .select("person_id, sender_id, sender_email, sender_name, is_person")
    .eq("id", emailId)
    .single();

  const isPerson = email?.is_person ?? true;

  if (isPerson) {
    // 2a. Find or create Person
    let personId = email.person_id;
    if (!personId && email.sender_email) {
      personId = await findOrCreatePerson(supabase, email.sender_email, email.sender_name, userId);
      await supabase.from("email_messages").update({ person_id: personId }).eq("id", emailId);
    }
    
    // 3a. Find or create Entity, link to Person
    if (personId) {
      const entityId = await findOrCreateEntityForPerson(supabase, personId, entityTable, userId);
      await linkEmailToEntity(supabase, emailId, entityTable, entityId);
    }
  } else {
    // 2b. Find or create Sender
    let senderId = email.sender_id;
    if (!senderId && email.sender_email) {
      senderId = await createSender(supabase, email.sender_email, email.sender_name, userId);
      await supabase.from("email_messages").update({ sender_id: senderId }).eq("id", emailId);
    }
    
    // 3b. Find or create Entity, link to Sender
    if (senderId) {
      const entityId = await findOrCreateEntityForSender(supabase, senderId, entityTable, userId);
      await linkEmailToEntity(supabase, emailId, entityTable, entityId);
    }
  }

  // 4. Set entity_table to move email to Rules Queue
  await supabase.from("email_messages")
    .update({ entity_table: entityTable })
    .eq("id", emailId);
}
```

---

## Files Changed

| File | Change |
|------|--------|
| `supabase/functions/prepare-for-rules/index.ts` | New edge function for record creation |
| `src/hooks/use-classification-processing-queue.ts` | Update `sendToRulesMutation` to call new function |
| `supabase/functions/process-entity-rules/index.ts` | Remove/simplify `ensureRecordsExist()` (optional) |
| `supabase/config.toml` | Add config for new function (if needed) |

---

## Benefits

1. **Immediate Record Creation**: Person/Sender and Entity records exist as soon as user assigns an entity type
2. **Visible in CRM**: New entities appear immediately in entity list pages
3. **Cleaner Rules Processing**: Rules just run actions, don't need to create base records
4. **Better User Feedback**: User sees the records created before processing rules

---

## Summary

When a user clicks "Send to Rules" with an entity type selected:
- Person or Sender record is created/found based on `is_person` flag
- Entity record is created in the target table (e.g., `subscriptions`)
- All linkages are established (Person↔Entity, Email↔Entity)
- Email moves to Rules Processing Queue with everything ready

