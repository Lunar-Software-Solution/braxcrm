-- Create subscriptions table
CREATE TABLE public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text,
  phone text,
  notes text,
  avatar_url text,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- RLS Policies (same pattern as other entities)
CREATE POLICY "Role-based select for subscriptions"
  ON public.subscriptions FOR SELECT
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_entity_role(auth.uid(), 'subscriptions')
    OR can_view_record(auth.uid(), id, 'subscriptions')
  );

CREATE POLICY "Role-based insert for subscriptions"
  ON public.subscriptions FOR INSERT
  WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_entity_role(auth.uid(), 'subscriptions')
  );

CREATE POLICY "Role-based update for subscriptions"
  ON public.subscriptions FOR UPDATE
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_entity_role(auth.uid(), 'subscriptions')
  );

CREATE POLICY "Role-based delete for subscriptions"
  ON public.subscriptions FOR DELETE
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_entity_role(auth.uid(), 'subscriptions')
  );

-- Add updated_at trigger
CREATE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert entity role
INSERT INTO public.entity_roles (name, slug, entity_table, description)
VALUES (
  'Subscription Manager',
  'subscription_manager',
  'subscriptions',
  'Full access to Subscriptions and linked People'
);