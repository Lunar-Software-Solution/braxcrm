

# People Fetch API Endpoint

## Purpose

Create a new edge function that allows the external messaging collection app to fetch People records from the CRM. This enables the app to match phone numbers/identifiers to contacts before pushing conversations via the messaging-ingest endpoint.

---

## Endpoint Design

**Endpoint**: `GET /functions/v1/messaging-people`

**Authentication**: Same pattern as `messaging-ingest` - uses `x-api-key` header validated against the `messaging_connections.api_secret`

---

## Request Format

### Headers

| Header | Required | Description |
|--------|----------|-------------|
| `x-api-key` | Yes | API secret from messaging connection |
| `x-connection-id` | Yes | Connection ID for auth lookup |

### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `search` | string | No | Search by name, email, or phone |
| `phone` | string | No | Filter by exact phone match |
| `updated_since` | string | No | ISO 8601 timestamp for incremental sync |
| `limit` | number | No | Max records (default: 100, max: 500) |
| `offset` | number | No | Pagination offset |

---

## Response Format

```json
{
  "success": true,
  "total": 150,
  "limit": 100,
  "offset": 0,
  "people": [
    {
      "id": "uuid",
      "name": "John Doe",
      "email": "john@example.com",
      "phone": "+1234567890",
      "avatar_url": "https://...",
      "updated_at": "2026-02-01T10:00:00Z"
    }
  ]
}
```

---

## Implementation Details

### Edge Function: `messaging-people`

The function will:

1. Validate the `x-api-key` against `messaging_connections` table (same as ingest)
2. Use service role to query people table for the connection's user
3. Apply optional filters (search, phone, updated_since)
4. Return paginated results with minimal fields needed for matching

### Security Considerations

- Only returns people associated with the authenticated connection's user
- Uses service role key for database access
- Exposes minimal PII (id, name, email, phone, avatar_url, updated_at)
- Rate limiting should be implemented by the caller

---

## Files to Create/Modify

### New Files

1. **`supabase/functions/messaging-people/index.ts`**
   - Edge function implementing the GET endpoint
   - Connection validation
   - Query building with filters
   - Paginated response

### Modified Files

2. **`supabase/config.toml`**
   - Register new function with `verify_jwt = false`

3. **`docs/api/messaging-people.md`**
   - API documentation following existing pattern

4. **`docs/api/README.md`**
   - Add new endpoint to the API index

---

## Technical Implementation

### Edge Function Structure

```typescript
// Validate connection via x-api-key and x-connection-id
const { data: connection } = await supabase
  .from("messaging_connections")
  .select("id, user_id, is_active, api_secret")
  .eq("connection_id", connectionId)
  .single();

// Query people for this user with optional filters
let query = supabase
  .from("people")
  .select("id, name, email, phone, avatar_url, updated_at", { count: "exact" })
  .order("name");

// Apply filters
if (search) {
  query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`);
}
if (phone) {
  query = query.eq("phone", phone);
}
if (updatedSince) {
  query = query.gte("updated_at", updatedSince);
}

// Pagination
query = query.range(offset, offset + limit - 1);
```

---

## Usage Example

```bash
# Fetch all people
curl -X GET "https://ypmkbrdymnfxxwoogpdb.supabase.co/functions/v1/messaging-people" \
  -H "x-api-key: your-api-secret" \
  -H "x-connection-id: wa_business_123"

# Search by phone
curl -X GET "https://ypmkbrdymnfxxwoogpdb.supabase.co/functions/v1/messaging-people?phone=+1234567890" \
  -H "x-api-key: your-api-secret" \
  -H "x-connection-id: wa_business_123"

# Incremental sync
curl -X GET "https://ypmkbrdymnfxxwoogpdb.supabase.co/functions/v1/messaging-people?updated_since=2026-01-15T00:00:00Z" \
  -H "x-api-key: your-api-secret" \
  -H "x-connection-id: wa_business_123"
```

