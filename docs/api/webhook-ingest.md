# Webhook Ingest API

REST API endpoint for receiving webhook events from external systems.

## Overview

The webhook ingest API allows external services to push events into the CRM for processing. Events are queued and can trigger classification, rules processing, and entity creation.

## Endpoint

```
POST /functions/v1/webhook-ingest/{slug}
```

**Base URL:** `https://ypmkbrdymnfxxwoogpdb.supabase.co`

**Full URL:** `https://ypmkbrdymnfxxwoogpdb.supabase.co/functions/v1/webhook-ingest/{slug}`

Replace `{slug}` with your endpoint's unique identifier.

## Authentication

### Option 1: No Authentication
Endpoints can be configured to accept requests without authentication (not recommended for production).

### Option 2: Signature Verification (Recommended)
Pass an HMAC-SHA256 signature of the request body in the `x-webhook-signature` header.

| Header | Required | Description |
|--------|----------|-------------|
| `x-webhook-signature` | Optional | HMAC-SHA256 hex signature of the raw request body |
| `Content-Type` | Yes | Must be `application/json` |

### Generating a Signature

```javascript
const crypto = require('crypto');

function generateSignature(payload, secret) {
  return crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(payload))
    .digest('hex');
}

const signature = generateSignature(payload, 'your-endpoint-secret');
```

```python
import hmac
import hashlib
import json

def generate_signature(payload, secret):
    return hmac.new(
        secret.encode(),
        json.dumps(payload).encode(),
        hashlib.sha256
    ).hexdigest()
```

## Request Format

### Headers

```http
POST /functions/v1/webhook-ingest/my-endpoint-slug HTTP/1.1
Host: ypmkbrdymnfxxwoogpdb.supabase.co
Content-Type: application/json
x-webhook-signature: abc123def456...
```

### Body Schema

```typescript
interface WebhookPayload {
  external_id?: string;      // Optional external reference ID
  event_type: string;        // Required event type identifier
  data: Record<string, any>; // Event payload data
}
```

### Field Descriptions

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `external_id` | string | No | External reference ID for deduplication/tracking |
| `event_type` | string | Yes | Event type identifier (e.g., "form_submission", "order_created") |
| `data` | object | Yes | Event-specific payload data |

## Response Format

### Success Response (200 OK)

```json
{
  "success": true,
  "event_id": "550e8400-e29b-41d4-a716-446655440000",
  "message": "Webhook received and queued for processing"
}
```

### Error Responses

#### 400 Bad Request

```json
{
  "error": "Missing endpoint slug in URL path"
}
```

```json
{
  "error": "Invalid JSON payload"
}
```

```json
{
  "error": "Missing required field: event_type"
}
```

#### 401 Unauthorized

```json
{
  "error": "Invalid webhook signature"
}
```

#### 404 Not Found

```json
{
  "error": "Webhook endpoint not found or inactive"
}
```

#### 413 Payload Too Large

```json
{
  "error": "Payload too large (max 1MB)"
}
```

#### 500 Internal Server Error

```json
{
  "error": "Internal server error"
}
```

## Examples

### Example 1: Form Submission

```bash
curl -X POST "https://ypmkbrdymnfxxwoogpdb.supabase.co/functions/v1/webhook-ingest/contact-form" \
  -H "Content-Type: application/json" \
  -d '{
    "event_type": "form_submission",
    "external_id": "form_12345",
    "data": {
      "name": "John Doe",
      "email": "john@example.com",
      "phone": "+1234567890",
      "message": "I would like more information about your services",
      "source": "website_contact_form"
    }
  }'
```

### Example 2: E-commerce Order

```bash
curl -X POST "https://ypmkbrdymnfxxwoogpdb.supabase.co/functions/v1/webhook-ingest/orders" \
  -H "Content-Type: application/json" \
  -H "x-webhook-signature: a1b2c3d4e5f6..." \
  -d '{
    "event_type": "order_created",
    "external_id": "ORD-2026-001",
    "data": {
      "customer": {
        "name": "Jane Smith",
        "email": "jane@example.com"
      },
      "items": [
        {"sku": "PROD-001", "quantity": 2, "price": 29.99}
      ],
      "total": 59.98,
      "currency": "USD"
    }
  }'
```

### Example 3: JavaScript with Signature

```javascript
const crypto = require('crypto');

const payload = {
  event_type: "user_signup",
  external_id: "user_abc123",
  data: {
    email: "newuser@example.com",
    plan: "premium",
    referrer: "google"
  }
};

const secret = process.env.WEBHOOK_SECRET;
const signature = crypto
  .createHmac('sha256', secret)
  .update(JSON.stringify(payload))
  .digest('hex');

const response = await fetch(
  "https://ypmkbrdymnfxxwoogpdb.supabase.co/functions/v1/webhook-ingest/signups",
  {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-webhook-signature": signature
    },
    body: JSON.stringify(payload)
  }
);

console.log(await response.json());
```

### Example 4: Python with Signature

```python
import requests
import hmac
import hashlib
import json

payload = {
    "event_type": "subscription_cancelled",
    "external_id": "sub_xyz789",
    "data": {
        "customer_id": "cust_123",
        "reason": "too_expensive",
        "cancelled_at": "2026-02-01T12:00:00Z"
    }
}

secret = "your-webhook-secret"
signature = hmac.new(
    secret.encode(),
    json.dumps(payload).encode(),
    hashlib.sha256
).hexdigest()

response = requests.post(
    "https://ypmkbrdymnfxxwoogpdb.supabase.co/functions/v1/webhook-ingest/subscriptions",
    headers={
        "Content-Type": "application/json",
        "x-webhook-signature": signature
    },
    json=payload
)

print(response.json())
```

## Endpoint Configuration

Webhook endpoints are configured in the CRM at **Import → Endpoints**.

### Configuration Options

| Option | Description |
|--------|-------------|
| Slug | Unique URL path identifier |
| Secret Key | HMAC secret for signature verification |
| Default Entity Table | Default entity type for events |
| Allowed Object Types | Restrict which entity types can be created |
| Is Active | Enable/disable the endpoint |

### Entity Type Routing

Events can specify an `entity_type` in the `data` object to route to different entity tables:

```json
{
  "event_type": "contact_created",
  "data": {
    "entity_type": "influencers",
    "name": "Popular Influencer",
    "email": "influencer@example.com"
  }
}
```

If `entity_type` matches an allowed object type, it will be used; otherwise, the default entity table is applied.

## Processing Pipeline

1. **Receive** - Webhook is received and validated
2. **Store** - Event is stored in `webhook_events` table with status `pending`
3. **Classify** - AI classification determines entity type and extracts data
4. **Rules** - Event is processed through automation rules
5. **Complete** - Event status updated to `processed` or `failed`

## Payload Size Limits

- Maximum payload size: **1 MB**
- Larger payloads will receive a `413 Payload Too Large` response

## Idempotency

Use the `external_id` field to enable idempotent processing:
- Store this ID in your system when sending webhooks
- Check for existing events with the same `external_id` before processing duplicates

## Best Practices

1. **Always use signature verification** - Protect against spoofed requests
2. **Include external_id** - Enables idempotency and debugging
3. **Use descriptive event_type** - Makes classification and routing easier
4. **Handle failures gracefully** - Implement retry logic with exponential backoff
5. **Monitor webhook delivery** - Track response codes and processing times
6. **Keep payloads focused** - Only include data needed for processing
