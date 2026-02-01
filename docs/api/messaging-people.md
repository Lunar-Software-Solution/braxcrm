# Messaging People API

Fetch People records from the CRM for contact matching before pushing conversations via the messaging-ingest endpoint.

## Endpoint

```
GET /functions/v1/messaging-people
```

## Authentication

Uses API key authentication via headers:

| Header | Required | Description |
|--------|----------|-------------|
| `x-api-key` | Yes | API secret from your messaging connection |
| `x-connection-id` | Yes | Your connection ID (e.g., `wa_business_123`) |

## Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `search` | string | No | Search by name, email, or phone (case-insensitive) |
| `phone` | string | No | Filter by exact phone number match |
| `updated_since` | string | No | ISO 8601 timestamp for incremental sync |
| `limit` | number | No | Max records to return (default: 100, max: 500) |
| `offset` | number | No | Pagination offset (default: 0) |

## Response Format

### Success Response (200)

```json
{
  "success": true,
  "total": 150,
  "limit": 100,
  "offset": 0,
  "people": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "John Doe",
      "email": "john@example.com",
      "phone": "+1234567890",
      "avatar_url": "https://example.com/avatar.jpg",
      "updated_at": "2026-02-01T10:00:00Z"
    }
  ]
}
```

### Error Responses

| Status | Description |
|--------|-------------|
| 400 | Bad Request - Invalid parameters |
| 401 | Unauthorized - Missing or invalid API key/connection ID |
| 403 | Forbidden - Connection is inactive |
| 405 | Method Not Allowed - Only GET is supported |
| 500 | Internal Server Error |

## Usage Examples

### Fetch All People

```bash
curl -X GET "https://ypmkbrdymnfxxwoogpdb.supabase.co/functions/v1/messaging-people" \
  -H "x-api-key: your-api-secret" \
  -H "x-connection-id: wa_business_123"
```

### Search by Phone Number

```bash
curl -X GET "https://ypmkbrdymnfxxwoogpdb.supabase.co/functions/v1/messaging-people?phone=+1234567890" \
  -H "x-api-key: your-api-secret" \
  -H "x-connection-id: wa_business_123"
```

### Search by Name or Email

```bash
curl -X GET "https://ypmkbrdymnfxxwoogpdb.supabase.co/functions/v1/messaging-people?search=john" \
  -H "x-api-key: your-api-secret" \
  -H "x-connection-id: wa_business_123"
```

### Incremental Sync

Fetch only records updated since a specific timestamp:

```bash
curl -X GET "https://ypmkbrdymnfxxwoogpdb.supabase.co/functions/v1/messaging-people?updated_since=2026-01-15T00:00:00Z" \
  -H "x-api-key: your-api-secret" \
  -H "x-connection-id: wa_business_123"
```

### Pagination

```bash
curl -X GET "https://ypmkbrdymnfxxwoogpdb.supabase.co/functions/v1/messaging-people?limit=50&offset=100" \
  -H "x-api-key: your-api-secret" \
  -H "x-connection-id: wa_business_123"
```

## Code Examples

### JavaScript

```javascript
async function fetchPeople(options = {}) {
  const params = new URLSearchParams();
  
  if (options.search) params.append('search', options.search);
  if (options.phone) params.append('phone', options.phone);
  if (options.updatedSince) params.append('updated_since', options.updatedSince);
  if (options.limit) params.append('limit', options.limit.toString());
  if (options.offset) params.append('offset', options.offset.toString());

  const url = `https://ypmkbrdymnfxxwoogpdb.supabase.co/functions/v1/messaging-people?${params}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'x-api-key': 'your-api-secret',
      'x-connection-id': 'wa_business_123'
    }
  });

  return response.json();
}

// Fetch all people
const allPeople = await fetchPeople();

// Search by phone
const matched = await fetchPeople({ phone: '+1234567890' });

// Incremental sync
const updated = await fetchPeople({ updatedSince: '2026-01-15T00:00:00Z' });
```

### Python

```python
import requests

def fetch_people(api_secret, connection_id, **kwargs):
    url = "https://ypmkbrdymnfxxwoogpdb.supabase.co/functions/v1/messaging-people"
    
    headers = {
        "x-api-key": api_secret,
        "x-connection-id": connection_id
    }
    
    params = {}
    if kwargs.get('search'):
        params['search'] = kwargs['search']
    if kwargs.get('phone'):
        params['phone'] = kwargs['phone']
    if kwargs.get('updated_since'):
        params['updated_since'] = kwargs['updated_since']
    if kwargs.get('limit'):
        params['limit'] = kwargs['limit']
    if kwargs.get('offset'):
        params['offset'] = kwargs['offset']
    
    response = requests.get(url, headers=headers, params=params)
    return response.json()

# Fetch all people
all_people = fetch_people("your-api-secret", "wa_business_123")

# Search by phone
matched = fetch_people("your-api-secret", "wa_business_123", phone="+1234567890")

# Incremental sync
updated = fetch_people("your-api-secret", "wa_business_123", updated_since="2026-01-15T00:00:00Z")
```

## Typical Workflow

1. **Initial Sync**: Fetch all people without filters to populate your local cache
2. **Match Contacts**: When a new conversation arrives, search by phone to find matching CRM contact
3. **Incremental Updates**: Periodically fetch updated records using `updated_since` parameter
4. **Push Conversations**: Use the matched `person_id` when calling the messaging-ingest endpoint

## Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Unique identifier for the person |
| `name` | string | Full name of the contact |
| `email` | string | Email address |
| `phone` | string | Phone number (may include country code) |
| `avatar_url` | string | URL to profile image (optional) |
| `updated_at` | string | ISO 8601 timestamp of last update |

## Notes

- Results are ordered alphabetically by name
- Phone matching is exact - normalize phone numbers before querying
- The `total` field indicates total matching records (for pagination)
- Only returns people created by the authenticated user
