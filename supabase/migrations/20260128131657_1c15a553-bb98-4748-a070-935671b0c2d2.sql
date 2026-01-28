-- Add new columns to companies
ALTER TABLE public.companies 
  ADD COLUMN IF NOT EXISTS employees integer,
  ADD COLUMN IF NOT EXISTS linkedin_url text,
  ADD COLUMN IF NOT EXISTS address text,
  ADD COLUMN IF NOT EXISTS account_owner_id uuid;

-- Add new columns to people
ALTER TABLE public.people 
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS linkedin_url text,
  ADD COLUMN IF NOT EXISTS twitter_handle text;