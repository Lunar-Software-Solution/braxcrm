# API Documentation

This directory contains documentation for the CRM's external APIs.

## Available APIs

| API | Description | Documentation |
|-----|-------------|---------------|
| Messaging Ingest | Import chat conversations from WhatsApp, Signal, Telegram, WeChat | [messaging-ingest.md](./messaging-ingest.md) |
| Messaging People | Fetch People records for contact matching | [messaging-people.md](./messaging-people.md) |
| Webhook Ingest | Receive webhook events from external systems | [webhook-ingest.md](./webhook-ingest.md) |

## Authentication

All APIs use one of the following authentication methods:

### API Key Authentication
Used by: Messaging Ingest, Webhook Ingest

Pass your API secret in the `x-api-key` header:
```http
x-api-key: your-api-secret-here
```

### Webhook Signature Verification
Used by: Webhook Ingest (optional)

Pass an HMAC-SHA256 signature in the `x-webhook-signature` header for payload verification.

## Base URL

All API endpoints are available at:

```
https://ypmkbrdymnfxxwoogpdb.supabase.co/functions/v1/
```

## Common Response Codes

| Code | Description |
|------|-------------|
| 200 | Success |
| 400 | Bad Request - Invalid payload |
| 401 | Unauthorized - Missing or invalid API key |
| 403 | Forbidden - Connection inactive or access denied |
| 404 | Not Found - Endpoint or resource not found |
| 413 | Payload Too Large |
| 500 | Internal Server Error |

## Rate Limiting

APIs do not enforce strict rate limits, but please be considerate:
- Batch requests when possible
- Implement exponential backoff on errors
- Cache responses where appropriate
