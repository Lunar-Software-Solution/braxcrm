-- Create table to store Webflow API tokens per site
CREATE TABLE public.webflow_tokens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  site_id TEXT NOT NULL UNIQUE,
  site_name TEXT,
  api_token TEXT NOT NULL,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.webflow_tokens ENABLE ROW LEVEL SECURITY;

-- Only admins can manage tokens
CREATE POLICY "Admins can manage webflow_tokens"
  ON public.webflow_tokens
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Trigger for updated_at
CREATE TRIGGER update_webflow_tokens_updated_at
  BEFORE UPDATE ON public.webflow_tokens
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();