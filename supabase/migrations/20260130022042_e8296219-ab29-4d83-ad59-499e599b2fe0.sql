-- Add columns to email_classification_logs to store AI request/response data
ALTER TABLE public.email_classification_logs
ADD COLUMN IF NOT EXISTS ai_prompt TEXT,
ADD COLUMN IF NOT EXISTS ai_response TEXT,
ADD COLUMN IF NOT EXISTS ai_model TEXT;