

# Manual Send to Rules Processing

## Overview

Add a checkbox/switch to the Classification Processing Queue that allows users to manually control when classified emails are sent to the Rules Processing Queue. This separates classification from queue movement, giving users a review step.

---

## Current Flow

```text
Classification Queue                   Rules Processing Queue
─────────────────────                  ─────────────────────────
entity_table IS NULL     ──AI sets──>  entity_table IS NOT NULL
                         entity_table  is_processed = false
```

When AI classification runs, it sets `entity_table` which automatically moves the email to Rules Processing Queue.

---

## New Flow

```text
Classification Queue                          Rules Processing Queue
─────────────────────                        ─────────────────────────
entity_table IS NULL                         entity_table IS NOT NULL
                                             is_processed = false
                         ──User clicks──>    ready_for_rules = true
                         "Send to Rules"     
```

We have two options:

### Option A: Use existing `entity_table` field (Recommended)
- Classification stays in queue until user manually sets/confirms `entity_table`
- AI can suggest `entity_table` in a separate field, user confirms by clicking checkbox

### Option B: Add a new flag `ready_for_rules`
- Would require database migration
- More explicit control but additional complexity

**Recommendation**: Option A - Allow manual entity type selection with a "Send to Rules" action on selected emails.

---

## Implementation

### 1. UI Changes - Classification Queue Table

Add a new column with a switch or checkbox to manually trigger sending to rules:

```tsx
// New column: "Ready for Rules" or "Send to Rules"
<TableHead className="w-[120px]">Ready</TableHead>

// Per row: Switch to mark as ready
<Switch 
  checked={email.entity_table !== null}
  onCheckedChange={(checked) => 
    checked 
      ? onSendToRules(email.id, selectedEntityType) 
      : onRemoveFromRules(email.id)
  }
/>
```

### 2. UI Changes - Toolbar

Add "Send to Rules" button for selected emails:

```tsx
<Button
  variant="outline"
  size="sm"
  onClick={handleSendToRulesSelected}
  disabled={selectedIds.size === 0 || isSending}
>
  <Play className="h-4 w-4 mr-2" />
  Send to Rules ({selectedIds.size})
</Button>
```

### 3. Entity Type Selector

Since emails need an `entity_table` to be in Rules Processing Queue, add entity type selector in the Classification Queue:

```tsx
// Add entity type column with dropdown
<Select
  value={email.suggested_entity_table || ""}
  onValueChange={(value) => onUpdateEntityType(email.id, value)}
>
  <SelectTrigger>
    <SelectValue placeholder="Select type..." />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="subscriptions">Subscriptions</SelectItem>
    <SelectItem value="expense_suppliers">Expense Suppliers</SelectItem>
    <SelectItem value="influencers">Influencers</SelectItem>
    {/* ... other entity types */}
  </SelectContent>
</Select>
```

### 4. Hook Changes

Add mutation for sending emails to rules processing:

```typescript
// In use-classification-processing-queue.ts
const sendToRulesMutation = useMutation({
  mutationFn: async ({ 
    emailIds, 
    entityTable 
  }: { 
    emailIds: string[]; 
    entityTable: string;
  }) => {
    const { error } = await supabase
      .from("email_messages")
      .update({ entity_table: entityTable })
      .in("id", emailIds);
    
    if (error) throw error;
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ["classification-processing-queue"] });
    queryClient.invalidateQueries({ queryKey: ["rules-processing-queue"] });
    queryClient.invalidateQueries({ queryKey: ["pending-classification-count"] });
    queryClient.invalidateQueries({ queryKey: ["pending-email-count"] });
    toast({
      title: "Sent to rules processing",
      description: "Emails have been queued for rule processing.",
    });
  },
});
```

---

## Detailed Component Changes

### Classification Queue Table - New Columns

| Checkbox | Sender | Subject | Sender Type | Entity Type | Ready | Status | Date |
|----------|--------|---------|-------------|-------------|-------|--------|------|

- **Entity Type**: Dropdown to select/confirm entity (populated from AI suggestion)
- **Ready**: Switch to mark email as ready for rules processing

### Toolbar Updates

```text
[Search...]  |  [Refresh]  [Classify Selected (3)]  [Send to Rules (3)]  [Classify All]
```

---

## Files to Modify

1. **`src/hooks/use-classification-processing-queue.ts`**
   - Add `sendToRules` mutation
   - Add `removeFromRules` mutation (sets `entity_table` back to null)

2. **`src/components/email/ClassificationProcessingQueueTable.tsx`**
   - Add Entity Type column with dropdown selector
   - Add Ready/Send switch per row
   - Pass entity table options from parent

3. **`src/pages/ClassificationProcessingQueue.tsx`**
   - Add "Send to Rules Selected" button to toolbar
   - Handle bulk send to rules action
   - Fetch available entity types

---

## Workflow After Implementation

1. User syncs emails (arrive in Classification Queue)
2. User runs AI classification on selected emails
3. AI determines `is_person` and suggests entity type (stored temporarily or shown in UI)
4. User reviews and adjusts sender type and entity type as needed
5. User checks "Ready" or clicks "Send to Rules" to move to Rules Processing Queue
6. Email now appears in Rules Processing Queue with confirmed entity type

