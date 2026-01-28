-- Create influencers table
CREATE TABLE public.influencers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  notes TEXT,
  avatar_url TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create resellers table
CREATE TABLE public.resellers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  notes TEXT,
  avatar_url TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create suppliers table
CREATE TABLE public.suppliers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
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
ALTER TABLE public.influencers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resellers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;

-- Influencers policies
CREATE POLICY "Team members can view influencers" ON public.influencers
  FOR SELECT USING (is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "Team members can create influencers" ON public.influencers
  FOR INSERT WITH CHECK (is_workspace_member(auth.uid(), workspace_id) AND auth.uid() = created_by);

CREATE POLICY "Team members can update influencers" ON public.influencers
  FOR UPDATE USING (is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "Team members can delete influencers" ON public.influencers
  FOR DELETE USING (is_workspace_member(auth.uid(), workspace_id));

-- Resellers policies
CREATE POLICY "Team members can view resellers" ON public.resellers
  FOR SELECT USING (is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "Team members can create resellers" ON public.resellers
  FOR INSERT WITH CHECK (is_workspace_member(auth.uid(), workspace_id) AND auth.uid() = created_by);

CREATE POLICY "Team members can update resellers" ON public.resellers
  FOR UPDATE USING (is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "Team members can delete resellers" ON public.resellers
  FOR DELETE USING (is_workspace_member(auth.uid(), workspace_id));

-- Suppliers policies
CREATE POLICY "Team members can view suppliers" ON public.suppliers
  FOR SELECT USING (is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "Team members can create suppliers" ON public.suppliers
  FOR INSERT WITH CHECK (is_workspace_member(auth.uid(), workspace_id) AND auth.uid() = created_by);

CREATE POLICY "Team members can update suppliers" ON public.suppliers
  FOR UPDATE USING (is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "Team members can delete suppliers" ON public.suppliers
  FOR DELETE USING (is_workspace_member(auth.uid(), workspace_id));

-- Triggers for updated_at
CREATE TRIGGER update_influencers_updated_at
  BEFORE UPDATE ON public.influencers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_resellers_updated_at
  BEFORE UPDATE ON public.resellers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_suppliers_updated_at
  BEFORE UPDATE ON public.suppliers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();