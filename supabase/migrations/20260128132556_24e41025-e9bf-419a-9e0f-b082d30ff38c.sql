-- Add unique constraint for user_id + microsoft_email combination
-- First, clean up any duplicates by keeping only the latest one
DELETE FROM public.microsoft_tokens a
USING public.microsoft_tokens b
WHERE a.id < b.id
AND a.user_id = b.user_id
AND a.microsoft_email = b.microsoft_email
AND a.microsoft_email IS NOT NULL;

-- Create unique index for the upsert to work properly
CREATE UNIQUE INDEX IF NOT EXISTS microsoft_tokens_user_email_unique 
ON public.microsoft_tokens (user_id, microsoft_email) 
WHERE microsoft_email IS NOT NULL;

-- Also create index for faster lookups
CREATE INDEX IF NOT EXISTS microsoft_tokens_user_primary 
ON public.microsoft_tokens (user_id, is_primary) 
WHERE is_primary = true;