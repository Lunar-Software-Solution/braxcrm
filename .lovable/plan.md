
# CRM Layout Restructure - Attio-Style Interface

## Overview
Transform the current application to match the Attio/Notion-style CRM interface with:
- A persistent left sidebar navigation with workspace context
- Table-based views for People and Companies (spreadsheet-like)
- Slide-out detail panel for viewing person/company details
- Footer with aggregation calculations

## Architecture Changes

### Current Layout Structure
```text
+------------------------+
| Each page is standalone|
| with its own layout    |
| (card-based views)     |
+------------------------+
```

### Target Layout Structure
```text
+--------+---------------------------+---------------+
| Sidebar| Table Header + Filters    | Detail Panel  |
|        +---------------------------+ (slide-out)   |
| test v |  All People (5)  Filter   |               |
| -------|---------------------------|  Brian Chesky |
| Add  / |[]|Name     |Email   |... |  Created 1m   |
| Search |[]|Brian    |brian@..|... |               |
| Settngs|[]|Dario    |dario@..|... |  Home|Tasks   |
| -------|---------------------------|               |
| WKSPACE|+ Add New                  |  Empty Inbox  |
| People |---------------------------|               |
| Company| Calculate | Unique: 5    |               |
+--------+---------------------------+---------------+
```

## Implementation Steps

### Phase 1: Create App Shell Layout

**1.1 Create CRM Sidebar Component**
- Workspace selector dropdown at top
- Add (+) and folder buttons in header
- Search button
- Settings link
- "Workspace" section label
- Navigation items: People, Companies, Opportunities, Tasks, Notes, Workflows, Dashboards
- User menu at bottom

File: `src/components/layout/CRMSidebar.tsx`

**1.2 Create Main App Layout**
- Uses SidebarProvider from existing UI components
- Persistent sidebar on all CRM routes
- Main content area that renders child routes
- Global header with sidebar trigger

File: `src/components/layout/AppLayout.tsx`

### Phase 2: Create Reusable CRM Table Components

**2.1 CRM Data Table Component**
- Spreadsheet-style table with checkbox column
- Column headers with icons and sort indicators
- Hover states on rows
- Click to select (opens detail panel)
- "+" Add New row at bottom

File: `src/components/crm/DataTable.tsx`

**2.2 Table Footer with Aggregations**
- "Calculate" dropdown on left
- Dynamic aggregation chips (Unique of X, Empty of X%, etc.)

File: `src/components/crm/TableFooter.tsx`

**2.3 Detail Slide Panel**
- Slides in from right when row is selected
- Shows avatar, name, created date
- Tab navigation: Home, Tasks, Notes, Files, +More
- Activity/email timeline or "Empty Inbox" state

File: `src/components/crm/DetailPanel.tsx`

### Phase 3: Refactor People Page

**3.1 Convert to Table View**
Replace card grid with spreadsheet table:
- Columns: Checkbox, Name (avatar), Emails, Created by, Company, Phones, Creation date, Job Title, City, LinkedIn, X, + button
- Row selection with slide-out detail panel
- Inline "Add New" row

**3.2 Table Features**
- Filter button in header
- Sort button in header
- Options dropdown
- Column resize (future)

File: `src/pages/People.tsx` (complete rewrite)

### Phase 4: Refactor Companies Page

**4.1 Convert to Table View**
Same pattern as People:
- Columns: Checkbox, Name (icon), Domain, Created by, Account Owner, Creation date, Employees, LinkedIn, Address, + button
- Row selection with detail panel
- Inline "Add New" row

File: `src/pages/Companies.tsx` (complete rewrite)

### Phase 5: Database Schema Updates

**5.1 Add Missing Columns to Companies Table**
```sql
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS employees integer;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS linkedin_url text;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS address text;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS account_owner_id uuid;
```

**5.2 Add Missing Columns to People Table**
```sql
ALTER TABLE public.people ADD COLUMN IF NOT EXISTS city text;
ALTER TABLE public.people ADD COLUMN IF NOT EXISTS linkedin_url text;
ALTER TABLE public.people ADD COLUMN IF NOT EXISTS twitter_handle text;
```

### Phase 6: Update Routing

**6.1 Wrap CRM Routes with Layout**
Update App.tsx to use the new AppLayout for all CRM pages:
- Index route shows People or redirects to /people
- All CRM routes share the persistent sidebar

**6.2 Remove Old Email-Focused Layout**
The EmailLayout becomes a separate route (/inbox) rather than the default home

---

## Technical Details

### Sidebar Navigation Items
| Item | Icon | Route |
|------|------|-------|
| Search | Search | Modal |
| Settings | Settings | /settings |
| --- | --- | --- |
| People | Users | /people |
| Companies | Building2 | /companies |
| Opportunities | Target | /opportunities (future) |
| Tasks | CheckSquare | /tasks (future) |
| Notes | FileText | /notes (future) |
| Workflows | GitBranch | /workflows (future) |
| Dashboards | LayoutDashboard | /dashboards (future) |

### People Table Columns
| Column | Field | Icon |
|--------|-------|------|
| Checkbox | Selection | CheckSquare |
| Name | name + avatar | User |
| Emails | email | Mail |
| Created by | created_by join | User |
| Company | company relation | Building2 |
| Phones | phone | Phone |
| Creation date | created_at | Calendar |
| Job Title | title | Briefcase |
| City | city (new) | MapPin |
| LinkedIn | linkedin_url (new) | Linkedin |
| X | twitter_handle (new) | Twitter |
| + | Add column | Plus |

### Companies Table Columns
| Column | Field | Icon |
|--------|-------|------|
| Checkbox | Selection | CheckSquare |
| Name | name + icon | Building2 |
| Domain | domain | Globe |
| Created by | created_by join | User |
| Account Owner | account_owner_id (new) | UserCircle |
| Creation date | created_at | Calendar |
| Employees | employees (new) | Users |
| LinkedIn | linkedin_url (new) | Linkedin |
| Address | address (new) | MapPin |
| + | Add column | Plus |

### Footer Aggregations
- Count all: X
- Unique of [field]: X
- Empty of [field]: X%
- Not empty of [field]: X
- Max of [field]: X
- Earliest/Latest: date

---

## Files to Create

| File | Purpose |
|------|---------|
| `src/components/layout/AppLayout.tsx` | Main layout wrapper with sidebar |
| `src/components/layout/CRMSidebar.tsx` | Left navigation sidebar |
| `src/components/crm/DataTable.tsx` | Reusable spreadsheet table |
| `src/components/crm/TableHeader.tsx` | Table header with filters/sort |
| `src/components/crm/TableFooter.tsx` | Aggregation footer |
| `src/components/crm/DetailPanel.tsx` | Right slide-out panel |
| `src/components/crm/AddNewRow.tsx` | "+ Add New" inline row |

## Files to Modify

| File | Changes |
|------|---------|
| `src/App.tsx` | Update routing with AppLayout wrapper |
| `src/pages/Index.tsx` | Redirect to /people or render People |
| `src/pages/People.tsx` | Complete rewrite to table view |
| `src/pages/Companies.tsx` | Complete rewrite to table view |
| `src/pages/PersonDetail.tsx` | Convert to inline detail panel component |
| `src/types/crm.ts` | Add new fields (city, linkedin_url, etc.) |
| `src/hooks/use-crm.ts` | Update queries to include new fields |

## Database Migration

```sql
-- Add new columns to companies
ALTER TABLE public.companies 
  ADD COLUMN IF NOT EXISTS employees integer,
  ADD COLUMN IF NOT EXISTS linkedin_url text,
  ADD COLUMN IF NOT EXISTS address text,
  ADD COLUMN IF NOT EXISTS account_owner_id uuid REFERENCES auth.users(id);

-- Add new columns to people
ALTER TABLE public.people 
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS linkedin_url text,
  ADD COLUMN IF NOT EXISTS twitter_handle text;
```

---

## Summary

This restructure transforms the app from a card-based layout to a professional Attio-style CRM with:

1. Persistent navigation sidebar with workspace context
2. Spreadsheet-like table views for data management
3. Slide-out detail panels for contextual information
4. Footer aggregations for quick data insights
5. Scalable architecture for future CRM features (Opportunities, Tasks, etc.)
