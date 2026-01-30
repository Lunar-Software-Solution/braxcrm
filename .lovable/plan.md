

# Webhook Object Processing System

## Overview

This plan implements a webhook system that allows external systems to create objects (Persons, Entities, and other CRM records) and process them through the existing entity automation rules engine - similar to how email automation works today.

The system mirrors the email flow:
1. **Webhook receives data** (like email sync receives emails)
2. **Objects enter a processing queue** (like Classification Queue)
3. **Rules are applied** (like Rules Processing Queue)

---

## Phase 1: Database Schema

### 1.1 New Tables

**webhook_endpoints** (registered webhook sources)
```text
webhook_endpoints
  - id (uuid, PK)
  - name (text) -- "Shopify Orders", "Stripe Webhooks"
  - slug (text, unique) -- URL-safe identifier
  - secret_key (text) -- for signature verification
  - is_active (boolean, default true)
  - description (text, nullable)
  - allowed_object_types (text[]) -- ['person', 'influencer', 'subscription', etc.]
  - default_entity_table (text, nullable) -- default entity type
  - created_by (uuid)
  - created_at, updated_at (timestamps)
```

**webhook_events** (incoming webhook payloads - similar to email_messages)
```text
webhook_events
  - id (uuid, PK)
  - endpoint_id (FK -> webhook_endpoints)
  - external_id (text, nullable) -- external system's ID
  - event_type (text) -- "contact.created", "order.completed"
  - payload (jsonb) -- raw webhook data
  - status (enum: pending, processing, processed, failed)
  - entity_table (text, nullable) -- classified entity type
  - is_person (boolean, nullable) -- person vs automated sender
  - person_id (FK -> people, nullable)
  - entity_id (uuid, nullable) -- linked entity record
  - ai_confidence (numeric, nullable)
  - error_message (text, nullable)
  - processed_at (timestamptz, nullable)
  - user_id (uuid)
  - created_at (timestamp)
```

**webhook_event_logs** (processing history)
```text
webhook_event_logs
  - id (uuid, PK)
  - webhook_event_id (FK -> webhook_events)
  - action_type (text) -- "create_person", "create_entity", "apply_tag", etc.
  - action_config (jsonb)
  - success (boolean)
  - error_message (text, nullable)
  - processed_at (timestamp)
```

### 1.2 New Enums

```sql
CREATE TYPE webhook_event_status AS ENUM ('pending', 'processing', 'processed', 'failed');
```

### 1.3 RLS Policies

- Users can manage their own webhook events
- Admins can manage all endpoints and events
- Service role access for webhook ingestion

---

## Phase 2: Edge Functions

### 2.1 `webhook-ingest` (Public Endpoint)

**Purpose**: Receive incoming webhooks from external systems

**Features**:
- Validate webhook signature using endpoint secret
- Store raw payload in `webhook_events`
- Optionally auto-classify entity type using AI
- Set initial status to `pending`

**Endpoint**: `POST /functions/v1/webhook-ingest/{endpoint_slug}`

**Request Flow**:
```text
External System -> webhook-ingest -> webhook_events (status: pending)
```

### 2.2 `classify-webhook-event` (AI Classification)

**Purpose**: Use AI to determine entity type and person status

**Similar to**: `classify-email` function

**Determines**:
- Which entity table the object belongs to (influencer, subscription, etc.)
- Whether it's a person or automated/system record
- Confidence score

### 2.3 `prepare-webhook-for-rules`

**Purpose**: Create Person/Sender and Entity records before rule processing

**Similar to**: `prepare-for-rules` function

**Actions**:
1. Find or create Person record (if is_person = true)
2. Find or create Entity record in target table
3. Link Person to Entity via `people_entities`
4. Update webhook_event with person_id and entity_id

### 2.4 `process-webhook-rules`

**Purpose**: Apply entity automation rules to the webhook event

**Similar to**: `process-entity-rules` function

**Actions**:
- Fetch active rules for the entity_table
- Apply each rule action (tag, extract_invoice, etc.)
- Log results to `webhook_event_logs`
- Mark event as `processed`

---

## Phase 3: Frontend Components

### 3.1 Webhook Endpoints Management (`/settings` or `/webhook-endpoints`)

**Features**:
- List all registered webhook endpoints
- Create/edit/delete endpoints
- Generate and rotate secret keys
- View endpoint URL for external configuration

### 3.2 Webhook Processing Queue (`/webhook-processing-queue`)

**Similar to**: Rules Processing Queue

**Features**:
- List pending webhook events
- Show source endpoint, event type, entity classification
- Override entity type before processing
- Toggle is_person flag
- Batch process selected events
- View payload details

### 3.3 Webhook Processing Log (`/webhook-log`)

**Features**:
- View processed webhook events
- Show actions applied and results
- Filter by endpoint, status, entity type
- Reprocess failed events

### 3.4 Sidebar Updates

Add to Workspace section:
- "Webhook Queue" with pending count badge
- "Webhook Log"

---

## Phase 4: Automation Rules Extension

The existing `entity_automation_rules` and `entity_rule_actions` tables work for both email and webhook processing. No schema changes needed.

### 4.1 Action Compatibility

Existing actions that work with webhooks:
- **tag** - Apply tags (may need generic tag storage)
- **extract_invoice** - Extract from payload if applicable
- **assign_role** - Assign entity role

### 4.2 New Webhook-Specific Actions (Optional)

Consider adding:
- **send_notification** - Notify user of new record
- **call_webhook** - Chain to another webhook

---

## Phase 5: Data Flow Architecture

```text
                                    +-----------------------+
                                    |   External Systems    |
                                    | (Shopify, Stripe, etc)|
                                    +-----------+-----------+
                                                |
                                                v
+---------------------------+    +-----------------------+
|    webhook-ingest         |<---|   POST /webhook/{slug}|
|  (validate & store)       |    +-----------------------+
+------------+--------------+
             |
             v
+---------------------------+
|     webhook_events        |
|   (status: pending)       |
+------------+--------------+
             |
             v (optional auto-classify)
+---------------------------+
|  classify-webhook-event   |
|   (AI entity detection)   |
+------------+--------------+
             |
             v
+---------------------------+
|   Webhook Queue UI        |
| (review & approve)        |
+------------+--------------+
             |
             v (user clicks "Process")
+---------------------------+
| prepare-webhook-for-rules |
| (create Person/Entity)    |
+------------+--------------+
             |
             v
+---------------------------+
|  process-webhook-rules    |
| (apply entity rules)      |
+------------+--------------+
             |
             v
+---------------------------+
|     webhook_events        |
|  (status: processed)      |
+---------------------------+
```

---

## Technical Details

### Files to Create

| File | Purpose |
|------|---------|
| `supabase/functions/webhook-ingest/index.ts` | Public webhook receiver |
| `supabase/functions/classify-webhook-event/index.ts` | AI classification |
| `supabase/functions/prepare-webhook-for-rules/index.ts` | Record creation |
| `supabase/functions/process-webhook-rules/index.ts` | Rule execution |
| `src/pages/WebhookProcessingQueue.tsx` | Queue UI |
| `src/pages/WebhookLog.tsx` | Processing log |
| `src/pages/WebhookEndpoints.tsx` | Endpoint management |
| `src/hooks/use-webhook-events.ts` | Data hooks |
| `src/hooks/use-webhook-endpoints.ts` | Endpoint hooks |
| `src/types/webhooks.ts` | TypeScript types |
| `src/components/webhook/WebhookQueueTable.tsx` | Queue table component |

### Files to Modify

| File | Change |
|------|--------|
| `src/components/layout/CRMSidebar.tsx` | Add Webhook Queue nav item |
| `src/App.tsx` | Add webhook routes |
| `src/pages/Settings.tsx` | Add Webhook Endpoints section |
| `supabase/config.toml` | Add function configs with `verify_jwt = false` for public endpoint |

### Payload Schema (Recommended)

External systems should send:
```json
{
  "external_id": "cust_123",
  "event_type": "contact.created",
  "data": {
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "+1234567890",
    "company": "Acme Inc",
    "metadata": {}
  }
}
```

### Security Considerations

1. **Signature Verification**: HMAC-SHA256 validation
2. **Rate Limiting**: Per-endpoint rate limits
3. **Payload Size**: Max 1MB payload
4. **RLS**: User isolation for webhook events

---

## Implementation Order

1. **Database migrations** - Create tables and enums
2. **webhook-ingest function** - Public receiver with signature validation
3. **Webhook Endpoints UI** - Settings page for endpoint management
4. **Webhook Queue page** - View pending events
5. **prepare-webhook-for-rules** - Record creation logic
6. **process-webhook-rules** - Rule execution (reuse entity automation)
7. **classify-webhook-event** - Optional AI classification
8. **Webhook Log page** - Processing history

---

## Comparison: Email vs Webhook Flow

| Step | Email Flow | Webhook Flow |
|------|------------|--------------|
| Ingestion | `sync-emails` | `webhook-ingest` |
| Storage | `email_messages` | `webhook_events` |
| Classification | `classify-email` | `classify-webhook-event` |
| Review Queue | Classification Queue | Webhook Queue |
| Record Creation | `prepare-for-rules` | `prepare-webhook-for-rules` |
| Rules Queue | Rules Processing Queue | (combined in Webhook Queue) |
| Rule Execution | `process-entity-rules` | `process-webhook-rules` |
| Logging | `email_rule_logs` | `webhook_event_logs` |

