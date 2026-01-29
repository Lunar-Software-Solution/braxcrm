
# Senders Table: Decoupling Non-Person Senders from People

## Overview

This plan introduces a new `senders` table to represent email senders that are not individual people (e.g., `noreply@apify.com`, `newsletter@service.com`). Senders will link directly to entities (like Subscriptions, Marketing Sources) without creating misleading "Person" records.

---

## Current Problem

- Automated/system email addresses (e.g., `noreply@`, `notifications@`) are being stored as "People" records
- This is semantically incorrect - "noreply@apify.com" is not a person
- It pollutes the People table with non-human entries
- Makes the CRM data model confusing

## Solution: Senders Table

A new `senders` table that:
1. Represents non-person email addresses (automated systems, newsletters, shared inboxes)
2. Links directly to entity records (e.g., Apify subscription)
3. Can be used instead of `person_id` on `email_messages`

---

## Database Changes

### 1. New `senders` Table

```text
+--------------------+
|      senders       |
+--------------------+
| id (uuid, PK)      |
| email (text, unique)|
| display_name (text)|
| sender_type (enum) |  -- automated, shared_inbox, newsletter, system
| entity_table (text)|  -- e.g., "subscriptions", "marketing_sources"
| entity_id (uuid)   |  -- links to specific entity record
| domain (text)      |  -- extracted domain for grouping
| is_auto_created    |
| created_by (uuid)  |
| created_at         |
| updated_at         |
+--------------------+
```

### 2. Update `email_messages` Table

Add new column:
- `sender_id` (uuid, nullable, FK to senders.id)

This allows an email to be linked to either:
- A `person_id` (for real people)
- A `sender_id` (for automated/non-person senders)

### 3. Create `sender_type` Enum

```sql
CREATE TYPE sender_type AS ENUM (
  'automated',     -- noreply@, no-reply@, notifications@
  'newsletter',    -- newsletter@, news@, updates@
  'shared_inbox',  -- support@, info@, sales@
  'system'         -- Other automated systems
);
```

### 4. RLS Policies

- **SELECT**: Authenticated users can view senders
- **INSERT**: Users with admin role OR linked to the entity
- **UPDATE**: Admins OR entity role holders
- **DELETE**: Admins only

---

## Application Flow Changes

### Email Sync Flow (Updated)

```text
1. Email arrives from "noreply@apify.com"

2. Check if sender_email matches known person -> NO

3. Check if sender_email matches known sender -> YES/NO
   - If YES: link email to existing sender
   - If NO: create new sender record

4. AI Classification determines entity_table = "subscriptions"

5. Link sender to entity (if entity exists or create_if_not_exists)

6. Future emails from this address automatically link to same entity
```

### Detection Logic

Emails are treated as non-person senders when:
- Local part matches patterns: `noreply`, `no-reply`, `donotreply`, `notifications`, `newsletter`, `news`, `updates`, `mailer`, `system`, `automated`, `auto`, `support`, `info`, `hello`, `contact`
- OR when AI classification suggests it (configurable)
- OR when manually marked by user

---

## Code Changes

### 1. New Type Definitions

**File: `src/types/senders.ts`**

```typescript
export type SenderType = 'automated' | 'newsletter' | 'shared_inbox' | 'system';

export interface Sender {
  id: string;
  email: string;
  display_name: string | null;
  sender_type: SenderType;
  entity_table: string | null;
  entity_id: string | null;
  domain: string | null;
  is_auto_created: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export function detectSenderType(email: string): SenderType | null {
  const localPart = email.split('@')[0].toLowerCase();
  const patterns = {
    automated: /^(noreply|no-reply|donotreply|do-not-reply|mailer|auto)$/,
    newsletter: /^(newsletter|news|updates|digest)$/,
    system: /^(system|automated|notifications|alerts)$/,
    shared_inbox: /^(support|info|hello|contact|sales|team)$/,
  };
  for (const [type, pattern] of Object.entries(patterns)) {
    if (pattern.test(localPart)) return type as SenderType;
  }
  return null;
}
```

### 2. Update Edge Functions

**File: `supabase/functions/sync-emails/index.ts`**

Add logic to:
1. Detect non-person senders using pattern matching
2. Create/lookup sender records instead of people
3. Link emails to senders via `sender_id`

**File: `supabase/functions/process-entity-rules/index.ts`**

Update `link_entity` action to:
1. Check if email has `sender_id` (non-person)
2. Link sender to entity instead of creating person
3. Update sender's `entity_table` and `entity_id`

### 3. New Hook

**File: `src/hooks/use-senders.ts`**

```typescript
// Hook for managing senders
export function useSenders() { ... }
export function useSendersByEntity(entityTable: string, entityId: string) { ... }
```

### 4. UI Updates

**EmailPreview Component**
- Show building/robot icon instead of avatar for senders
- Display "Automated Sender" badge
- Show linked entity if present

**Senders Management Page (optional)**
- List all senders
- Filter by type (automated, newsletter, etc.)
- View linked entities
- Ability to manually link/unlink from entities

---

## Technical Details

### Migration SQL

```sql
-- 1. Create sender_type enum
CREATE TYPE public.sender_type AS ENUM (
  'automated', 'newsletter', 'shared_inbox', 'system'
);

-- 2. Create senders table
CREATE TABLE public.senders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  display_name text,
  sender_type public.sender_type NOT NULL DEFAULT 'automated',
  entity_table text,
  entity_id uuid,
  domain text,
  is_auto_created boolean NOT NULL DEFAULT true,
  created_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 3. Add indexes
CREATE INDEX idx_senders_email ON public.senders(email);
CREATE INDEX idx_senders_domain ON public.senders(domain);
CREATE INDEX idx_senders_entity ON public.senders(entity_table, entity_id);

-- 4. Add sender_id to email_messages
ALTER TABLE public.email_messages 
  ADD COLUMN sender_id uuid REFERENCES public.senders(id);

-- 5. Enable RLS
ALTER TABLE public.senders ENABLE ROW LEVEL SECURITY;

-- 6. RLS Policies
CREATE POLICY "Authenticated can view senders"
  ON public.senders FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can insert senders"
  ON public.senders FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can update senders"
  ON public.senders FOR UPDATE
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete senders"
  ON public.senders FOR DELETE
  USING (has_role(auth.uid(), 'admin'));

-- 7. Update trigger for updated_at
CREATE TRIGGER update_senders_updated_at
  BEFORE UPDATE ON public.senders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
```

---

## Implementation Order

1. **Database Migration** - Create senders table and update email_messages
2. **Type Definitions** - Add TypeScript types for senders
3. **Sync Emails Update** - Detect and create senders during email sync
4. **Process Entity Rules Update** - Link senders to entities
5. **UI Components** - Update EmailPreview to show sender info
6. **Hook Creation** - Create useSenders hook for data access
7. **Optional: Senders Page** - Admin page to manage senders

---

## Benefits

- **Clean Data Model**: People table only contains actual people
- **Semantic Accuracy**: "noreply@apify.com" is correctly represented as a sender, not a person
- **Entity Linking**: Senders can be directly linked to entities (Subscriptions, Marketing Sources)
- **Pattern Recognition**: Automatic detection of common non-person email patterns
- **Scalability**: Easy to extend with new sender types
- **Audit Trail**: Track which senders are linked to which entities
