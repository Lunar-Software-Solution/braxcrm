# Messaging Ingest API

REST API endpoint for importing chat conversations from external messaging platforms into the CRM.

## Overview

The messaging ingest API allows external services to push chat conversations from WhatsApp, Signal, Telegram, and WeChat into the CRM system. Messages are stored in a conversation-centric model where each thread is a single database record with messages stored as a JSONB array.

## Endpoint

```
POST /functions/v1/messaging-ingest
```

**Base URL:** `https://ypmkbrdymnfxxwoogpdb.supabase.co`

**Full URL:** `https://ypmkbrdymnfxxwoogpdb.supabase.co/functions/v1/messaging-ingest`

## Authentication

The API uses API key authentication via the `x-api-key` header.

| Header | Required | Description |
|--------|----------|-------------|
| `x-api-key` | Yes | The API secret associated with your messaging connection |
| `Content-Type` | Yes | Must be `application/json` |

### Obtaining an API Key

1. Navigate to **Import → Messaging** in the CRM
2. Create a new connection for your platform
3. Copy the generated `API Secret` - this is your `x-api-key`

## Request Format

### Headers

```http
POST /functions/v1/messaging-ingest HTTP/1.1
Host: ypmkbrdymnfxxwoogpdb.supabase.co
Content-Type: application/json
x-api-key: your-api-secret-here
```

### Body Schema

```typescript
interface IngestRequest {
  platform: "whatsapp" | "signal" | "telegram" | "wechat";
  connection_id: string;
  conversations: IngestConversation[];
}

interface IngestConversation {
  external_conversation_id: string;
  participant_identifier: string;
  participant_name?: string;
  messages: IngestMessage[];
}

interface IngestMessage {
  id: string;
  direction: "inbound" | "outbound";
  type: "text" | "image" | "audio" | "video" | "file" | "location";
  content: string;
  media_url?: string | null;
  sent_at: string; // ISO 8601 timestamp
}
```

### Field Descriptions

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `platform` | string | Yes | Messaging platform identifier |
| `connection_id` | string | Yes | Your unique connection ID from the CRM |
| `conversations` | array | Yes | Array of conversation objects to ingest |

#### Conversation Object

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `external_conversation_id` | string | Yes | Unique identifier for the conversation thread on the source platform |
| `participant_identifier` | string | Yes | Phone number or username of the contact |
| `participant_name` | string | No | Display name of the contact |
| `messages` | array | Yes | Array of message objects |

#### Message Object

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | Yes | Unique message ID from the source platform (used for deduplication) |
| `direction` | string | Yes | `"inbound"` for received messages, `"outbound"` for sent messages |
| `type` | string | Yes | Message content type |
| `content` | string | Yes | Message text content or description |
| `media_url` | string | No | URL to media attachment (for image/audio/video/file types) |
| `sent_at` | string | Yes | ISO 8601 timestamp of when the message was sent |

### Message Types

| Type | Description |
|------|-------------|
| `text` | Plain text message |
| `image` | Image attachment |
| `audio` | Audio message or voice note |
| `video` | Video attachment |
| `file` | Document or file attachment |
| `location` | Location/GPS coordinates |

## Response Format

### Success Response (200 OK)

```json
{
  "success": true,
  "processed": 2,
  "results": [
    {
      "conversation_id": "conv_123",
      "messages_added": 5,
      "status": "created"
    },
    {
      "conversation_id": "conv_456",
      "messages_added": 3,
      "status": "updated"
    }
  ]
}
```

### Result Statuses

| Status | Description |
|--------|-------------|
| `created` | New conversation was created |
| `updated` | Existing conversation was updated with new messages |
| `no_new_messages` | All messages already existed (deduplicated) |
| `error: <message>` | Error occurred processing this conversation |

### Error Responses

#### 400 Bad Request

```json
{
  "error": "Missing required fields: platform, connection_id, conversations"
}
```

#### 401 Unauthorized

```json
{
  "error": "Missing x-api-key header"
}
```

```json
{
  "error": "Invalid API key"
}
```

```json
{
  "error": "Invalid connection_id or platform"
}
```

#### 403 Forbidden

```json
{
  "error": "Connection is inactive"
}
```

#### 500 Internal Server Error

```json
{
  "error": "Internal server error"
}
```

## Examples

### Example 1: Single Conversation with Text Messages

```bash
curl -X POST "https://ypmkbrdymnfxxwoogpdb.supabase.co/functions/v1/messaging-ingest" \
  -H "Content-Type: application/json" \
  -H "x-api-key: your-api-secret" \
  -d '{
    "platform": "whatsapp",
    "connection_id": "wa_business_123",
    "conversations": [
      {
        "external_conversation_id": "chat_abc123",
        "participant_identifier": "+1234567890",
        "participant_name": "John Doe",
        "messages": [
          {
            "id": "msg_001",
            "direction": "inbound",
            "type": "text",
            "content": "Hi, I am interested in your product",
            "sent_at": "2026-02-01T10:30:00Z"
          },
          {
            "id": "msg_002",
            "direction": "outbound",
            "type": "text",
            "content": "Hello! Thanks for reaching out. How can I help?",
            "sent_at": "2026-02-01T10:32:00Z"
          }
        ]
      }
    ]
  }'
```

### Example 2: Multiple Conversations with Media

```bash
curl -X POST "https://ypmkbrdymnfxxwoogpdb.supabase.co/functions/v1/messaging-ingest" \
  -H "Content-Type: application/json" \
  -H "x-api-key: your-api-secret" \
  -d '{
    "platform": "telegram",
    "connection_id": "tg_bot_456",
    "conversations": [
      {
        "external_conversation_id": "chat_user_1",
        "participant_identifier": "@johndoe",
        "participant_name": "John Doe",
        "messages": [
          {
            "id": "tg_msg_100",
            "direction": "inbound",
            "type": "image",
            "content": "Product photo",
            "media_url": "https://example.com/images/product.jpg",
            "sent_at": "2026-02-01T14:00:00Z"
          }
        ]
      },
      {
        "external_conversation_id": "chat_user_2",
        "participant_identifier": "@janedoe",
        "participant_name": "Jane Doe",
        "messages": [
          {
            "id": "tg_msg_200",
            "direction": "inbound",
            "type": "text",
            "content": "When will my order arrive?",
            "sent_at": "2026-02-01T15:30:00Z"
          }
        ]
      }
    ]
  }'
```

### Example 3: JavaScript/Node.js

```javascript
const response = await fetch(
  "https://ypmkbrdymnfxxwoogpdb.supabase.co/functions/v1/messaging-ingest",
  {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.MESSAGING_API_SECRET,
    },
    body: JSON.stringify({
      platform: "whatsapp",
      connection_id: "wa_business_123",
      conversations: [
        {
          external_conversation_id: "chat_abc123",
          participant_identifier: "+1234567890",
          participant_name: "John Doe",
          messages: [
            {
              id: "msg_" + Date.now(),
              direction: "inbound",
              type: "text",
              content: "Hello!",
              sent_at: new Date().toISOString(),
            },
          ],
        },
      ],
    }),
  }
);

const result = await response.json();
console.log(result);
```

### Example 4: Python

```python
import requests
from datetime import datetime

response = requests.post(
    "https://ypmkbrdymnfxxwoogpdb.supabase.co/functions/v1/messaging-ingest",
    headers={
        "Content-Type": "application/json",
        "x-api-key": "your-api-secret"
    },
    json={
        "platform": "signal",
        "connection_id": "signal_123",
        "conversations": [
            {
                "external_conversation_id": "signal_chat_001",
                "participant_identifier": "+1987654321",
                "participant_name": "Alice Smith",
                "messages": [
                    {
                        "id": "sig_msg_001",
                        "direction": "inbound",
                        "type": "text",
                        "content": "Can we schedule a call?",
                        "sent_at": datetime.utcnow().isoformat() + "Z"
                    }
                ]
            }
        ]
    }
)

print(response.json())
```

## Behavior Notes

### Message Deduplication

Messages are deduplicated based on their `id` field. If you send the same message ID multiple times, it will only be stored once. This allows for safe retries and incremental syncs.

### Contact Matching

The API automatically attempts to match the `participant_identifier` (phone number) to existing contacts in the People table. Matching is performed by:
1. Exact phone number match
2. Last 10 digits match (to handle different country code formats)

### Conversation Upsert

- If a conversation with the same `external_conversation_id` + `platform` + `user_id` exists, new messages are appended
- If no matching conversation exists, a new one is created
- The `last_message_at` and `last_message_preview` fields are automatically updated

### Connection Validation

Before processing, the API validates:
1. The `connection_id` exists and matches the `platform`
2. The `x-api-key` matches the connection's `api_secret`
3. The connection is marked as active (`is_active = true`)

## Rate Limits

There are no specific rate limits enforced by this endpoint, but consider:
- Batch messages into reasonable payloads (recommended: 100-500 messages per request)
- Avoid sending the same data repeatedly
- Implement exponential backoff on 5xx errors

## Best Practices

1. **Use unique message IDs** - Ensure each message has a truly unique `id` to prevent data loss from deduplication
2. **Batch appropriately** - Send multiple conversations/messages in a single request when possible
3. **Handle errors gracefully** - Check individual conversation results even on 200 responses
4. **Sync incrementally** - Only send new messages since your last successful sync
5. **Store connection credentials securely** - Never expose your `api_secret` in client-side code
