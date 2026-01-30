

# Collapsible Sidebar Menu Organization

## Current State

The sidebar currently has a flat structure with sections that are getting long:
- **Quick Actions**: Search, Users & Roles
- **Workspace**: 14 items in a flat list (People, Senders, Tasks, Opportunities, Inbox, queues, import features, automation, settings)
- **Organisations**: 10 entity types
- **Future Items**: Dashboards (disabled)

## Proposed Organization

Reorganize the Workspace section into logical collapsible sub-groups:

```text
+---------------------------+
|  [Search]                 |
|  [Users & Roles]          |
+---------------------------+
|  WORKSPACE                |
|  > Core                   |
|      People               |
|      Senders              |
|      Tasks                |
|      Opportunities        |
|  > Email                  |
|      Inbox                |
|      Classification Queue |
|      Rules Queue          |
|      Processing Log       |
|      Email Automation     |
|  > Import                 |
|      Import Queue         |
|      Import Log           |
|      Import Endpoints     |
|  > Settings               |
|      Settings             |
+---------------------------+
|  ORGANISATIONS            |
|  (collapsible)            |
|    Influencers            |
|    Resellers              |
|    ...                    |
+---------------------------+
```

## Implementation

### Group Structure

| Group | Items | Badge Support |
|-------|-------|---------------|
| **Core** | People, Senders, Tasks, Opportunities | - |
| **Email** | Inbox, Classification Queue, Rules Queue, Processing Log, Email Automation | Classification count, Rules count |
| **Import** | Import Queue, Import Log, Import Endpoints | Import count |
| **Settings** | Settings | - |
| **Organisations** | All 10 entity types | - |

### Technical Approach

1. **Use Radix Collapsible** - Wrap each sub-group in `Collapsible` components from the existing UI library
2. **State Management** - Use React state to track which sections are expanded
3. **Auto-expand active** - Automatically expand the group containing the currently active route
4. **Persist state** - Optionally save collapsed state to localStorage
5. **Visual indicators** - Add chevron icons that rotate when expanded/collapsed

### Files to Modify

| File | Changes |
|------|---------|
| `src/components/layout/CRMSidebar.tsx` | Add collapsible groups, reorganize menu items |

### UI Components

Each collapsible group header will have:
- Chevron icon (rotates on expand/collapse)
- Group label
- Optional badge showing total pending items in that group

### Accessibility

- Keyboard navigation preserved
- Proper ARIA attributes via Radix primitives
- Focus management on expand/collapse

