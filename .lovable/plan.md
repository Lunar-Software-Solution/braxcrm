

## Plan: Update Rules Log Tab to Show Entity-Based Rule Processing

### Current State
The "Rules Log" tab currently shows rule processing logs from the old category-based system. It joins to `email_rules` to get rule names and `email_categories` for category badges. However, the new entity-based automation system doesn't use these tables - it stores `entity_table` on the email and logs actions with `rule_id = NULL`.

### What Needs to Change
Update the Rules Log tab to properly display both category-based and entity-based rule processing, with entity type badges and appropriate rule labels.

---

### Implementation Steps

#### 1. Update the query to fetch entity type information
Modify the `rules-log` query to include `entity_table` from `email_messages`:

```text
Query changes:
- Add entity_table to the email select
- Remove dependency on category for entity-based logs
- Keep backward compatibility for old category-based logs
```

#### 2. Update the RuleLog interface
Add `entity_table` to the nested email object in the interface.

#### 3. Update the table display logic
- **Category/Entity Type Column**: Show entity type badge when `entity_table` is present, fall back to category badge for old logs
- **Rule Column**: Show "Entity Automation" or similar label when `rule_id` is NULL (entity-based processing), otherwise show the old rule name
- Use existing `ENTITY_AUTOMATION_CONFIG` for entity type icons and colors

#### 4. Use consistent entity type badges
Import and reuse the entity display config to show proper icons, colors, and labels for each entity type.

---

### Technical Details

**File to modify:** `src/pages/RulesLog.tsx`

**Query update:**
```typescript
// Updated email select to include entity_table
email:email_messages(
  subject,
  entity_table,
  category:email_categories(name, color)
)
```

**Interface update:**
```typescript
interface RuleLog {
  // ... existing fields
  email?: {
    subject: string | null;
    entity_table: string | null;  // Add this
    category?: { name: string; color: string | null } | null;
  };
}
```

**Display logic for Category/Entity column:**
```typescript
// If entity_table exists, show entity badge with icon
// Otherwise, fall back to category badge
{log.email?.entity_table ? (
  <EntityTypeBadge entityTable={log.email.entity_table} />
) : log.email?.category ? (
  <Badge variant="outline" style={{ borderColor: color, color }}>
    {log.email.category.name}
  </Badge>
) : (
  <span className="text-muted-foreground">-</span>
)}
```

**Display logic for Rule column:**
```typescript
// If rule_id is null, it's entity-based automation
{log.rule?.name || (log.rule_id === null ? "Entity Automation" : "-")}
```

---

### Visual Result
After implementation, the Rules Log tab will show:
- **Status**: Green checkmark or red X icon
- **Email Subject**: Truncated subject line with emoji indicators
- **Entity Type**: Badge with entity icon and label (e.g., "Influencers", "Product Suppliers")
- **Action**: Icon + label (e.g., "Apply Tag", "Extract Invoice", "Mark Priority")
- **Rule**: Either old rule name or "Entity Automation" for entity-based processing
- **Processed At**: Formatted timestamp
- **Failed Actions section**: Shows errors at bottom with details

