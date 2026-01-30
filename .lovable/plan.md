

# Webhook Object Processing System

## Overview

This plan implements a webhook system that allows external systems to create objects (Persons, Entities, and other CRM records) and process them through the existing entity automation rules engine - similar to how email automation works today.

The system mirrors the email flow:
1. **Webhook receives data** (like email sync receives emails)
2. **Objects enter a processing queue** (like Classification Queue)
3. **Rules are applied** (like Rules Processing Queue)

---

## Phase 1: Database Schema ✅ COMPLETED

### 1.1 New Tables ✅

**webhook_endpoints** (registered webhook sources) ✅
**webhook_events** (incoming webhook payloads - similar to email_messages) ✅
**webhook_event_logs** (processing history) ✅

### 1.2 New Enums ✅

```sql
CREATE TYPE webhook_event_status AS ENUM ('pending', 'processing', 'processed', 'failed');
```

### 1.3 RLS Policies ✅

- Users can manage their own webhook events
- Admins can manage all endpoints and events
- Service role access for webhook ingestion

---

## Phase 2: Edge Functions ✅ COMPLETED

### 2.1 `webhook-ingest` (Public Endpoint) ✅

**Purpose**: Receive incoming webhooks from external systems
**Endpoint**: `POST /functions/v1/webhook-ingest/{endpoint_slug}`

### 2.2 `classify-webhook-event` (AI Classification) 

**Purpose**: Use AI to determine entity type and person status
**Status**: Deferred - can be added later

### 2.3 `prepare-webhook-for-rules` ✅

**Purpose**: Create Person/Sender and Entity records before rule processing

### 2.4 `process-webhook-rules` ✅

**Purpose**: Apply entity automation rules to the webhook event

---

## Phase 3: Frontend Components ✅ COMPLETED

### 3.1 Webhook Endpoints Management

**Status**: Needs implementation - endpoint creation/management UI

### 3.2 Webhook Processing Queue (`/webhook-processing-queue`) ✅

- List pending webhook events
- Show source endpoint, event type, entity classification
- Override entity type before processing
- Toggle is_person flag
- Batch process selected events
- View payload details

### 3.3 Webhook Processing Log (`/webhook-log`) ✅

- View processed webhook events
- Show actions applied and results
- Filter by endpoint, status, entity type

### 3.4 Sidebar Updates ✅

Added to Workspace section:
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

