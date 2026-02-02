-- Create document type enum
CREATE TYPE public.document_type AS ENUM ('contract', 'receipt', 'statement', 'invoice', 'purchase_order', 'other');

-- Create document status enum  
CREATE TYPE public.document_status AS ENUM ('pending', 'reviewed', 'approved', 'rejected');

-- Create document import status enum
CREATE TYPE public.document_import_status AS ENUM ('pending', 'downloading', 'processing', 'completed', 'failed');

-- Add entity linking columns to extracted_invoices
ALTER TABLE public.extracted_invoices 
ADD COLUMN IF NOT EXISTS entity_table TEXT,
ADD COLUMN IF NOT EXISTS entity_id UUID,
ADD COLUMN IF NOT EXISTS document_source TEXT DEFAULT 'email',
ADD COLUMN IF NOT EXISTS source_file_id UUID REFERENCES public.entity_files(id) ON DELETE SET NULL;

-- Create index for entity lookup on invoices
CREATE INDEX IF NOT EXISTS idx_extracted_invoices_entity 
ON public.extracted_invoices(entity_table, entity_id);

-- Create extracted_documents table
CREATE TABLE public.extracted_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID,
  entity_table TEXT,
  entity_id UUID,
  email_id UUID REFERENCES public.email_messages(id) ON DELETE SET NULL,
  source_file_id UUID REFERENCES public.entity_files(id) ON DELETE SET NULL,
  document_type public.document_type NOT NULL DEFAULT 'other',
  title TEXT,
  extracted_data JSONB DEFAULT '{}'::jsonb,
  confidence NUMERIC,
  status public.document_status NOT NULL DEFAULT 'pending',
  reviewed_by UUID,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for extracted_documents
CREATE INDEX idx_extracted_documents_entity ON public.extracted_documents(entity_table, entity_id);
CREATE INDEX idx_extracted_documents_status ON public.extracted_documents(status);
CREATE INDEX idx_extracted_documents_type ON public.extracted_documents(document_type);

-- Enable RLS on extracted_documents
ALTER TABLE public.extracted_documents ENABLE ROW LEVEL SECURITY;

-- RLS policies for extracted_documents
CREATE POLICY "Users can view documents they created or are admin"
ON public.extracted_documents FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role) OR created_by = auth.uid());

CREATE POLICY "Users can insert documents"
ON public.extracted_documents FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR created_by = auth.uid());

CREATE POLICY "Users can update documents they created or are admin"
ON public.extracted_documents FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role) OR created_by = auth.uid());

CREATE POLICY "Admins can delete documents"
ON public.extracted_documents FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create document_import_events table
CREATE TABLE public.document_import_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  endpoint_id UUID REFERENCES public.webhook_endpoints(id) ON DELETE SET NULL,
  external_id TEXT,
  source_system TEXT,
  document_type TEXT,
  file_url TEXT,
  file_path TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  status public.document_import_status NOT NULL DEFAULT 'pending',
  entity_table TEXT,
  entity_id UUID,
  extracted_doc_id UUID REFERENCES public.extracted_documents(id) ON DELETE SET NULL,
  error_message TEXT,
  user_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  processed_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes for document_import_events
CREATE INDEX idx_document_import_events_status ON public.document_import_events(status);
CREATE INDEX idx_document_import_events_endpoint ON public.document_import_events(endpoint_id);

-- Enable RLS on document_import_events
ALTER TABLE public.document_import_events ENABLE ROW LEVEL SECURITY;

-- RLS policies for document_import_events
CREATE POLICY "Admins can manage document_import_events"
ON public.document_import_events FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view their import events"
ON public.document_import_events FOR SELECT
USING (user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

-- Trigger for updated_at on extracted_documents
CREATE TRIGGER update_extracted_documents_updated_at
BEFORE UPDATE ON public.extracted_documents
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();