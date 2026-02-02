-- Create entity status enum
CREATE TYPE entity_status AS ENUM ('draft', 'pending', 'under_review', 'approved', 'rejected');

-- Add columns to affiliates
ALTER TABLE public.affiliates 
  ADD COLUMN status entity_status NOT NULL DEFAULT 'approved',
  ADD COLUMN reviewed_by UUID REFERENCES auth.users(id),
  ADD COLUMN reviewed_at TIMESTAMPTZ,
  ADD COLUMN rejection_reason TEXT,
  ADD COLUMN source TEXT DEFAULT 'manual',
  ADD COLUMN source_reference TEXT;
CREATE INDEX idx_affiliates_status ON public.affiliates(status);

-- Add columns to vigile_partners
ALTER TABLE public.vigile_partners 
  ADD COLUMN status entity_status NOT NULL DEFAULT 'approved',
  ADD COLUMN reviewed_by UUID REFERENCES auth.users(id),
  ADD COLUMN reviewed_at TIMESTAMPTZ,
  ADD COLUMN rejection_reason TEXT,
  ADD COLUMN source TEXT DEFAULT 'manual',
  ADD COLUMN source_reference TEXT;
CREATE INDEX idx_vigile_partners_status ON public.vigile_partners(status);

-- Add columns to brax_distributors
ALTER TABLE public.brax_distributors 
  ADD COLUMN status entity_status NOT NULL DEFAULT 'approved',
  ADD COLUMN reviewed_by UUID REFERENCES auth.users(id),
  ADD COLUMN reviewed_at TIMESTAMPTZ,
  ADD COLUMN rejection_reason TEXT,
  ADD COLUMN source TEXT DEFAULT 'manual',
  ADD COLUMN source_reference TEXT;
CREATE INDEX idx_brax_distributors_status ON public.brax_distributors(status);

-- Add columns to product_suppliers
ALTER TABLE public.product_suppliers 
  ADD COLUMN status entity_status NOT NULL DEFAULT 'approved',
  ADD COLUMN reviewed_by UUID REFERENCES auth.users(id),
  ADD COLUMN reviewed_at TIMESTAMPTZ,
  ADD COLUMN rejection_reason TEXT,
  ADD COLUMN source TEXT DEFAULT 'manual',
  ADD COLUMN source_reference TEXT;
CREATE INDEX idx_product_suppliers_status ON public.product_suppliers(status);

-- Add columns to services_suppliers
ALTER TABLE public.services_suppliers 
  ADD COLUMN status entity_status NOT NULL DEFAULT 'approved',
  ADD COLUMN reviewed_by UUID REFERENCES auth.users(id),
  ADD COLUMN reviewed_at TIMESTAMPTZ,
  ADD COLUMN rejection_reason TEXT,
  ADD COLUMN source TEXT DEFAULT 'manual',
  ADD COLUMN source_reference TEXT;
CREATE INDEX idx_services_suppliers_status ON public.services_suppliers(status);

-- Add columns to corporate_management
ALTER TABLE public.corporate_management 
  ADD COLUMN status entity_status NOT NULL DEFAULT 'approved',
  ADD COLUMN reviewed_by UUID REFERENCES auth.users(id),
  ADD COLUMN reviewed_at TIMESTAMPTZ,
  ADD COLUMN rejection_reason TEXT,
  ADD COLUMN source TEXT DEFAULT 'manual',
  ADD COLUMN source_reference TEXT;
CREATE INDEX idx_corporate_management_status ON public.corporate_management(status);

-- Add columns to personal_contacts
ALTER TABLE public.personal_contacts 
  ADD COLUMN status entity_status NOT NULL DEFAULT 'approved',
  ADD COLUMN reviewed_by UUID REFERENCES auth.users(id),
  ADD COLUMN reviewed_at TIMESTAMPTZ,
  ADD COLUMN rejection_reason TEXT,
  ADD COLUMN source TEXT DEFAULT 'manual',
  ADD COLUMN source_reference TEXT;
CREATE INDEX idx_personal_contacts_status ON public.personal_contacts(status);

-- Add columns to subscriptions
ALTER TABLE public.subscriptions 
  ADD COLUMN status entity_status NOT NULL DEFAULT 'approved',
  ADD COLUMN reviewed_by UUID REFERENCES auth.users(id),
  ADD COLUMN reviewed_at TIMESTAMPTZ,
  ADD COLUMN rejection_reason TEXT,
  ADD COLUMN source TEXT DEFAULT 'manual',
  ADD COLUMN source_reference TEXT;
CREATE INDEX idx_subscriptions_status ON public.subscriptions(status);

-- Add columns to marketing_sources
ALTER TABLE public.marketing_sources 
  ADD COLUMN status entity_status NOT NULL DEFAULT 'approved',
  ADD COLUMN reviewed_by UUID REFERENCES auth.users(id),
  ADD COLUMN reviewed_at TIMESTAMPTZ,
  ADD COLUMN rejection_reason TEXT,
  ADD COLUMN source TEXT DEFAULT 'manual',
  ADD COLUMN source_reference TEXT;
CREATE INDEX idx_marketing_sources_status ON public.marketing_sources(status);

-- Add columns to merchant_accounts
ALTER TABLE public.merchant_accounts 
  ADD COLUMN status entity_status NOT NULL DEFAULT 'approved',
  ADD COLUMN reviewed_by UUID REFERENCES auth.users(id),
  ADD COLUMN reviewed_at TIMESTAMPTZ,
  ADD COLUMN rejection_reason TEXT,
  ADD COLUMN source TEXT DEFAULT 'manual',
  ADD COLUMN source_reference TEXT;
CREATE INDEX idx_merchant_accounts_status ON public.merchant_accounts(status);

-- Add columns to logistic_suppliers
ALTER TABLE public.logistic_suppliers 
  ADD COLUMN status entity_status NOT NULL DEFAULT 'approved',
  ADD COLUMN reviewed_by UUID REFERENCES auth.users(id),
  ADD COLUMN reviewed_at TIMESTAMPTZ,
  ADD COLUMN rejection_reason TEXT,
  ADD COLUMN source TEXT DEFAULT 'manual',
  ADD COLUMN source_reference TEXT;
CREATE INDEX idx_logistic_suppliers_status ON public.logistic_suppliers(status);