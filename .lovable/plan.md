
# Custom Fields System for Entities

This plan implements a dynamic fields management system allowing admins to define custom fields for each entity type (Influencers, Resellers, Suppliers, Corporate Management, Personal Contacts). Custom fields support multiple data types and can be configured per entity type.

## Overview

Based on the reference screenshot, we will build:
1. A fields configuration interface where admins can add/edit/delete custom fields for entities
2. Support for various data types (Text, Number, Date/Time, Links, True/False, Currency, Address)
3. Integration of custom fields into entity forms and detail views
4. A fields management page accessible from settings or as a dedicated page

## Database Design

### 1. Entity Fields Definition Table
Stores the field definitions for each entity type.

```text
+------------------------+
|     entity_fields      |
+------------------------+
| id                     |
| entity_table           | -> which entity type (influencers, resellers, etc.)
| name                   | -> display name (e.g., "LinkedIn", "ARR")
| slug                   | -> internal identifier (e.g., "linkedin_url", "arr")
| data_type              | -> enum: text, number, date, datetime, boolean, currency, link, address
| icon                   | -> optional icon name
| description            | -> optional field description
| is_required            | -> whether the field is required
| is_active              | -> soft delete flag
| sort_order             | -> display order
| config                 | -> JSONB for type-specific settings (e.g., currency code, link label)
| created_by             |
| created_at             |
| updated_at             |
+------------------------+
```

### 2. Entity Field Values Table
Stores the actual field values for each entity record.

```text
+---------------------------+
|   entity_field_values     |
+---------------------------+
| id                        |
| field_id                  | -> FK to entity_fields
| entity_table              | -> which entity type
| entity_id                 | -> the record ID
| value_text                | -> for text, link values
| value_number              | -> for number, currency values
| value_boolean             | -> for true/false values
| value_date                | -> for date/datetime values
| value_json                | -> for complex values like address
| created_at                |
| updated_at                |
+---------------------------+
```

### Data Type Enum
```text
entity_field_type: 'text' | 'number' | 'date' | 'datetime' | 'boolean' | 'currency' | 'link' | 'address' | 'actor'
```

The `actor` type will reference a user in the system (like "Created by", "Updated by").

## Security (RLS Policies)

- **entity_fields**: Admins can create/update/delete; all authenticated users can read
- **entity_field_values**: Users inherit access based on their entity role permissions

## Implementation Steps

### Phase 1: Database Setup
1. Create `entity_field_type` enum
2. Create `entity_fields` table with RLS policies
3. Create `entity_field_values` table with RLS policies
4. Add updated_at triggers

### Phase 2: Type Definitions
1. Add EntityField, EntityFieldValue interfaces
2. Add FieldDataType enum
3. Add helper functions for field type icons and labels

### Phase 3: Hooks
1. Create `use-entity-fields.ts` hook for field definitions CRUD
2. Create `use-entity-field-values.ts` hook for field values CRUD

### Phase 4: UI Components

**Field Management Components:**
- `FieldsManager` - Main fields list view with search and filtering (like the screenshot)
- `FieldDialog` - Create/edit field form with name, data type selection
- `FieldCard` / `FieldRow` - Display a single field with icon, name, and data type

**Field Rendering Components:**
- `DynamicField` - Renders appropriate input based on field type
- `DynamicFieldView` - Displays field value in read mode

### Phase 5: Integration with Entity Forms
- Update entity create/edit dialogs to include custom fields
- Update entity detail views to display custom field values

### Phase 6: Navigation
- Add "Fields" link to settings or as a dedicated page per entity type

## Data Types and Their Rendering

| Type | Input Component | Display Format | Value Column |
|------|-----------------|----------------|--------------|
| text | Input | Plain text | value_text |
| number | Input type=number | Formatted number | value_number |
| date | DatePicker | Formatted date | value_date |
| datetime | DateTimePicker | Formatted datetime | value_date |
| boolean | Switch | Yes/No badge | value_boolean |
| currency | Input + currency selector | $1,234.00 | value_number + config |
| link | Input type=url | Clickable link | value_text |
| address | Address form | Formatted address | value_json |
| actor | User selector | User avatar + name | value_text (user_id) |

## Files to Create

| File | Purpose |
|------|---------|
| `src/types/entity-fields.ts` | Type definitions for custom fields |
| `src/hooks/use-entity-fields.ts` | CRUD for field definitions |
| `src/hooks/use-entity-field-values.ts` | CRUD for field values |
| `src/components/fields/FieldsManager.tsx` | Main fields management UI |
| `src/components/fields/FieldDialog.tsx` | Create/edit field dialog |
| `src/components/fields/FieldRow.tsx` | Single field row in list |
| `src/components/fields/DynamicField.tsx` | Render input based on type |
| `src/components/fields/DynamicFieldView.tsx` | Display value based on type |
| `src/pages/EntityFields.tsx` | Dedicated page for field management |

## Files to Modify

| File | Changes |
|------|---------|
| `src/pages/EntityList.tsx` | Add custom fields to entity forms |
| `src/components/layout/CRMSidebar.tsx` | Add Fields navigation link |
| `src/App.tsx` | Add route for EntityFields page |

## UI Design (Based on Screenshot)

The Fields management page will include:

1. **Header Section**
   - Title "Fields" with description
   - "+ Add Field" button
   - Optional "+ Add relation" for linking fields

2. **Search and Filter**
   - Search input to filter fields by name
   - Filter button for advanced filtering

3. **Fields Table**
   - Columns: Name (with icon), App ("Managed" badge), Data type (with icon)
   - Each row is clickable for editing
   - Hover actions for quick edit/delete

4. **Field Creation Dialog**
   - Field name input
   - Data type selector with icons
   - Optional description
   - Configuration options based on type

## Technical Considerations

1. **Performance**: Index on (entity_table, entity_id) for field values
2. **Validation**: Client and server-side validation based on field type
3. **Migration**: Existing hardcoded fields (email, phone, notes) remain as-is; custom fields extend them
4. **Filtering**: Custom fields can be used in search/filter operations

## Summary

This implementation creates a flexible custom fields system where:
- Admins define fields per entity type with various data types
- Field values are stored in a normalized values table
- The UI matches the professional design shown in the reference
- Existing entity functionality remains intact while gaining extensibility
