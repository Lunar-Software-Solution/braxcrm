
# Plan: Refactor Email Automation to Entity-Based Rules

## Overview
Transform the email automation system from **category-based** (Invoices, Sales, Support, etc.) to **entity-based** where each CRM entity type has its own dedicated automation rule with entity-specific actions.

## Current State vs New State

### Current System
- 6 generic categories (Invoices & Billing, Sales Inquiries, Support, etc.)
- AI classifies emails into these categories
- Rules are attached to categories with generic actions

### New System
- 7 entity-based rules (one per entity type)
- AI classifies emails to determine which entity type the sender belongs to
- Each entity has tailored actions that make sense for that entity type

## Entity Rules and Their Specific Actions

| Entity | Recommended Actions | Not Applicable |
|--------|---------------------|----------------|
| **Influencers** | Auto-create entity, Apply tags, Set visibility, Mark priority | Extract Invoice |
| **Resellers** | Auto-create entity, Apply tags, Set visibility, Mark priority | Extract Invoice |
| **Product Suppliers** | Auto-create entity, **Extract Invoice**, Apply tags, Set visibility, Mark priority | - |
| **Expense Suppliers** | Auto-create entity, **Extract Invoice**, Apply tags, Set visibility, Mark priority | - |
| **Corporate Management** | Auto-create entity, **Extract Invoice**, Apply tags, Set visibility, Mark priority | - |
| **Personal Contacts** | Auto-create entity, Apply tags, Set visibility | Extract Invoice |
| **Subscriptions** | Auto-create entity, Apply tags, Mark priority, **Extract Invoice** | - |

## Visual Design

The Email Automation page will display a table matching the entity list pages:

```text
+------------------------------------------------------------------+
| Email Automation                                                  |
| Configure automation rules for each entity type                   |
+------+-----------------------+--------+------------+--------------+
| Icon | Entity Type           | Status | Actions    | Description  |
+------+-----------------------+--------+------------+--------------+
| (*)  | Influencers           | ON     | 3 actions  | Auto-create, |
|      |                       |        |            | tag, priority|
+------+-----------------------+--------+------------+--------------+
| [S]  | Resellers             | ON     | 3 actions  | Auto-create, |
|      |                       |        |            | tag, priority|
+------+-----------------------+--------+------------+--------------+
| [P]  | Product Suppliers     | ON     | 4 actions  | Auto-create, |
|      |                       |        |            | invoice, tag |
+------+-----------------------+--------+------------+--------------+
| [$]  | Expense Suppliers     | ON     | 4 actions  | Auto-create, |
|      |                       |        |            | invoice, tag |
+------+-----------------------+--------+------------+--------------+
| [B]  | Corporate Management  | ON     | 4 actions  | Auto-create, |
|      |                       |        |            | invoice, tag |
+------+-----------------------+--------+------------+--------------+
| [C]  | Personal Contacts     | ON     | 2 actions  | Auto-create, |
|      |                       |        |            | tag          |
+------+-----------------------+--------+------------+--------------+
| [#]  | Subscriptions         | ON     | 3 actions  | Auto-create, |
|      |                       |        |            | invoice, tag |
+------+-----------------------+--------+------------+--------------+
```

Clicking a row expands to show configurable actions for that entity.

## Database Changes

### Step 1: Create Entity Rules Table

A new table that stores automation rules per entity type (replaces category-based rules):

```sql
CREATE TABLE public.entity_automation_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_table text NOT NULL UNIQUE,
  is_active boolean NOT NULL DEFAULT true,
  priority integer NOT NULL DEFAULT 0,
  description text,
  ai_prompt text,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
```

### Step 2: Create Entity Rule Actions Table

```sql
CREATE TABLE public.entity_rule_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_rule_id uuid NOT NULL REFERENCES entity_automation_rules(id) ON DELETE CASCADE,
  action_type text NOT NULL,
  config jsonb NOT NULL DEFAULT '{}',
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
```

### Step 3: Seed Default Rules

Insert default rules for each entity with appropriate actions:

```sql
-- Insert entity rules for each entity type
INSERT INTO entity_automation_rules (entity_table, description, ai_prompt, created_by)
VALUES 
  ('influencers', 'Social media influencers, content creators, KOLs', 
   'Identify influencers, content creators, brand ambassadors, or social media personalities', 
   auth.uid()),
  ('resellers', 'Distributors, retailers, resale partners', 
   'Identify resellers, distributors, retailers, or wholesale partners', 
   auth.uid()),
  ('product_suppliers', 'Vendors selling products for resale', 
   'Identify suppliers of physical products, inventory vendors, or trade suppliers',
   auth.uid()),
  ('expense_suppliers', 'Service providers and expense vendors', 
   'Identify service providers, SaaS vendors, marketing agencies, or expense-related suppliers',
   auth.uid()),
  ('corporate_management', 'Legal, accounting, and corporate entities', 
   'Identify lawyers, accountants, banks, government agencies, or corporate management contacts',
   auth.uid()),
  ('personal_contacts', 'Friends, family, personal acquaintances', 
   'Identify personal contacts, friends, family members, or non-business acquaintances',
   auth.uid()),
  ('subscriptions', 'Recurring subscriptions and SaaS services', 
   'Identify subscription services, recurring billing, or SaaS notifications',
   auth.uid());
```

### Step 4: Update email_messages Table

Add entity_table column to store classification result:

```sql
ALTER TABLE public.email_messages 
ADD COLUMN entity_table text;
```

## Frontend Changes

### Files to Create/Update

| File | Change |
|------|--------|
| `src/pages/EmailAutomation.tsx` | Complete rewrite to show entity-based table |
| `src/hooks/use-entity-automation.ts` | New hook for entity automation CRUD |
| `src/types/entity-automation.ts` | New types for entity automation |
| `supabase/functions/classify-email/index.ts` | Update to classify by entity type |
| `supabase/functions/process-entity-rules/index.ts` | New function for entity-based processing |

### UI Components

The new EmailAutomation page will:

1. **Table View**: Display all 7 entity types in a spreadsheet-style table
2. **Entity Icons & Colors**: Use the same icons/colors from the sidebar
3. **Expandable Rows**: Click to expand and configure actions
4. **Available Actions**: Show which actions are available/applicable per entity type
5. **Toggle Switches**: Enable/disable rules per entity and per action

### Action Availability Matrix

```typescript
const ENTITY_ACTION_AVAILABILITY: Record<string, RuleActionType[]> = {
  influencers: ['visibility', 'tag', 'mark_priority', 'assign_role'],
  resellers: ['visibility', 'tag', 'mark_priority', 'assign_role'],
  product_suppliers: ['visibility', 'tag', 'mark_priority', 'extract_invoice', 'assign_role'],
  expense_suppliers: ['visibility', 'tag', 'mark_priority', 'extract_invoice', 'assign_role'],
  corporate_management: ['visibility', 'tag', 'mark_priority', 'extract_invoice', 'assign_role'],
  personal_contacts: ['visibility', 'tag'],
  subscriptions: ['visibility', 'tag', 'mark_priority', 'extract_invoice'],
};
```

## Edge Function Updates

### classify-email Update

The AI classification will now identify entity types instead of categories:

```typescript
const prompt = `Analyze this email and determine which CRM entity type the sender belongs to.

Available Entity Types:
1. Influencers - Social media influencers, content creators, KOLs
2. Resellers - Distributors, retailers, resale partners
3. Product Suppliers - Vendors selling products for resale
4. Expense Suppliers - Service providers, SaaS, marketing agencies
5. Corporate Management - Legal, accounting, banks, government
6. Personal Contacts - Friends, family, non-business
7. Subscriptions - Recurring service notifications

Email Details:
- From: ${sender_name} <${sender_email}>
- Subject: ${subject}
- Preview: ${body_preview}

Respond with JSON:
{
  "entity_table": "the_entity_type",
  "confidence": 0.0-1.0,
  "reasoning": "brief explanation"
}`;
```

### process-entity-rules Function

New edge function that:
1. Takes email_id and entity_table
2. Fetches the automation rule for that entity
3. Executes applicable actions (auto-create entity, extract invoice, apply tags, etc.)
4. Logs results to email_rule_logs

## Migration Strategy

1. Keep existing email_categories and email_rules tables (don't delete)
2. Create new entity_automation_rules and entity_rule_actions tables
3. Update the classify-email function to classify by entity type
4. Update process-email-rules to use entity rules
5. Update the Email Automation UI to show entity-based configuration
6. Migrate existing email_messages.category_id to entity_table where possible

## Implementation Order

1. **Database Migration**
   - Create entity_automation_rules table
   - Create entity_rule_actions table
   - Add entity_table column to email_messages
   - Seed default rules with appropriate actions

2. **Types & Hooks**
   - Create src/types/entity-automation.ts
   - Create src/hooks/use-entity-automation.ts

3. **UI Update**
   - Rewrite EmailAutomation.tsx with entity-based table
   - Use entity icons/colors from CRMSidebar

4. **Edge Functions**
   - Update classify-email to classify by entity type
   - Update process-email-rules to use entity rules

5. **Cleanup** (future)
   - Remove unused category-based tables after migration complete

## Technical Details

### New Types

```typescript
// src/types/entity-automation.ts
export interface EntityAutomationRule {
  id: string;
  entity_table: string;
  is_active: boolean;
  priority: number;
  description: string | null;
  ai_prompt: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  actions?: EntityRuleAction[];
}

export interface EntityRuleAction {
  id: string;
  entity_rule_id: string;
  action_type: RuleActionType;
  config: Record<string, unknown>;
  is_active: boolean;
  sort_order: number;
  created_at: string;
}

// Actions that require specific entity types
export const INVOICE_CAPABLE_ENTITIES = [
  'product_suppliers',
  'expense_suppliers',
  'corporate_management',
  'subscriptions',
];

// Entity display config with icons
export const ENTITY_AUTOMATION_CONFIG = {
  influencers: { icon: 'Sparkles', color: '#ec4899', label: 'Influencers' },
  resellers: { icon: 'Store', color: '#22c55e', label: 'Resellers' },
  product_suppliers: { icon: 'Package', color: '#3b82f6', label: 'Product Suppliers' },
  expense_suppliers: { icon: 'Receipt', color: '#f97316', label: 'Expense Suppliers' },
  corporate_management: { icon: 'Building2', color: '#0891b2', label: 'Corporate Management' },
  personal_contacts: { icon: 'Contact', color: '#8b5cf6', label: 'Personal Contacts' },
  subscriptions: { icon: 'CreditCard', color: '#f59e0b', label: 'Subscriptions' },
};
```

### Default Actions per Entity

When seeding the database, each entity gets these default actions:

| Entity | Default Actions |
|--------|-----------------|
| Influencers | auto_create_entity (on), tag (off), visibility (off) |
| Resellers | auto_create_entity (on), tag (off), visibility (off) |
| Product Suppliers | auto_create_entity (on), extract_invoice (on), tag (off) |
| Expense Suppliers | auto_create_entity (on), extract_invoice (on), tag (off) |
| Corporate Management | auto_create_entity (on), extract_invoice (on), tag (off) |
| Personal Contacts | auto_create_entity (on), tag (off) |
| Subscriptions | auto_create_entity (off), extract_invoice (on), tag (off) |
