

# Database Cleanup: Keep Only Processed Records

## Summary

Clean up test data to keep only the **2 people** and **2 entities** that have been fully processed and linked through the import system, while preserving all email messages (but removing their person references).

## Current State

| Table | Total Records | Records to Keep | Records to Delete |
|-------|---------------|-----------------|-------------------|
| `people` | 85 | 2 | 83 |
| `corporate_management` | 1 | 1 | 0 |
| `personal_contacts` | 1 | 1 | 0 |
| `influencers` | 1 | 0 | 1 |
| `product_suppliers` | 8 | 0 | 8 |
| `email_messages` | 183 | 183 (keep all) | 0 |
| `senders` | 26 | 26 (keep all) | 0 |

## Records to Keep

### People (2 records)
| Name | Email | Linked Entity |
|------|-------|---------------|
| Sergei Tokmakov, Esq. | owner@terms.law | Corporate Management |
| Hermann Baumgertener | hermann.baumgertener@me.com | Personal Contacts |

### Entities (2 records)
- **Corporate Management**: Sergei Tokmakov, Esq. (owner@terms.law)
- **Personal Contacts**: Hermann Baumgertener (hermann.baumgertener@me.com)

## Cleanup Operations

Execute in this order to handle dependencies:

### Step 1: Clear email person references
Set `person_id = NULL` on 149 emails that reference people we're about to delete.

### Step 2: Delete unlinked people
Delete 83 people records that are NOT in `people_entities`.

### Step 3: Delete orphaned entities
Delete entity records not linked to any person:
- 1 influencer record
- 8 product supplier records

---

## Technical Details

### SQL Statements

```sql
-- Step 1: Clear email person references (149 emails)
UPDATE email_messages 
SET person_id = NULL 
WHERE person_id NOT IN (SELECT person_id FROM people_entities);

-- Step 2: Delete unlinked people (83 records)
DELETE FROM people 
WHERE id NOT IN (SELECT person_id FROM people_entities);

-- Step 3: Delete orphaned influencers (1 record)
DELETE FROM influencers 
WHERE id NOT IN (
  SELECT entity_id FROM people_entities WHERE entity_table = 'influencers'
);

-- Step 4: Delete orphaned product_suppliers (8 records)
DELETE FROM product_suppliers 
WHERE id NOT IN (
  SELECT entity_id FROM people_entities WHERE entity_table = 'product_suppliers'
);
```

### Result After Cleanup
- **People**: 2 records (both linked)
- **Corporate Management**: 1 record (linked)
- **Personal Contacts**: 1 record (linked)
- **Influencers**: 0 records
- **Product Suppliers**: 0 records
- **Email Messages**: 183 records (3 with person links, 180 without)
- **Senders**: 26 records (unchanged)

