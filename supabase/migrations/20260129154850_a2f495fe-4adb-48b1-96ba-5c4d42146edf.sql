-- Create classification logs table
CREATE TABLE public.email_classification_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email_id UUID NOT NULL REFERENCES email_messages(id) ON DELETE CASCADE,
  user_id UUID,
  entity_table TEXT,
  confidence NUMERIC,
  source TEXT NOT NULL DEFAULT 'ai', -- 'ai', 'cache', 'manual'
  success BOOLEAN NOT NULL DEFAULT true,
  error_message TEXT,
  processing_time_ms INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.email_classification_logs ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view own classification logs"
  ON public.email_classification_logs FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role) OR user_id = auth.uid());

CREATE POLICY "Users can insert own classification logs"
  ON public.email_classification_logs FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR user_id = auth.uid());

CREATE POLICY "Users can delete own classification logs"
  ON public.email_classification_logs FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role) OR user_id = auth.uid());

-- Index for faster lookups
CREATE INDEX idx_classification_logs_email ON public.email_classification_logs(email_id);
CREATE INDEX idx_classification_logs_user ON public.email_classification_logs(user_id);
CREATE INDEX idx_classification_logs_created ON public.email_classification_logs(created_at DESC);