-- =============================================
-- Add missing policies for entity tables (influencers, resellers, suppliers, corporate_management)
-- =============================================

-- Drop any remaining old policies first
DROP POLICY IF EXISTS "Team members can view influencers" ON public.influencers;
DROP POLICY IF EXISTS "Team members can create influencers" ON public.influencers;
DROP POLICY IF EXISTS "Team members can update influencers" ON public.influencers;
DROP POLICY IF EXISTS "Team members can delete influencers" ON public.influencers;
DROP POLICY IF EXISTS "Team members can view resellers" ON public.resellers;
DROP POLICY IF EXISTS "Team members can create resellers" ON public.resellers;
DROP POLICY IF EXISTS "Team members can update resellers" ON public.resellers;
DROP POLICY IF EXISTS "Team members can delete resellers" ON public.resellers;
DROP POLICY IF EXISTS "Team members can view suppliers" ON public.suppliers;
DROP POLICY IF EXISTS "Team members can create suppliers" ON public.suppliers;
DROP POLICY IF EXISTS "Team members can update suppliers" ON public.suppliers;
DROP POLICY IF EXISTS "Team members can delete suppliers" ON public.suppliers;
DROP POLICY IF EXISTS "Team members can view corporate_management" ON public.corporate_management;
DROP POLICY IF EXISTS "Team members can create corporate_management" ON public.corporate_management;
DROP POLICY IF EXISTS "Team members can update corporate_management" ON public.corporate_management;
DROP POLICY IF EXISTS "Team members can delete corporate_management" ON public.corporate_management;

-- Drop workspace_id from entity tables
ALTER TABLE public.influencers DROP COLUMN IF EXISTS workspace_id;
ALTER TABLE public.resellers DROP COLUMN IF EXISTS workspace_id;
ALTER TABLE public.suppliers DROP COLUMN IF EXISTS workspace_id;
ALTER TABLE public.corporate_management DROP COLUMN IF EXISTS workspace_id;

-- INFLUENCERS policies
CREATE POLICY "Role-based select for influencers" ON public.influencers FOR SELECT
USING (
  public.has_role(auth.uid(), 'admin')
  OR public.has_entity_role(auth.uid(), 'influencers')
  OR public.can_view_record(auth.uid(), id, 'influencers')
);

CREATE POLICY "Role-based insert for influencers" ON public.influencers FOR INSERT
WITH CHECK (
  public.has_role(auth.uid(), 'admin')
  OR public.has_entity_role(auth.uid(), 'influencers')
);

CREATE POLICY "Role-based update for influencers" ON public.influencers FOR UPDATE
USING (
  public.has_role(auth.uid(), 'admin')
  OR public.has_entity_role(auth.uid(), 'influencers')
);

CREATE POLICY "Role-based delete for influencers" ON public.influencers FOR DELETE
USING (
  public.has_role(auth.uid(), 'admin')
  OR public.has_entity_role(auth.uid(), 'influencers')
);

-- RESELLERS policies
CREATE POLICY "Role-based select for resellers" ON public.resellers FOR SELECT
USING (
  public.has_role(auth.uid(), 'admin')
  OR public.has_entity_role(auth.uid(), 'resellers')
  OR public.can_view_record(auth.uid(), id, 'resellers')
);

CREATE POLICY "Role-based insert for resellers" ON public.resellers FOR INSERT
WITH CHECK (
  public.has_role(auth.uid(), 'admin')
  OR public.has_entity_role(auth.uid(), 'resellers')
);

CREATE POLICY "Role-based update for resellers" ON public.resellers FOR UPDATE
USING (
  public.has_role(auth.uid(), 'admin')
  OR public.has_entity_role(auth.uid(), 'resellers')
);

CREATE POLICY "Role-based delete for resellers" ON public.resellers FOR DELETE
USING (
  public.has_role(auth.uid(), 'admin')
  OR public.has_entity_role(auth.uid(), 'resellers')
);

-- SUPPLIERS policies
CREATE POLICY "Role-based select for suppliers" ON public.suppliers FOR SELECT
USING (
  public.has_role(auth.uid(), 'admin')
  OR public.has_entity_role(auth.uid(), 'suppliers')
  OR public.can_view_record(auth.uid(), id, 'suppliers')
);

CREATE POLICY "Role-based insert for suppliers" ON public.suppliers FOR INSERT
WITH CHECK (
  public.has_role(auth.uid(), 'admin')
  OR public.has_entity_role(auth.uid(), 'suppliers')
);

CREATE POLICY "Role-based update for suppliers" ON public.suppliers FOR UPDATE
USING (
  public.has_role(auth.uid(), 'admin')
  OR public.has_entity_role(auth.uid(), 'suppliers')
);

CREATE POLICY "Role-based delete for suppliers" ON public.suppliers FOR DELETE
USING (
  public.has_role(auth.uid(), 'admin')
  OR public.has_entity_role(auth.uid(), 'suppliers')
);

-- CORPORATE_MANAGEMENT policies
CREATE POLICY "Role-based select for corporate_management" ON public.corporate_management FOR SELECT
USING (
  public.has_role(auth.uid(), 'admin')
  OR public.has_entity_role(auth.uid(), 'corporate_management')
  OR public.can_view_record(auth.uid(), id, 'corporate_management')
);

CREATE POLICY "Role-based insert for corporate_management" ON public.corporate_management FOR INSERT
WITH CHECK (
  public.has_role(auth.uid(), 'admin')
  OR public.has_entity_role(auth.uid(), 'corporate_management')
);

CREATE POLICY "Role-based update for corporate_management" ON public.corporate_management FOR UPDATE
USING (
  public.has_role(auth.uid(), 'admin')
  OR public.has_entity_role(auth.uid(), 'corporate_management')
);

CREATE POLICY "Role-based delete for corporate_management" ON public.corporate_management FOR DELETE
USING (
  public.has_role(auth.uid(), 'admin')
  OR public.has_entity_role(auth.uid(), 'corporate_management')
);