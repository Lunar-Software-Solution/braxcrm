-- Add status column to profiles table for suspend functionality
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active' 
CHECK (status IN ('active', 'suspended'));

-- Add suspended_at and suspended_by columns for audit trail
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS suspended_at timestamptz,
ADD COLUMN IF NOT EXISTS suspended_by uuid;