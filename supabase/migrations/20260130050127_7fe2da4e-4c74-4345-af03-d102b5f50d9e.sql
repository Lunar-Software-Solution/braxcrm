-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Create webflow_sync_config table
CREATE TABLE public.webflow_sync_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  site_id TEXT NOT NULL,
  form_id TEXT,
  form_name TEXT,
  endpoint_id UUID REFERENCES public.webhook_endpoints(id) ON DELETE SET NULL,
  last_synced_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sync_interval_hours INTEGER NOT NULL DEFAULT 1,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.webflow_sync_config ENABLE ROW LEVEL SECURITY;

-- RLS policies - admins only for now
CREATE POLICY "Admins can manage webflow_sync_config"
  ON public.webflow_sync_config
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated can view webflow_sync_config"
  ON public.webflow_sync_config
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Add updated_at trigger
CREATE TRIGGER update_webflow_sync_config_updated_at
  BEFORE UPDATE ON public.webflow_sync_config
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();