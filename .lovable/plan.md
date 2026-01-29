
# AI Classification: Determine Person vs Sender

## Overview

Enhance the AI classification step to determine not just the entity type, but also whether the email sender is a **person** (real human) or a **sender** (automated/non-person address). This ensures all classification decisions are made upfront before rules processing.

---

## Current Flow

```text
1. Email synced (sync-emails)
   ├─ Pattern match detects "noreply@" → creates sender record
   └─ No pattern match → leaves person_id null (will be created by rules)

2. Classification Queue (classify-email)
   └─ AI determines: entity_table only

3. Rules Processing Queue
   └─ Rules applied, person/sender linked to entity
```

**Problem**: Pattern matching during sync misses many non-person senders (e.g., `invoice@stripe.com`, `orders@amazon.com`) that don't match simple patterns like "noreply".

---

## Proposed Flow

```text
1. Email synced (sync-emails)
   └─ Basic storage, minimal pattern detection

2. Classification Queue (classify-email) ← ENHANCED
   └─ AI determines BOTH:
       a. entity_table (subscriptions, influencers, etc.)
       b. is_person (true/false) - is this a real person or automated sender?

3. Rules Processing Queue
   └─ Uses already-determined person/sender designation
```

---

## Database Changes

### Add `is_person` column to `email_messages`

```sql
ALTER TABLE public.email_messages 
  ADD COLUMN is_person boolean DEFAULT NULL;
```

This column will be:
- `true` - sender is a real person
- `false` - sender is a non-person (automated, newsletter, system)
- `null` - not yet classified

---

## Edge Function Changes

### 1. Update `classify-email` Function

**Current Response:**
```json
{
  "entity_table": "subscriptions",
  "confidence": 0.95,
  "reasoning": "..."
}
```

**New Response:**
```json
{
  "entity_table": "subscriptions",
  "is_person": false,
  "confidence": 0.95,
  "reasoning": "..."
}
```

**Updated AI Prompt:**
```text
You are an email classification assistant. Analyze this email and determine:
1. Which CRM entity type the sender belongs to
2. Whether the sender is a real PERSON or an automated/non-person sender

SENDER TYPE CRITERIA:
- PERSON (is_person: true): Individual humans, personal correspondence
- NON-PERSON (is_person: false): 
  * Automated systems (noreply, notifications, alerts)
  * Shared inboxes (support@, info@, billing@)
  * Newsletters and marketing
  * Transaction emails (orders@, invoice@, receipts@)

Available Entity Types:
{entity_list}

Email Details:
- From: {sender_name} <{sender_email}>
- Subject: {subject}
- Preview: {body_preview}

Respond with JSON:
{
  "entity_table": "...",
  "is_person": true/false,
  "confidence": 0.0-1.0,
  "reasoning": "..."
}
```

### 2. Update Classification Result Handling

After AI classification:
1. Set `email_messages.entity_table`
2. Set `email_messages.is_person` (new)
3. If `is_person = false` AND no `sender_id` exists:
   - Create a `senders` record
   - Link email via `sender_id`

### 3. Update `process-entity-rules`

When processing rules:
- Check `is_person` to determine whether to:
  - Create/link a `person` record (if `is_person = true`)
  - Create/link a `sender` record (if `is_person = false`)

---

## UI Updates

### Classification Queue Table
- Show sender type prediction after classification
- Optional: Show if AI thinks it's person vs sender

### Rules Processing Queue Table  
- Add visual indicator for person vs sender
- Display building icon for senders, person icon for people

```tsx
// Example badge component
function SenderTypeBadge({ isPerson }: { isPerson: boolean | null }) {
  if (isPerson === null) return null;
  
  return isPerson ? (
    <Badge variant="outline" className="gap-1">
      <User className="h-3 w-3" /> Person
    </Badge>
  ) : (
    <Badge variant="secondary" className="gap-1">
      <Bot className="h-3 w-3" /> Automated
    </Badge>
  );
}
```

---

## Hook Updates

### `use-classification-processing-queue.ts`
- Add `is_person` to the query select

### `use-rules-processing-queue.ts`
- Add `is_person` to the query select
- Update type definitions

---

## Technical Details

### Updated Types

```typescript
// Classification result from edge function
interface ClassificationResult {
  entity_table: string | null;
  is_person: boolean;
  confidence: number;
  reasoning: string;
}

// Updated queue email type
interface RulesProcessingQueueEmail {
  // ...existing fields
  is_person: boolean | null;
}
```

### Edge Cases Handled

1. **Cached mappings**: If person/sender already has entity mapping, use that
2. **Override**: Users can still manually change entity type AND person/sender designation in queue
3. **Existing emails**: `is_person = null` for emails classified before this update

---

## Implementation Order

1. **Database Migration** - Add `is_person` column to email_messages
2. **classify-email Update** - Add is_person to AI prompt and response handling
3. **process-entity-rules Update** - Use is_person to determine record creation
4. **Hooks Update** - Add is_person to queries and types
5. **UI Update** - Show person/sender indicator in queue tables

---

## Benefits

- **Single Classification Step**: All decisions made by AI at once
- **Better Accuracy**: AI can identify non-person senders that pattern matching misses
- **Cleaner Data**: No more "invoice@stripe.com" as Person records
- **Transparent**: Users see the person/sender determination before processing
