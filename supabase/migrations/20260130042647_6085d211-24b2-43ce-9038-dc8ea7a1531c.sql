-- Phase 1: Webhook Object Processing System Schema

-- 1.1 Create status enum
CREATE TYPE webhook_event_status AS ENUM ('pending', 'processing', 'processed', 'failed');

-- 1.2 Create webhook_endpoints table
CREATE TABLE public.webhook_endpoints (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  secret_key TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  description TEXT,
  allowed_object_types TEXT[] DEFAULT ARRAY[]::TEXT[],
  default_entity_table TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 1.3 Create webhook_events table
CREATE TABLE public.webhook_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  endpoint_id UUID NOT NULL REFERENCES public.webhook_endpoints(id) ON DELETE CASCADE,
  external_id TEXT,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  status webhook_event_status NOT NULL DEFAULT 'pending',
  entity_table TEXT,
  is_person BOOLEAN,
  person_id UUID REFERENCES public.people(id) ON DELETE SET NULL,
  entity_id UUID,
  ai_confidence NUMERIC,
  error_message TEXT,
  processed_at TIMESTAMPTZ,
  user_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 1.4 Create webhook_event_logs table
CREATE TABLE public.webhook_event_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  webhook_event_id UUID NOT NULL REFERENCES public.webhook_events(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL,
  action_config JSONB DEFAULT '{}'::jsonb,
  success BOOLEAN NOT NULL DEFAULT true,
  error_message TEXT,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 1.5 Create indexes for performance
CREATE INDEX idx_webhook_endpoints_slug ON public.webhook_endpoints(slug);
CREATE INDEX idx_webhook_endpoints_is_active ON public.webhook_endpoints(is_active);
CREATE INDEX idx_webhook_events_endpoint_id ON public.webhook_events(endpoint_id);
CREATE INDEX idx_webhook_events_status ON public.webhook_events(status);
CREATE INDEX idx_webhook_events_user_id ON public.webhook_events(user_id);
CREATE INDEX idx_webhook_events_entity_table ON public.webhook_events(entity_table);
CREATE INDEX idx_webhook_event_logs_event_id ON public.webhook_event_logs(webhook_event_id);

-- 1.6 Add updated_at trigger for webhook_endpoints
CREATE TRIGGER update_webhook_endpoints_updated_at
  BEFORE UPDATE ON public.webhook_endpoints
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 1.7 Enable RLS
ALTER TABLE public.webhook_endpoints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_event_logs ENABLE ROW LEVEL SECURITY;

-- 1.8 RLS Policies for webhook_endpoints (admin only for management)
CREATE POLICY "Admins can manage webhook_endpoints"
  ON public.webhook_endpoints
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated can view active webhook_endpoints"
  ON public.webhook_endpoints
  FOR SELECT
  USING (auth.uid() IS NOT NULL AND is_active = true);

-- 1.9 RLS Policies for webhook_events
CREATE POLICY "Admins can manage all webhook_events"
  ON public.webhook_events
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view own webhook_events"
  ON public.webhook_events
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can update own webhook_events"
  ON public.webhook_events
  FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own webhook_events"
  ON public.webhook_events
  FOR DELETE
  USING (user_id = auth.uid());

-- 1.10 RLS Policies for webhook_event_logs
CREATE POLICY "Admins can manage all webhook_event_logs"
  ON public.webhook_event_logs
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view logs for own events"
  ON public.webhook_event_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.webhook_events we
      WHERE we.id = webhook_event_logs.webhook_event_id
      AND we.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert logs for own events"
  ON public.webhook_event_logs
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.webhook_events we
      WHERE we.id = webhook_event_logs.webhook_event_id
      AND we.user_id = auth.uid()
    )
  );