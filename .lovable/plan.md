

# Messaging Import System - Revised Data Model

## Your Concern: Valid Point

Storing every single chat message as its own database row would create:
- High volume of records (a single WhatsApp conversation could have hundreds of messages per day)
- Expensive queries when displaying conversations
- Storage overhead for metadata repeated on every row

## Proposed Alternative: Conversation-Based Storage

Instead of **one row per message**, we use **one row per conversation** (or **daily digest per conversation**) with messages stored as JSON arrays.

---

## Revised Database Schema

### Option A: One Row Per Conversation (Recommended)

**`chat_conversations`** - One record per unique conversation thread

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| platform | text | 'whatsapp', 'signal', 'telegram', 'wechat' |
| external_conversation_id | text | Platform-specific thread ID |
| person_id | uuid | FK to people table |
| entity_table | text | Optional entity association |
| entity_id | uuid | Optional entity record |
| participant_identifier | text | Phone/username of the contact |
| participant_name | text | Display name |
| messages | jsonb | Array of message objects (see below) |
| message_count | integer | Total messages in thread |
| last_message_at | timestamptz | Most recent message timestamp |
| last_message_preview | text | Preview of last message |
| user_id | uuid | CRM user who owns this |
| created_at | timestamptz | First message timestamp |
| updated_at | timestamptz | Last update |

**Messages JSONB Structure:**
```json
{
  "messages": [
    {
      "id": "ext_msg_123",
      "direction": "inbound",
      "type": "text",
      "content": "Hello, I'm interested in your product",
      "media_url": null,
      "sent_at": "2026-02-01T10:30:00Z"
    },
    {
      "id": "ext_msg_124", 
      "direction": "outbound",
      "type": "text",
      "content": "Thanks for reaching out! What can I help with?",
      "sent_at": "2026-02-01T10:32:00Z"
    }
  ]
}
```

### Option B: Daily Digest Per Conversation

If conversations are extremely long, we could also split by date:

**Primary Key**: `(external_conversation_id, date)` 

This creates one row per conversation per day, keeping the JSON arrays manageable.

---

## Comparison

| Approach | Rows (1 conversation, 100 msgs/day, 30 days) | Query Speed | Flexibility |
|----------|---------------------------------------------|-------------|-------------|
| One row per message | 3,000 rows | Slower | High (individual message search) |
| One row per conversation | 1 row | Fast | Good (full thread in one query) |
| Daily digest | 30 rows | Fast | Good (balance of both) |

---

## Recommendation: Option A (Conversation-Based)

For CRM use cases, you typically want to:
- See the full conversation thread at once
- Link the entire conversation to a Person
- Get recent activity quickly

This aligns with **one row per conversation**, which also matches how messaging apps display data (threaded views).

---

## Edge Function Changes

The `messaging-ingest` endpoint will:

1. Receive a batch of messages
2. Group by `external_conversation_id`
3. **Upsert** conversation records (create if new, append messages if existing)
4. Use PostgreSQL's `jsonb_concat` or array append to add new messages

```typescript
// Pseudo-code for upsert logic
const { error } = await supabase
  .from('chat_conversations')
  .upsert({
    external_conversation_id: convId,
    platform: 'whatsapp',
    messages: existingMessages.concat(newMessages),
    message_count: totalCount,
    last_message_at: latestTimestamp,
    last_message_preview: latestContent.slice(0, 100)
  }, { onConflict: 'external_conversation_id,platform' });
```

---

## Message Size Limits

To prevent any single JSONB column from growing too large:
- Implement a **max messages per conversation** limit (e.g., 500)
- When exceeded, archive older messages to a separate `chat_conversation_archives` table
- Or automatically split into daily chunks (hybrid of Options A + B)

---

## Implementation Phases

### Phase 1: Database
1. Create `chat_conversations` table with JSONB messages column
2. Create `messaging_connections` table (unchanged from original plan)
3. Add RLS policies and indexes on `person_id`, `platform`, `last_message_at`

### Phase 2: Edge Function
1. Create `messaging-ingest` with upsert logic
2. Implement message deduplication (check `id` within JSONB array)
3. Auto-match contacts by phone/username

### Phase 3: Frontend
1. Create conversation list component (shows one row per thread)
2. Create conversation detail view (renders messages from JSONB)
3. Add "Messages" tab to Person Detail page

---

## Files to Create/Modify

**New Files:**
- `supabase/functions/messaging-ingest/index.ts`
- `src/types/messaging.ts`
- `src/hooks/use-chat-conversations.ts`
- `src/pages/MessagingConnections.tsx`
- `src/components/crm/ConversationList.tsx`
- `src/components/crm/ConversationThread.tsx`

**Modified Files:**
- `src/App.tsx` (add routes)
- `src/components/layout/CRMSidebar.tsx` (add nav item)
- `src/pages/PersonDetail.tsx` (add Messages tab)

