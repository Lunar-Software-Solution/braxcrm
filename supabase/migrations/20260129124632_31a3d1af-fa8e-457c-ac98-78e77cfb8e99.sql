-- Create entity field type enum
CREATE TYPE public.entity_field_type AS ENUM (
  'text',
  'number',
  'date',
  'datetime',
  'boolean',
  'currency',
  'link',
  'address',
  'actor'
);

-- Create entity_fields table for field definitions
CREATE TABLE public.entity_fields (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  entity_table TEXT NOT NULL,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  data_type entity_field_type NOT NULL DEFAULT 'text',
  icon TEXT,
  description TEXT,
  is_required BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  config JSONB DEFAULT '{}'::jsonb,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(entity_table, slug)
);

-- Create entity_field_values table for storing values
CREATE TABLE public.entity_field_values (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  field_id UUID NOT NULL REFERENCES public.entity_fields(id) ON DELETE CASCADE,
  entity_table TEXT NOT NULL,
  entity_id UUID NOT NULL,
  value_text TEXT,
  value_number NUMERIC,
  value_boolean BOOLEAN,
  value_date TIMESTAMP WITH TIME ZONE,
  value_json JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(field_id, entity_id)
);

-- Enable RLS
ALTER TABLE public.entity_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.entity_field_values ENABLE ROW LEVEL SECURITY;

-- RLS for entity_fields: Admins can manage, all authenticated can read
CREATE POLICY "Admins can manage entity_fields"
ON public.entity_fields FOR ALL
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated can view entity_fields"
ON public.entity_fields FOR SELECT
USING (auth.uid() IS NOT NULL);

-- RLS for entity_field_values: Based on entity access
CREATE POLICY "Admins can manage entity_field_values"
ON public.entity_field_values FOR ALL
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view field values for accessible entities"
ON public.entity_field_values FOR SELECT
USING (
  has_role(auth.uid(), 'admin') OR
  has_entity_role(auth.uid(), entity_table) OR
  can_view_record(auth.uid(), entity_id, entity_table)
);

CREATE POLICY "Users can insert field values for accessible entities"
ON public.entity_field_values FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'admin') OR
  has_entity_role(auth.uid(), entity_table)
);

CREATE POLICY "Users can update field values for accessible entities"
ON public.entity_field_values FOR UPDATE
USING (
  has_role(auth.uid(), 'admin') OR
  has_entity_role(auth.uid(), entity_table)
);

CREATE POLICY "Users can delete field values for accessible entities"
ON public.entity_field_values FOR DELETE
USING (
  has_role(auth.uid(), 'admin') OR
  has_entity_role(auth.uid(), entity_table)
);

-- Add updated_at triggers
CREATE TRIGGER update_entity_fields_updated_at
BEFORE UPDATE ON public.entity_fields
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_entity_field_values_updated_at
BEFORE UPDATE ON public.entity_field_values
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add indexes for performance
CREATE INDEX idx_entity_fields_entity_table ON public.entity_fields(entity_table);
CREATE INDEX idx_entity_field_values_entity ON public.entity_field_values(entity_table, entity_id);
CREATE INDEX idx_entity_field_values_field ON public.entity_field_values(field_id);