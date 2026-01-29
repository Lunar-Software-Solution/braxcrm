-- 1. Create sender_type enum
CREATE TYPE public.sender_type AS ENUM (
  'automated', 'newsletter', 'shared_inbox', 'system'
);

-- 2. Create senders table
CREATE TABLE public.senders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  display_name text,
  sender_type public.sender_type NOT NULL DEFAULT 'automated',
  entity_table text,
  entity_id uuid,
  domain text,
  is_auto_created boolean NOT NULL DEFAULT true,
  created_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 3. Add indexes
CREATE INDEX idx_senders_email ON public.senders(email);
CREATE INDEX idx_senders_domain ON public.senders(domain);
CREATE INDEX idx_senders_entity ON public.senders(entity_table, entity_id);

-- 4. Add sender_id to email_messages
ALTER TABLE public.email_messages 
  ADD COLUMN sender_id uuid REFERENCES public.senders(id);

-- 5. Enable RLS
ALTER TABLE public.senders ENABLE ROW LEVEL SECURITY;

-- 6. RLS Policies
CREATE POLICY "Authenticated can view senders"
  ON public.senders FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can insert senders"
  ON public.senders FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can update senders"
  ON public.senders FOR UPDATE
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete senders"
  ON public.senders FOR DELETE
  USING (has_role(auth.uid(), 'admin'));

-- 7. Update trigger for updated_at
CREATE TRIGGER update_senders_updated_at
  BEFORE UPDATE ON public.senders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();