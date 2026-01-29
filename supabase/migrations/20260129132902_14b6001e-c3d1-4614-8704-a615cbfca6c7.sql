-- Create storage bucket for entity files
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('entity-files', 'entity-files', false, 10485760, ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'text/plain', 'text/csv']);

-- Create entity_files table to track uploads
CREATE TABLE public.entity_files (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  entity_table TEXT NOT NULL,
  entity_id UUID NOT NULL,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  mime_type TEXT NOT NULL,
  uploaded_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.entity_files ENABLE ROW LEVEL SECURITY;

-- RLS policies for entity_files
CREATE POLICY "Users can view entity files"
  ON public.entity_files FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can upload entity files"
  ON public.entity_files FOR INSERT
  WITH CHECK (auth.uid() = uploaded_by);

CREATE POLICY "Users can delete their own files"
  ON public.entity_files FOR DELETE
  USING (auth.uid() = uploaded_by);

-- Storage policies for entity-files bucket
CREATE POLICY "Authenticated users can upload files"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'entity-files' AND auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can view files"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'entity-files' AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can delete their own uploaded files"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'entity-files' AND auth.uid() IS NOT NULL);