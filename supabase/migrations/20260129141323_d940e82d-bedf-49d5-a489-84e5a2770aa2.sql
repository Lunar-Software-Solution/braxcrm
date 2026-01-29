-- Step 1: Create entity_automation_rules table
CREATE TABLE public.entity_automation_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_table text NOT NULL UNIQUE,
  is_active boolean NOT NULL DEFAULT true,
  priority integer NOT NULL DEFAULT 0,
  description text,
  ai_prompt text,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.entity_automation_rules ENABLE ROW LEVEL SECURITY;

-- RLS policies for entity_automation_rules
CREATE POLICY "Authenticated can view entity_automation_rules"
ON public.entity_automation_rules FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can insert entity_automation_rules"
ON public.entity_automation_rules FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update entity_automation_rules"
ON public.entity_automation_rules FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete entity_automation_rules"
ON public.entity_automation_rules FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Step 2: Create entity_rule_actions table
CREATE TABLE public.entity_rule_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_rule_id uuid NOT NULL REFERENCES entity_automation_rules(id) ON DELETE CASCADE,
  action_type text NOT NULL,
  config jsonb NOT NULL DEFAULT '{}',
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.entity_rule_actions ENABLE ROW LEVEL SECURITY;

-- RLS policies for entity_rule_actions
CREATE POLICY "Authenticated can view entity_rule_actions"
ON public.entity_rule_actions FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can insert entity_rule_actions"
ON public.entity_rule_actions FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update entity_rule_actions"
ON public.entity_rule_actions FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete entity_rule_actions"
ON public.entity_rule_actions FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Step 3: Add entity_table column to email_messages
ALTER TABLE public.email_messages 
ADD COLUMN IF NOT EXISTS entity_table text;

-- Create updated_at trigger for entity_automation_rules
CREATE TRIGGER update_entity_automation_rules_updated_at
BEFORE UPDATE ON public.entity_automation_rules
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();