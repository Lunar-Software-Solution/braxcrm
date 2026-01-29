-- Add is_person column to email_messages for AI classification
-- true = real person, false = automated/non-person sender, null = not yet classified
ALTER TABLE public.email_messages 
  ADD COLUMN is_person boolean DEFAULT NULL;