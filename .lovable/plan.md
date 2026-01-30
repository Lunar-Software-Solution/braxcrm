

# Plan: Remove "Assign Role" Action from All Entity Types

## Overview

Remove the "assign_role" action from the Email Automation configuration for all entity types, as role assignment is already handled during the email classification phase.

---

## Change Required

**File:** `src/types/entity-automation.ts`

Remove `"assign_role"` from the `ENTITY_ACTION_AVAILABILITY` configuration for all entity types that currently have it.

### Current Configuration

| Entity Type | Current Actions |
|-------------|-----------------|
| influencers | visibility, tag, mark_priority, assign_role |
| resellers | visibility, tag, mark_priority, assign_role |
| product_suppliers | visibility, tag, mark_priority, extract_invoice, assign_role |
| expense_suppliers | visibility, tag, mark_priority, extract_invoice, assign_role |
| corporate_management | visibility, tag, mark_priority, extract_invoice, assign_role |
| personal_contacts | visibility, tag |
| subscriptions | visibility, tag, mark_priority, extract_invoice |
| marketing_sources | visibility, tag |
| merchant_accounts | visibility, tag, mark_priority, extract_invoice, assign_role |
| logistic_suppliers | visibility, tag, mark_priority, assign_role |

### Updated Configuration

| Entity Type | Updated Actions |
|-------------|-----------------|
| influencers | visibility, tag, mark_priority |
| resellers | visibility, tag, mark_priority |
| product_suppliers | visibility, tag, mark_priority, extract_invoice |
| expense_suppliers | visibility, tag, mark_priority, extract_invoice |
| corporate_management | visibility, tag, mark_priority, extract_invoice |
| personal_contacts | visibility, tag |
| subscriptions | visibility, tag, mark_priority, extract_invoice |
| marketing_sources | visibility, tag |
| merchant_accounts | visibility, tag, mark_priority, extract_invoice |
| logistic_suppliers | visibility, tag, mark_priority |

---

## Files to Modify

| File | Change |
|------|--------|
| `src/types/entity-automation.ts` | Remove `"assign_role"` from all arrays in `ENTITY_ACTION_AVAILABILITY` |

This is a single-file change that will immediately remove "Assign Role" from appearing as an available action in the Email Automation page for all entity types.

