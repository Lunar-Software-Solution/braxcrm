// Document Extraction and Ingestion Types

export type DocumentType = 'contract' | 'receipt' | 'statement' | 'invoice' | 'purchase_order' | 'other';
export type DocumentStatus = 'pending' | 'reviewed' | 'approved' | 'rejected';
export type DocumentImportStatus = 'pending' | 'downloading' | 'processing' | 'completed' | 'failed';
export type InvoiceStatus = 'pending' | 'reviewed' | 'approved' | 'rejected';

// Extracted Invoice (enhanced with entity linking)
export interface ExtractedInvoice {
  id: string;
  user_id: string | null;
  email_id: string;
  vendor_name: string | null;
  invoice_number: string | null;
  amount: number | null;
  currency: string | null;
  due_date: string | null;
  raw_extraction: Record<string, unknown> | null;
  status: InvoiceStatus;
  entity_table: string | null;
  entity_id: string | null;
  document_source: string | null;
  source_file_id: string | null;
  created_at: string;
}

// Extracted Document (for non-invoice documents)
export interface ExtractedDocument {
  id: string;
  workspace_id: string | null;
  entity_table: string | null;
  entity_id: string | null;
  email_id: string | null;
  source_file_id: string | null;
  document_type: DocumentType;
  title: string | null;
  extracted_data: Record<string, unknown>;
  confidence: number | null;
  status: DocumentStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

// Document Import Event (for external ingestion)
export interface DocumentImportEvent {
  id: string;
  endpoint_id: string | null;
  external_id: string | null;
  source_system: string | null;
  document_type: string | null;
  file_url: string | null;
  file_path: string | null;
  metadata: Record<string, unknown>;
  status: DocumentImportStatus;
  entity_table: string | null;
  entity_id: string | null;
  extracted_doc_id: string | null;
  error_message: string | null;
  user_id: string | null;
  created_at: string;
  processed_at: string | null;
}

// Extraction Schemas for each document type
export interface InvoiceExtractionData {
  vendor_name: string | null;
  invoice_number: string | null;
  amount: number | null;
  currency: string | null;
  due_date: string | null;
  line_items?: Array<{
    description: string;
    quantity: number;
    unit_price: number;
  }>;
}

export interface ContractExtractionData {
  title: string | null;
  parties: string[];
  effective_date: string | null;
  expiration_date: string | null;
  key_terms: string[];
  renewal_type: string | null;
}

export interface ReceiptExtractionData {
  vendor_name: string | null;
  amount: number | null;
  currency: string | null;
  date: string | null;
  payment_method: string | null;
  category: string | null;
}

export interface PurchaseOrderExtractionData {
  po_number: string | null;
  vendor_name: string | null;
  order_date: string | null;
  delivery_date: string | null;
  items: Array<{
    sku: string;
    description: string;
    quantity: number;
    unit_price: number;
  }>;
  total: number | null;
}

export interface StatementExtractionData {
  account_name: string | null;
  account_number: string | null;
  statement_date: string | null;
  period_start: string | null;
  period_end: string | null;
  opening_balance: number | null;
  closing_balance: number | null;
}

// Union type for all extraction data
export type ExtractionData = 
  | InvoiceExtractionData 
  | ContractExtractionData 
  | ReceiptExtractionData 
  | PurchaseOrderExtractionData 
  | StatementExtractionData
  | Record<string, unknown>;

// Create/Update Input Types
export interface CreateExtractedInvoiceInput {
  email_id: string;
  vendor_name?: string;
  invoice_number?: string;
  amount?: number;
  currency?: string;
  due_date?: string;
  entity_table?: string;
  entity_id?: string;
  document_source?: string;
  source_file_id?: string;
}

export interface UpdateExtractedInvoiceInput {
  id: string;
  vendor_name?: string;
  invoice_number?: string;
  amount?: number;
  currency?: string;
  due_date?: string;
  status?: InvoiceStatus;
}

export interface CreateExtractedDocumentInput {
  entity_table?: string;
  entity_id?: string;
  email_id?: string;
  source_file_id?: string;
  document_type: DocumentType;
  title?: string;
  extracted_data?: Record<string, unknown>;
  confidence?: number;
}

export interface UpdateExtractedDocumentInput {
  id: string;
  title?: string;
  extracted_data?: Record<string, unknown>;
  status?: DocumentStatus;
}

// Document Import API Payload
export interface DocumentImportPayload {
  external_id: string;
  document_type?: string;
  file_url: string;
  entity_hint?: {
    entity_table: string;
    entity_email?: string;
    entity_name?: string;
  };
  metadata?: Record<string, unknown>;
}

// Entity types that support invoice extraction
export const INVOICE_CAPABLE_ENTITIES = [
  'product_suppliers',
  'services_suppliers',
  'corporate_management',
  'subscription_suppliers',
  'merchant_accounts',
  'logistic_suppliers',
] as const;

export type InvoiceCapableEntity = typeof INVOICE_CAPABLE_ENTITIES[number];

// Check if an entity type supports invoice extraction
export function isInvoiceCapableEntity(entityTable: string): boolean {
  return (INVOICE_CAPABLE_ENTITIES as readonly string[]).includes(entityTable);
}

// Document type display config
export const DOCUMENT_TYPE_CONFIG: Record<DocumentType, { label: string; icon: string; color: string }> = {
  invoice: { label: 'Invoice', icon: 'FileText', color: '#3b82f6' },
  contract: { label: 'Contract', icon: 'FileCheck', color: '#8b5cf6' },
  receipt: { label: 'Receipt', icon: 'Receipt', color: '#10b981' },
  purchase_order: { label: 'Purchase Order', icon: 'ClipboardList', color: '#f59e0b' },
  statement: { label: 'Statement', icon: 'FileSpreadsheet', color: '#06b6d4' },
  other: { label: 'Other', icon: 'File', color: '#64748b' },
};

// Status display config
export const DOCUMENT_STATUS_CONFIG: Record<DocumentStatus, { label: string; color: string }> = {
  pending: { label: 'Pending', color: '#f59e0b' },
  reviewed: { label: 'Reviewed', color: '#3b82f6' },
  approved: { label: 'Approved', color: '#10b981' },
  rejected: { label: 'Rejected', color: '#ef4444' },
};

export const IMPORT_STATUS_CONFIG: Record<DocumentImportStatus, { label: string; color: string }> = {
  pending: { label: 'Pending', color: '#f59e0b' },
  downloading: { label: 'Downloading', color: '#3b82f6' },
  processing: { label: 'Processing', color: '#8b5cf6' },
  completed: { label: 'Completed', color: '#10b981' },
  failed: { label: 'Failed', color: '#ef4444' },
};
