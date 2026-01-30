-- Create email_templates table for reusable email templates
CREATE TABLE public.email_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  body_html TEXT NOT NULL,
  body_text TEXT,
  merge_fields JSONB DEFAULT '[]'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create email_sequences table for multi-step drip campaigns
CREATE TABLE public.email_sequences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  entity_table TEXT, -- nullable for People-only sequences
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create sequence_steps table for individual steps within sequences
CREATE TABLE public.sequence_steps (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sequence_id UUID NOT NULL REFERENCES public.email_sequences(id) ON DELETE CASCADE,
  step_order INTEGER NOT NULL DEFAULT 0,
  template_id UUID NOT NULL REFERENCES public.email_templates(id) ON DELETE RESTRICT,
  delay_days INTEGER NOT NULL DEFAULT 0,
  delay_hours INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create enrollment_status enum
CREATE TYPE enrollment_status AS ENUM ('active', 'completed', 'paused', 'unsubscribed', 'failed');

-- Create sequence_enrollments table for tracking contacts in sequences
CREATE TABLE public.sequence_enrollments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sequence_id UUID NOT NULL REFERENCES public.email_sequences(id) ON DELETE CASCADE,
  contact_type TEXT NOT NULL, -- 'people' or entity table name
  contact_id UUID NOT NULL,
  contact_email TEXT NOT NULL,
  current_step INTEGER NOT NULL DEFAULT 1,
  status enrollment_status NOT NULL DEFAULT 'active',
  enrolled_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  next_send_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  enrolled_by UUID NOT NULL,
  UNIQUE(sequence_id, contact_type, contact_id)
);

-- Create email_triggers table for event-based automation
CREATE TABLE public.email_triggers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  trigger_type TEXT NOT NULL, -- 'entity_created', 'entity_updated', 'person_created', etc.
  entity_table TEXT NOT NULL,
  conditions JSONB DEFAULT '{}'::jsonb,
  template_id UUID NOT NULL REFERENCES public.email_templates(id) ON DELETE RESTRICT,
  delay_minutes INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create automation_send_status enum
CREATE TYPE automation_send_status AS ENUM ('pending', 'sent', 'failed', 'bounced');

-- Create automation_send_log table for comprehensive logging
CREATE TABLE public.automation_send_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  automation_type TEXT NOT NULL, -- 'sequence' or 'trigger'
  automation_id UUID NOT NULL, -- sequence or trigger ID
  enrollment_id UUID REFERENCES public.sequence_enrollments(id) ON DELETE SET NULL,
  contact_type TEXT NOT NULL,
  contact_id UUID NOT NULL,
  contact_email TEXT NOT NULL,
  template_id UUID REFERENCES public.email_templates(id) ON DELETE SET NULL,
  subject TEXT NOT NULL,
  status automation_send_status NOT NULL DEFAULT 'pending',
  sent_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  microsoft_message_id TEXT,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX idx_sequence_steps_sequence_id ON public.sequence_steps(sequence_id);
CREATE INDEX idx_sequence_enrollments_sequence_id ON public.sequence_enrollments(sequence_id);
CREATE INDEX idx_sequence_enrollments_status ON public.sequence_enrollments(status);
CREATE INDEX idx_sequence_enrollments_next_send_at ON public.sequence_enrollments(next_send_at) WHERE status = 'active';
CREATE INDEX idx_email_triggers_entity_table ON public.email_triggers(entity_table);
CREATE INDEX idx_automation_send_log_automation ON public.automation_send_log(automation_type, automation_id);
CREATE INDEX idx_automation_send_log_contact ON public.automation_send_log(contact_type, contact_id);
CREATE INDEX idx_automation_send_log_status ON public.automation_send_log(status);

-- Enable RLS on all tables
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_sequences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sequence_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sequence_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_triggers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_send_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies for email_templates
CREATE POLICY "Admins can manage email_templates" ON public.email_templates
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated can view email_templates" ON public.email_templates
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- RLS Policies for email_sequences
CREATE POLICY "Admins can manage email_sequences" ON public.email_sequences
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated can view email_sequences" ON public.email_sequences
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- RLS Policies for sequence_steps
CREATE POLICY "Admins can manage sequence_steps" ON public.sequence_steps
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated can view sequence_steps" ON public.sequence_steps
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- RLS Policies for sequence_enrollments
CREATE POLICY "Admins can manage sequence_enrollments" ON public.sequence_enrollments
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view enrollments they created" ON public.sequence_enrollments
  FOR SELECT USING (enrolled_by = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can insert enrollments" ON public.sequence_enrollments
  FOR INSERT WITH CHECK (enrolled_by = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can update their enrollments" ON public.sequence_enrollments
  FOR UPDATE USING (enrolled_by = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for email_triggers
CREATE POLICY "Admins can manage email_triggers" ON public.email_triggers
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated can view email_triggers" ON public.email_triggers
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- RLS Policies for automation_send_log
CREATE POLICY "Admins can manage automation_send_log" ON public.automation_send_log
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view their send logs" ON public.automation_send_log
  FOR SELECT USING (user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can insert send logs" ON public.automation_send_log
  FOR INSERT WITH CHECK (user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

-- Add update triggers for updated_at columns
CREATE TRIGGER update_email_templates_updated_at
  BEFORE UPDATE ON public.email_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_email_sequences_updated_at
  BEFORE UPDATE ON public.email_sequences
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_email_triggers_updated_at
  BEFORE UPDATE ON public.email_triggers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();