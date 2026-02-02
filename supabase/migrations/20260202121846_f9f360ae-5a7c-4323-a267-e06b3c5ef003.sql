-- Rename email junction tables and columns
ALTER TABLE public.email_influencers RENAME TO email_affiliates;
ALTER TABLE public.email_affiliates RENAME COLUMN influencer_id TO affiliate_id;

ALTER TABLE public.email_expense_suppliers RENAME TO email_services_suppliers;
ALTER TABLE public.email_services_suppliers RENAME COLUMN expense_supplier_id TO services_supplier_id;