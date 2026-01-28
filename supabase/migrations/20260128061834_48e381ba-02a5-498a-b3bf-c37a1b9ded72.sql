-- Add email column to microsoft_tokens to support multiple accounts per user
ALTER TABLE public.microsoft_tokens
ADD COLUMN microsoft_email TEXT,
ADD COLUMN display_name TEXT,
ADD COLUMN is_primary BOOLEAN DEFAULT false;

-- Add unique constraint on user_id + microsoft_email
ALTER TABLE public.microsoft_tokens
DROP CONSTRAINT IF EXISTS microsoft_tokens_user_id_key;

ALTER TABLE public.microsoft_tokens
ADD CONSTRAINT microsoft_tokens_user_email_unique UNIQUE (user_id, microsoft_email);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_microsoft_tokens_user_primary 
ON public.microsoft_tokens (user_id, is_primary) 
WHERE is_primary = true;