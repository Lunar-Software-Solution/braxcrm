-- Add sender info columns to email_messages for person creation during rules processing
ALTER TABLE public.email_messages 
ADD COLUMN IF NOT EXISTS sender_email text,
ADD COLUMN IF NOT EXISTS sender_name text;