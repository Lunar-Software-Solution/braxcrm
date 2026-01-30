-- Create email_subscriptions link table
CREATE TABLE IF NOT EXISTS public.email_subscriptions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email_id uuid NOT NULL REFERENCES public.email_messages(id) ON DELETE CASCADE,
  subscription_id uuid NOT NULL REFERENCES public.subscriptions(id) ON DELETE CASCADE,
  assigned_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(email_id, subscription_id)
);

-- Create email_personal_contacts link table
CREATE TABLE IF NOT EXISTS public.email_personal_contacts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email_id uuid NOT NULL REFERENCES public.email_messages(id) ON DELETE CASCADE,
  personal_contact_id uuid NOT NULL REFERENCES public.personal_contacts(id) ON DELETE CASCADE,
  assigned_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(email_id, personal_contact_id)
);

-- Enable RLS on both tables
ALTER TABLE public.email_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_personal_contacts ENABLE ROW LEVEL SECURITY;

-- RLS policies for email_subscriptions
CREATE POLICY "Role-based select for email_subscriptions"
ON public.email_subscriptions
FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role) 
  OR has_entity_role(auth.uid(), 'subscriptions'::text)
  OR EXISTS (
    SELECT 1 FROM email_messages e
    WHERE e.id = email_subscriptions.email_id AND e.user_id = auth.uid()
  )
);

CREATE POLICY "Role-based insert for email_subscriptions"
ON public.email_subscriptions
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) 
  OR has_entity_role(auth.uid(), 'subscriptions'::text)
);

CREATE POLICY "Role-based delete for email_subscriptions"
ON public.email_subscriptions
FOR DELETE
USING (
  has_role(auth.uid(), 'admin'::app_role) 
  OR has_entity_role(auth.uid(), 'subscriptions'::text)
);

-- RLS policies for email_personal_contacts
CREATE POLICY "Role-based select for email_personal_contacts"
ON public.email_personal_contacts
FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role) 
  OR has_entity_role(auth.uid(), 'personal_contacts'::text)
  OR EXISTS (
    SELECT 1 FROM email_messages e
    WHERE e.id = email_personal_contacts.email_id AND e.user_id = auth.uid()
  )
);

CREATE POLICY "Role-based insert for email_personal_contacts"
ON public.email_personal_contacts
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) 
  OR has_entity_role(auth.uid(), 'personal_contacts'::text)
);

CREATE POLICY "Role-based delete for email_personal_contacts"
ON public.email_personal_contacts
FOR DELETE
USING (
  has_role(auth.uid(), 'admin'::app_role) 
  OR has_entity_role(auth.uid(), 'personal_contacts'::text)
);