

# Document Extraction and Ingestion System

## Overview

This plan implements three interconnected capabilities:

1. **Invoice Scanning for All Supplier Categories** - Extend the existing invoice extraction to cover logistic suppliers and add UI components for viewing/managing extracted invoices
2. **Document Extraction from Emails** - AI-powered extraction of various document types from email attachments
3. **Document Ingestion Flow from External Systems** - A new import endpoint type for receiving and processing documents from other systems

---

## Current State Analysis

### Existing Infrastructure

| Component | Status |
|-----------|--------|
| `extract-invoice` edge function | Exists - extracts invoice data from email body using AI |
| `extracted_invoices` table | Exists - stores vendor_name, invoice_number, amount, currency, due_date |
| `entity-files` storage bucket | Exists - stores files attached to entities |
| `entity_files` table | Exists - tracks file metadata |
| `webhook-ingest` edge function | Exists - receives external data via HTTP |
| `INVOICE_CAPABLE_ENTITIES` config | Missing `logistic_suppliers` |

### Gaps to Address

- Logistic Suppliers not included in invoice-capable entities
- No UI to view/manage extracted invoices per entity
- No document classification (invoices vs contracts vs receipts)
- No attachment extraction from emails
- No document ingestion from external systems

---

## Data Model Additions

### 1. Enhanced Extracted Invoices Table

Add entity linking to existing `extracted_invoices` table:

```text
extracted_invoices (existing - add columns)
+-------------------+
| entity_table      | TEXT (polymorphic)
| entity_id         | UUID (polymorphic)
| document_source   | TEXT (email, upload, import)
| source_file_id    | UUID (FK to entity_files)
+-------------------+
```

### 2. New Extracted Documents Table

For non-invoice documents (contracts, receipts, statements, etc.):

```text
extracted_documents
+-------------------+
| id                | UUID (PK)
| entity_table      | TEXT (polymorphic)
| entity_id         | UUID (polymorphic)
| email_id          | UUID (FK, nullable)
| source_file_id    | UUID (FK to entity_files, nullable)
| document_type     | ENUM (contract, receipt, statement, invoice, purchase_order, other)
| title             | TEXT
| extracted_data    | JSONB
| confidence        | NUMERIC
| status            | ENUM (pending, reviewed, approved, rejected)
| reviewed_by       | UUID
| reviewed_at       | TIMESTAMPTZ
| created_by        | UUID
| created_at        | TIMESTAMPTZ
+-------------------+
```

### 3. Document Ingestion Events Table

For documents received from external systems:

```text
document_import_events
+-------------------+
| id                | UUID (PK)
| endpoint_id       | UUID (FK to webhook_endpoints)
| external_id       | TEXT
| source_system     | TEXT
| document_type     | TEXT
| file_url          | TEXT (temporary URL from source)
| file_path         | TEXT (after download to storage)
| metadata          | JSONB
| status            | ENUM (pending, downloading, processing, completed, failed)
| entity_table      | TEXT
| entity_id         | UUID
| extracted_doc_id  | UUID (FK to extracted_documents)
| error_message     | TEXT
| user_id           | UUID
| created_at        | TIMESTAMPTZ
| processed_at      | TIMESTAMPTZ
+-------------------+
```

---

## Edge Functions

### 1. `extract-document` (New)

General-purpose document extraction that handles:
- Invoices (delegates to enhanced extract-invoice)
- Contracts (extracts parties, dates, terms)
- Receipts (extracts vendor, amount, date)
- Purchase Orders (extracts items, quantities, amounts)
- Statements (extracts account info, transactions)

Input: File from storage or email attachment
Output: Structured data stored in `extracted_documents`

### 2. `extract-invoice` (Enhanced)

Modify to:
- Accept file_path parameter (for processing uploaded files)
- Add entity linking (entity_table, entity_id)
- Support document_source tracking

### 3. `process-document-import` (New)

Handles incoming document ingestion:
1. Download file from source URL
2. Store in entity-files bucket
3. Classify document type using AI
4. Route to appropriate extraction function
5. Link to entity based on metadata

### 4. `extract-email-attachments` (New)

Downloads and processes email attachments:
1. Fetch attachments via Graph API
2. Store in entity-files bucket
3. Create entity_files records
4. Queue for document extraction

---

## Action Types

### New Automation Actions

| Action Type | Description |
|-------------|-------------|
| `extract_attachments` | Download email attachments to entity files |
| `extract_documents` | AI classification + extraction of documents |

### Updated Entity Action Availability

```typescript
export const ENTITY_ACTION_AVAILABILITY: Record<string, RuleActionType[]> = {
  product_suppliers: ["tag", "extract_invoice", "extract_documents"],
  services_suppliers: ["tag", "extract_invoice", "extract_documents"],
  corporate_management: ["tag", "extract_invoice", "extract_documents"],
  subscription_suppliers: ["tag", "extract_invoice", "extract_documents"],
  merchant_accounts: ["tag", "extract_invoice", "extract_documents"],
  logistic_suppliers: ["tag", "extract_invoice", "extract_documents"],  // NEW
  affiliates: ["tag"],
  vigile_partners: ["tag"],
  brax_distributors: ["tag"],
  personal_contacts: ["tag"],
  marketing_sources: ["tag"],
};
```

---

## Frontend Components

### 1. Entity Invoices Tab

Add "Invoices" tab to `EntityDetailPanel` for invoice-capable entities:
- List of extracted invoices linked to entity
- Status badges (pending, reviewed, approved)
- Quick actions (approve, reject, edit)
- Manual invoice entry button

### 2. Entity Documents Tab

Add "Documents" tab to `EntityDetailPanel`:
- List of extracted documents by type
- Filter by document type
- Status management
- View extracted data

### 3. Document Import Queue Page

New page at `/import/documents`:
- List pending document imports
- Status tracking
- Manual processing trigger
- Error handling

### 4. Invoices Management Page

New page at `/invoices`:
- Global view of all extracted invoices
- Filter by entity type, status, date range
- Bulk approve/reject actions
- Export functionality

---

## Files to Create

| File | Purpose |
|------|---------|
| `supabase/functions/extract-document/index.ts` | General document extraction |
| `supabase/functions/extract-email-attachments/index.ts` | Email attachment download |
| `supabase/functions/process-document-import/index.ts` | External document ingestion |
| `src/types/documents.ts` | Document-related TypeScript types |
| `src/hooks/use-extracted-invoices.ts` | Invoice CRUD and queries |
| `src/hooks/use-extracted-documents.ts` | Document CRUD and queries |
| `src/hooks/use-document-imports.ts` | Document import management |
| `src/components/crm/InvoicesList.tsx` | Invoice list for entity panels |
| `src/components/crm/DocumentsList.tsx` | Document list for entity panels |
| `src/components/documents/InvoiceCard.tsx` | Invoice display card |
| `src/components/documents/DocumentCard.tsx` | Document display card |
| `src/components/documents/InvoiceDetailPanel.tsx` | Invoice detail view |
| `src/components/documents/DocumentDetailPanel.tsx` | Document detail view |
| `src/pages/Invoices.tsx` | Global invoices management page |
| `src/pages/DocumentImportQueue.tsx` | Document import queue page |

## Files to Modify

| File | Changes |
|------|---------|
| `src/types/entity-automation.ts` | Add logistic_suppliers to INVOICE_CAPABLE_ENTITIES |
| `src/types/email-rules.ts` | Add `extract_documents` action type |
| `src/components/crm/EntityDetailPanel.tsx` | Add Invoices/Documents tabs |
| `src/components/layout/CRMSidebar.tsx` | Add Invoices to navigation |
| `src/App.tsx` | Add new routes |
| `supabase/functions/extract-invoice/index.ts` | Add entity linking, file support |
| `supabase/functions/process-entity-rules/index.ts` | Add extract_documents action |

---

## Document Types and Extraction Schema

### Invoice
```json
{
  "vendor_name": "string",
  "invoice_number": "string",
  "amount": "number",
  "currency": "string",
  "due_date": "date",
  "line_items": [{ "description": "string", "quantity": "number", "unit_price": "number" }]
}
```

### Contract
```json
{
  "title": "string",
  "parties": ["string"],
  "effective_date": "date",
  "expiration_date": "date",
  "key_terms": ["string"],
  "renewal_type": "string"
}
```

### Receipt
```json
{
  "vendor_name": "string",
  "amount": "number",
  "currency": "string",
  "date": "date",
  "payment_method": "string",
  "category": "string"
}
```

### Purchase Order
```json
{
  "po_number": "string",
  "vendor_name": "string",
  "order_date": "date",
  "delivery_date": "date",
  "items": [{ "sku": "string", "description": "string", "quantity": "number", "unit_price": "number" }],
  "total": "number"
}
```

### Statement
```json
{
  "account_name": "string",
  "account_number": "string",
  "statement_date": "date",
  "period_start": "date",
  "period_end": "date",
  "opening_balance": "number",
  "closing_balance": "number"
}
```

---

## Document Import API

### Endpoint
```
POST /functions/v1/process-document-import/{slug}
```

### Payload Schema
```typescript
interface DocumentImportPayload {
  external_id: string;
  document_type?: string;  // Optional - AI will classify if not provided
  file_url: string;        // URL to download the document
  entity_hint?: {
    entity_table: string;
    entity_email?: string; // To match existing entity
    entity_name?: string;
  };
  metadata?: Record<string, unknown>;
}
```

### Example Request
```json
{
  "external_id": "doc_abc123",
  "document_type": "invoice",
  "file_url": "https://external-system.com/files/invoice.pdf",
  "entity_hint": {
    "entity_table": "product_suppliers",
    "entity_email": "supplier@example.com"
  },
  "metadata": {
    "source_system": "erp",
    "imported_at": "2026-02-02T12:00:00Z"
  }
}
```

---

## Implementation Order

1. **Database Schema** - Create new tables and modify existing ones
2. **Type Definitions** - Add TypeScript types for documents
3. **Update Entity Configuration** - Add logistic_suppliers to invoice-capable
4. **Edge Functions** - Create/modify document extraction functions
5. **Hooks** - Create React Query hooks for data access
6. **Entity Panel Integration** - Add Invoices/Documents tabs
7. **Management Pages** - Create global Invoices and Document Import Queue pages
8. **Navigation** - Update sidebar and routing

