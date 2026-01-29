-- Create email_rule_logs table to track rule processing
CREATE TABLE public.email_rule_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    email_id uuid NOT NULL REFERENCES public.email_messages(id) ON DELETE CASCADE,
    rule_id uuid REFERENCES public.email_rules(id) ON DELETE SET NULL,
    action_type text NOT NULL,
    action_config jsonb DEFAULT '{}'::jsonb,
    success boolean NOT NULL DEFAULT true,
    error_message text,
    processed_at timestamp with time zone NOT NULL DEFAULT now(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Create indexes for performance
CREATE INDEX idx_email_rule_logs_email_id ON public.email_rule_logs(email_id);
CREATE INDEX idx_email_rule_logs_rule_id ON public.email_rule_logs(rule_id);
CREATE INDEX idx_email_rule_logs_processed_at ON public.email_rule_logs(processed_at DESC);
CREATE INDEX idx_email_rule_logs_user_id ON public.email_rule_logs(user_id);

-- Enable RLS
ALTER TABLE public.email_rule_logs ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view own rule logs"
ON public.email_rule_logs
FOR SELECT
USING (
    has_role(auth.uid(), 'admin'::app_role) 
    OR user_id = auth.uid()
);

CREATE POLICY "Users can insert own rule logs"
ON public.email_rule_logs
FOR INSERT
WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role) 
    OR user_id = auth.uid()
);

CREATE POLICY "Users can delete own rule logs"
ON public.email_rule_logs
FOR DELETE
USING (
    has_role(auth.uid(), 'admin'::app_role) 
    OR user_id = auth.uid()
);