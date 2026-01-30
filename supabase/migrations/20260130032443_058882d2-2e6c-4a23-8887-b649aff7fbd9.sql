-- Create merchant_accounts table
CREATE TABLE public.merchant_accounts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  notes TEXT,
  avatar_url TEXT
);

-- Create carriers table
CREATE TABLE public.carriers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  notes TEXT,
  avatar_url TEXT
);

-- Enable RLS on both tables
ALTER TABLE public.merchant_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.carriers ENABLE ROW LEVEL SECURITY;

-- RLS policies for merchant_accounts
CREATE POLICY "Role-based select for merchant_accounts" ON public.merchant_accounts
  FOR SELECT USING (
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_entity_role(auth.uid(), 'merchant_accounts'::text) OR 
    can_view_record(auth.uid(), id, 'merchant_accounts'::text)
  );

CREATE POLICY "Role-based insert for merchant_accounts" ON public.merchant_accounts
  FOR INSERT WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_entity_role(auth.uid(), 'merchant_accounts'::text)
  );

CREATE POLICY "Role-based update for merchant_accounts" ON public.merchant_accounts
  FOR UPDATE USING (
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_entity_role(auth.uid(), 'merchant_accounts'::text)
  );

CREATE POLICY "Role-based delete for merchant_accounts" ON public.merchant_accounts
  FOR DELETE USING (
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_entity_role(auth.uid(), 'merchant_accounts'::text)
  );

-- RLS policies for carriers
CREATE POLICY "Role-based select for carriers" ON public.carriers
  FOR SELECT USING (
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_entity_role(auth.uid(), 'carriers'::text) OR 
    can_view_record(auth.uid(), id, 'carriers'::text)
  );

CREATE POLICY "Role-based insert for carriers" ON public.carriers
  FOR INSERT WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_entity_role(auth.uid(), 'carriers'::text)
  );

CREATE POLICY "Role-based update for carriers" ON public.carriers
  FOR UPDATE USING (
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_entity_role(auth.uid(), 'carriers'::text)
  );

CREATE POLICY "Role-based delete for carriers" ON public.carriers
  FOR DELETE USING (
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_entity_role(auth.uid(), 'carriers'::text)
  );

-- Create email junction tables
CREATE TABLE public.email_merchant_accounts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email_id UUID NOT NULL REFERENCES public.email_messages(id) ON DELETE CASCADE,
  merchant_account_id UUID NOT NULL REFERENCES public.merchant_accounts(id) ON DELETE CASCADE,
  assigned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(email_id, merchant_account_id)
);

CREATE TABLE public.email_carriers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email_id UUID NOT NULL REFERENCES public.email_messages(id) ON DELETE CASCADE,
  carrier_id UUID NOT NULL REFERENCES public.carriers(id) ON DELETE CASCADE,
  assigned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(email_id, carrier_id)
);

-- Enable RLS on junction tables
ALTER TABLE public.email_merchant_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_carriers ENABLE ROW LEVEL SECURITY;

-- RLS for email_merchant_accounts
CREATE POLICY "Role-based select for email_merchant_accounts" ON public.email_merchant_accounts
  FOR SELECT USING (
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_entity_role(auth.uid(), 'merchant_accounts'::text) OR 
    EXISTS (SELECT 1 FROM email_messages e WHERE e.id = email_merchant_accounts.email_id AND e.user_id = auth.uid())
  );

CREATE POLICY "Role-based insert for email_merchant_accounts" ON public.email_merchant_accounts
  FOR INSERT WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_entity_role(auth.uid(), 'merchant_accounts'::text)
  );

CREATE POLICY "Role-based delete for email_merchant_accounts" ON public.email_merchant_accounts
  FOR DELETE USING (
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_entity_role(auth.uid(), 'merchant_accounts'::text)
  );

-- RLS for email_carriers
CREATE POLICY "Role-based select for email_carriers" ON public.email_carriers
  FOR SELECT USING (
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_entity_role(auth.uid(), 'carriers'::text) OR 
    EXISTS (SELECT 1 FROM email_messages e WHERE e.id = email_carriers.email_id AND e.user_id = auth.uid())
  );

CREATE POLICY "Role-based insert for email_carriers" ON public.email_carriers
  FOR INSERT WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_entity_role(auth.uid(), 'carriers'::text)
  );

CREATE POLICY "Role-based delete for email_carriers" ON public.email_carriers
  FOR DELETE USING (
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_entity_role(auth.uid(), 'carriers'::text)
  );

-- Create entity roles for the new entities
INSERT INTO public.entity_roles (entity_table, name, slug) VALUES
  ('merchant_accounts', 'Merchant Accounts Manager', 'merchant_accounts_manager'),
  ('carriers', 'Carriers Manager', 'carriers_manager');

-- Add triggers for updated_at
CREATE TRIGGER update_merchant_accounts_updated_at
  BEFORE UPDATE ON public.merchant_accounts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_carriers_updated_at
  BEFORE UPDATE ON public.carriers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();