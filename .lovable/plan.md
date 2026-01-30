# QuickBooks Online Bills Integration

## Overview

This plan implements QuickBooks Online (QBO) integration starting with the Bills object. The integration will follow the same OAuth pattern used for Microsoft Graph API, storing QBO tokens and enabling bill synchronization for matching against email invoices and card charges.

---

## Phase 1: Database Schema

### 1.1 New Tables

**qbo_tokens** (OAuth token storage - similar to `microsoft_tokens`)
```
qbo_tokens
  - id (uuid, PK)
  - user_id (uuid, FK -> auth.users, not null)
  - access_token (text, not null)
  - refresh_token (text, not null)
  - realm_id (text, not null) -- QBO company ID
  - company_name (text, nullable)
  - expires_at (timestamptz, not null)
  - refresh_token_expires_at (timestamptz, nullable)
  - is_primary (boolean, default true)
  - created_at, updated_at (timestamps)
  - UNIQUE(user_id, realm_id)
```

**qbo_vendors** (Vendor master data from QBO)
```
qbo_vendors
  - id (uuid, PK)
  - qbo_vendor_id (text, not null) -- QBO internal ID
  - realm_id (text, not null) -- Which QBO company
  - display_name (text, not null)
  - company_name (text, nullable)
  - primary_email (text, nullable)
  - balance (numeric, nullable)
  - active (boolean, default true)
  - subscription_id (uuid, FK -> subscriptions, nullable) -- Link to our vendor
  - raw_payload (jsonb, nullable)
  - user_id (uuid, FK -> auth.users)
  - synced_at (timestamptz)
  - created_at, updated_at (timestamps)
  - UNIQUE(realm_id, qbo_vendor_id)
```

**qbo_bills** (Bills from QBO)
```
qbo_bills
  - id (uuid, PK)
  - qbo_bill_id (text, not null) -- QBO internal ID
  - realm_id (text, not null)
  - qbo_vendor_id (text, nullable)
  - vendor_display_name (text, nullable)
  - txn_date (date, not null)
  - due_date (date, nullable)
  - doc_number (text, nullable) -- Invoice number from vendor
  - amount_total (numeric, not null)
  - balance (numeric, nullable) -- Remaining balance
  - currency (text, default 'USD')
  - private_note (text, nullable)
  - ap_account_ref (text, nullable)
  - subscription_id (uuid, FK -> subscriptions, nullable) -- Link to our vendor
  - status (enum: open, paid, partial, voided)
  - raw_payload (jsonb, nullable)
  - user_id (uuid, FK -> auth.users)
  - synced_at (timestamptz)
  - created_at, updated_at (timestamps)
  - UNIQUE(realm_id, qbo_bill_id)
```

**qbo_bill_lines** (Bill line items)
```
qbo_bill_lines
  - id (uuid, PK)
  - qbo_bill_id (uuid, FK -> qbo_bills.id)
  - line_num (integer)
  - description (text, nullable)
  - amount (numeric, not null)
  - detail_type (text) -- AccountBasedExpense, ItemBasedExpense
  - account_ref (text, nullable)
  - account_name (text, nullable)
  - item_ref (text, nullable)
  - billable_status (text, nullable)
  - created_at (timestamp)
```

### 1.2 New Enums

```sql
CREATE TYPE qbo_bill_status AS ENUM ('open', 'paid', 'partial', 'voided');
```

### 1.3 RLS Policies

All tables will use user-based access:
- Users can only see/manage their own QBO data
- Admins can view all QBO data

---

## Phase 2: Edge Functions

### 2.1 `qbo-auth` (OAuth Flow)

Similar pattern to `ms-auth`:

**Actions:**
- `authorize` - Generate QBO OAuth authorization URL
- `callback` - Exchange code for tokens, store in `qbo_tokens`
- `disconnect` - Revoke and delete tokens

**OAuth Configuration:**
- Authorization endpoint: `https://appcenter.intuit.com/connect/oauth2`
- Token endpoint: `https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer`
- Scopes: `com.intuit.quickbooks.accounting`

**Required Secrets:**
- `QBO_CLIENT_ID`
- `QBO_CLIENT_SECRET`
- `QBO_ENVIRONMENT` (sandbox or production)

### 2.2 `qbo-api` (Generic QBO API Proxy)

Similar pattern to `graph-api`:

**Actions:**
- `get-company-info` - Get connected company details
- `list-vendors` - Fetch all vendors
- `list-bills` - Fetch bills with optional filters
- `get-bill` - Get single bill details
- `query` - Execute custom QBO query

**Token Management:**
- Auto-refresh expired tokens (1-hour lifetime)
- Store updated tokens after refresh
- Handle refresh token expiration (100 days)

### 2.3 `sync-qbo-data` (Sync Orchestrator)

**Responsibilities:**
- Sync vendors from QBO to `qbo_vendors`
- Sync bills from QBO to `qbo_bills` with line items
- Track last sync timestamp
- Incremental sync support via QBO change data capture

---

## Phase 3: Frontend Components

### 3.1 Settings Page Enhancement

Add "QuickBooks" section to Settings:
- Connect/disconnect QBO account button
- Show connected company name and realm ID
- Last sync timestamp
- Manual sync trigger button

### 3.2 New Page: QBO Bills (`/qbo-bills`)

**Features:**
- List all synced bills with search/filter
- Display vendor, amount, status, due date
- Show matching status (linked to email/invoice)
- Drill-down to bill details with line items

### 3.3 Sidebar Update

Add "QuickBooks Bills" to Workspace section in `CRMSidebar.tsx`

---

## Phase 4: Vendor Matching

### 4.1 Auto-Link Logic

When bills are synced:
1. Check if `qbo_vendor_id` already linked to a subscription
2. If not, attempt to match by:
   - Email address match
   - Company name similarity
   - Domain matching
3. Create `match_candidates` for review if not confident

### 4.2 Manual Linking

UI to manually link a QBO vendor to a Subscription entity.

---

## Technical Details

### QBO API Endpoints Used

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/v3/company/{realmId}/companyinfo/{realmId}` | GET | Get company info |
| `/v3/company/{realmId}/query` | GET | Query vendors/bills |
| `/v3/company/{realmId}/vendor/{vendorId}` | GET | Get vendor details |
| `/v3/company/{realmId}/bill/{billId}` | GET | Get bill details |

### QBO Bill Object Structure (Key Fields)

```json
{
  "Id": "123",
  "VendorRef": { "value": "456", "name": "Acme Corp" },
  "TxnDate": "2026-01-15",
  "DueDate": "2026-02-15",
  "DocNumber": "INV-001",
  "TotalAmt": 1500.00,
  "Balance": 1500.00,
  "CurrencyRef": { "value": "USD" },
  "APAccountRef": { "value": "789", "name": "Accounts Payable" },
  "Line": [
    {
      "LineNum": 1,
      "Amount": 1500.00,
      "DetailType": "AccountBasedExpenseLineDetail",
      "AccountBasedExpenseLineDetail": {
        "AccountRef": { "value": "100", "name": "Office Expenses" }
      }
    }
  ]
}
```

---

## Files to Create

| File | Purpose |
|------|---------|
| `supabase/functions/qbo-auth/index.ts` | OAuth flow handler |
| `supabase/functions/qbo-api/index.ts` | QBO API proxy |
| `supabase/functions/sync-qbo-data/index.ts` | Sync orchestrator |
| `src/hooks/use-qbo-auth.ts` | OAuth hook |
| `src/hooks/use-qbo-bills.ts` | Bills data hook |
| `src/hooks/use-qbo-vendors.ts` | Vendors data hook |
| `src/pages/QBOBills.tsx` | Bills list page |
| `src/components/settings/QBOConnection.tsx` | Settings component |

## Files to Modify

| File | Change |
|------|--------|
| `src/pages/Settings.tsx` | Add QBO connection section |
| `src/components/layout/CRMSidebar.tsx` | Add QBO Bills nav item |
| `src/App.tsx` | Add QBO Bills route |
| `supabase/config.toml` | Add new function configs |

---

## Implementation Checklist

### Phase 1: Database Schema
- [ ] Add secrets (`QBO_CLIENT_ID`, `QBO_CLIENT_SECRET`)
- [ ] Create `qbo_bill_status` enum
- [ ] Create `qbo_tokens` table with RLS
- [ ] Create `qbo_vendors` table with RLS
- [ ] Create `qbo_bills` table with RLS
- [ ] Create `qbo_bill_lines` table with RLS

### Phase 2: Edge Functions
- [ ] Create `qbo-auth` function (OAuth flow)
- [ ] Create `qbo-api` function (API proxy)
- [ ] Create `sync-qbo-data` function (sync orchestrator)

### Phase 3: Frontend
- [ ] Create `use-qbo-auth.ts` hook
- [ ] Create `QBOConnection.tsx` settings component
- [ ] Add QBO section to Settings page
- [ ] Create `use-qbo-bills.ts` hook
- [ ] Create `use-qbo-vendors.ts` hook
- [ ] Create `QBOBills.tsx` page
- [ ] Add route in `App.tsx`
- [ ] Add sidebar navigation item

### Phase 4: Vendor Matching
- [ ] Implement auto-link logic in sync function
- [ ] Add manual linking UI for vendors
- [ ] Add matching status display on bills

---

## Security Considerations

- All QBO tokens encrypted at rest via Supabase
- RLS policies ensure user isolation
- Edge functions validate JWT before any QBO calls
- Refresh tokens rotated on each use
- Support for sandbox vs production environments
