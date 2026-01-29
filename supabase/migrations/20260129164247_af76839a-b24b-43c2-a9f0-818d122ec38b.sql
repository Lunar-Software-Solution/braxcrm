-- Create marketing_sources table
CREATE TABLE public.marketing_sources (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  notes TEXT,
  avatar_url TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.marketing_sources ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Role-based select for marketing_sources" 
ON public.marketing_sources 
FOR SELECT 
USING (
  has_role(auth.uid(), 'admin'::app_role) 
  OR has_entity_role(auth.uid(), 'marketing_sources'::text)
  OR can_view_record(auth.uid(), id, 'marketing_sources'::text)
);

CREATE POLICY "Role-based insert for marketing_sources" 
ON public.marketing_sources 
FOR INSERT 
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) 
  OR has_entity_role(auth.uid(), 'marketing_sources'::text)
);

CREATE POLICY "Role-based update for marketing_sources" 
ON public.marketing_sources 
FOR UPDATE 
USING (
  has_role(auth.uid(), 'admin'::app_role) 
  OR has_entity_role(auth.uid(), 'marketing_sources'::text)
);

CREATE POLICY "Role-based delete for marketing_sources" 
ON public.marketing_sources 
FOR DELETE 
USING (
  has_role(auth.uid(), 'admin'::app_role) 
  OR has_entity_role(auth.uid(), 'marketing_sources'::text)
);

-- Create updated_at trigger
CREATE TRIGGER update_marketing_sources_updated_at
BEFORE UPDATE ON public.marketing_sources
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create email-entity junction table
CREATE TABLE public.email_marketing_sources (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email_id UUID NOT NULL REFERENCES public.email_messages(id) ON DELETE CASCADE,
  marketing_source_id UUID NOT NULL REFERENCES public.marketing_sources(id) ON DELETE CASCADE,
  assigned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(email_id, marketing_source_id)
);

-- Enable RLS on junction table
ALTER TABLE public.email_marketing_sources ENABLE ROW LEVEL SECURITY;

-- Junction table RLS policies
CREATE POLICY "Role-based select for email_marketing_sources" 
ON public.email_marketing_sources 
FOR SELECT 
USING (
  has_role(auth.uid(), 'admin'::app_role) 
  OR has_entity_role(auth.uid(), 'marketing_sources'::text)
  OR EXISTS (
    SELECT 1 FROM email_messages e 
    WHERE e.id = email_marketing_sources.email_id 
    AND e.user_id = auth.uid()
  )
);

CREATE POLICY "Role-based insert for email_marketing_sources" 
ON public.email_marketing_sources 
FOR INSERT 
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) 
  OR has_entity_role(auth.uid(), 'marketing_sources'::text)
);

CREATE POLICY "Role-based delete for email_marketing_sources" 
ON public.email_marketing_sources 
FOR DELETE 
USING (
  has_role(auth.uid(), 'admin'::app_role) 
  OR has_entity_role(auth.uid(), 'marketing_sources'::text)
);

-- Create entity role for marketing_sources
INSERT INTO public.entity_roles (name, slug, entity_table, description)
VALUES ('Marketing Sources Manager', 'marketing_sources_manager', 'marketing_sources', 'Can manage marketing sources and newsletters');