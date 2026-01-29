-- Add unique constraint on microsoft_message_id for email_messages upsert
ALTER TABLE public.email_messages 
ADD CONSTRAINT email_messages_microsoft_message_id_key UNIQUE (microsoft_message_id);

-- Add unique constraint on email_id, category_id for email_message_categories upsert
ALTER TABLE public.email_message_categories 
ADD CONSTRAINT email_message_categories_email_category_key UNIQUE (email_id, category_id);