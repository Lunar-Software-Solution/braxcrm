
# Webflow Form Import Integration

## Overview
Set up an hourly cron job that fetches form submissions from Webflow's API and imports them into your existing Import infrastructure. New submissions will automatically appear in the Import Processing Queue.

## How It Works

```text
┌─────────────────┐     hourly      ┌──────────────────────┐
│   pg_cron Job   │ ───────────────>│ sync-webflow-forms   │
└─────────────────┘                 │   (Edge Function)    │
                                    └──────────┬───────────┘
                                               │
                    ┌──────────────────────────┼──────────────────────────┐
                    │                          │                          │
                    ▼                          ▼                          ▼
          ┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
          │  Webflow API    │       │ webhook_events  │       │ webflow_sync    │
          │  (fetch new     │       │ (creates new    │       │ (tracks last    │
          │   submissions)  │       │  pending rows)  │       │  sync time)     │
          └─────────────────┘       └─────────────────┘       └─────────────────┘
```

## What You'll Get
- Form submissions automatically imported every hour
- Events appear in Import Processing Queue for review
- Full integration with existing entity/person creation flow
- Configurable per-form entity mapping

---

## Step 1: Add Webflow API Token

You'll need to provide your Webflow API token. This can be generated from:
1. Webflow Dashboard → Site Settings → Apps & Integrations → API Access
2. Create a new API token with "Forms - Read" permission

---

## Step 2: Database Changes

### New Table: `webflow_sync_config`
Stores configuration for Webflow form syncing:

| Column | Type | Purpose |
|--------|------|---------|
| id | uuid | Primary key |
| site_id | text | Webflow site ID |
| form_id | text | Webflow form ID (optional, for specific form) |
| endpoint_id | uuid | Links to webhook_endpoints for processing |
| last_synced_at | timestamptz | Track what's been imported |
| is_active | boolean | Enable/disable sync |
| sync_interval_hours | int | Polling frequency (default: 1) |
| created_by | uuid | User who created config |

### Enable Required Extensions
- `pg_cron` - For scheduled job execution
- `pg_net` - For HTTP calls from the database

---

## Step 3: Create Edge Function

### `sync-webflow-forms`
This function:
1. Fetches all active Webflow sync configurations
2. Calls Webflow API to get form submissions since `last_synced_at`
3. Creates `webhook_events` records for new submissions
4. Updates `last_synced_at` timestamp

**API Endpoints Used:**
- `GET /sites/{site_id}/forms` - List forms
- `GET /forms/{form_id}/submissions` - Get submissions with date filtering

---

## Step 4: Schedule Cron Job

Create an hourly cron job using pg_cron:
```sql
SELECT cron.schedule(
  'sync-webflow-forms-hourly',
  '0 * * * *',  -- Every hour at minute 0
  -- HTTP POST to edge function
);
```

---

## Step 5: UI for Configuration

Add a simple configuration panel to Import Endpoints page or Settings:
- Input Webflow Site ID
- Select which forms to sync (or all)
- Map to default entity type
- Toggle active/inactive

---

## Technical Details

### Webflow API Rate Limits
- 60 requests per minute for API tokens
- Pagination: up to 100 submissions per request

### Security
- API token stored as Supabase secret (not in code)
- Edge function uses service role for database operations
- RLS policies protect sync configuration

### Idempotency
- Uses Webflow submission ID as `external_id` to prevent duplicates
- Checks for existing `webhook_events` before inserting

---

## Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `supabase/functions/sync-webflow-forms/index.ts` | Create | Edge function to poll Webflow API |
| Database migration | Create | New table + extensions + cron job |
| `src/hooks/use-webflow-sync.ts` | Create | React hook for sync configuration |
| `src/pages/ImportEndpoints.tsx` | Modify | Add Webflow configuration section |
| `src/types/imports.ts` | Modify | Add Webflow sync types |

---

## Next Steps After Implementation

1. Generate and add your Webflow API token
2. Get your Webflow Site ID from site settings
3. Configure which forms to sync
4. Test with a manual sync button before enabling cron
