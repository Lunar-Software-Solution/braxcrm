-- =============================================
-- PHASE 1: Entity-Based Role Access Control
-- =============================================

-- 1.1 Entity Roles Table (predefined roles matching entity types)
CREATE TABLE public.entity_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  slug text NOT NULL UNIQUE,
  description text,
  entity_table text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Insert system roles
INSERT INTO public.entity_roles (name, slug, entity_table, description) VALUES
  ('Influencer Manager', 'influencer_manager', 'influencers', 'Full access to Influencers and linked People'),
  ('Reseller Manager', 'reseller_manager', 'resellers', 'Full access to Resellers and linked People'),
  ('Supplier Manager', 'supplier_manager', 'suppliers', 'Full access to Suppliers and linked People'),
  ('Corporate Manager', 'corporate_manager', 'corporate_management', 'Full access to Corporate Management and linked People');

-- Enable RLS
ALTER TABLE public.entity_roles ENABLE ROW LEVEL SECURITY;

-- RLS: All authenticated users can view entity roles
CREATE POLICY "Authenticated users can view entity roles"
  ON public.entity_roles FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- RLS: Only admins can manage entity roles
CREATE POLICY "Admins can manage entity roles"
  ON public.entity_roles FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- 1.2 User Entity Roles Table (assigns entity roles to users)
CREATE TABLE public.user_entity_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entity_role_id uuid NOT NULL REFERENCES public.entity_roles(id) ON DELETE CASCADE,
  assigned_by uuid REFERENCES auth.users(id),
  assigned_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, entity_role_id)
);

-- Enable RLS
ALTER TABLE public.user_entity_roles ENABLE ROW LEVEL SECURITY;

-- RLS: Users can view their own role assignments
CREATE POLICY "Users can view own role assignments"
  ON public.user_entity_roles FOR SELECT
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- RLS: Only admins can manage role assignments
CREATE POLICY "Admins can manage role assignments"
  ON public.user_entity_roles FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- 1.3 People-Entities Junction Table (links People to Entity records)
CREATE TABLE public.people_entities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id uuid NOT NULL REFERENCES public.people(id) ON DELETE CASCADE,
  entity_table text NOT NULL,
  entity_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(person_id, entity_table, entity_id)
);

-- Enable RLS
ALTER TABLE public.people_entities ENABLE ROW LEVEL SECURITY;

-- 1.4 Record Role Assignments Table (for email rules to assign specific records to roles)
CREATE TABLE public.record_role_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_role_id uuid NOT NULL REFERENCES public.entity_roles(id) ON DELETE CASCADE,
  record_id uuid NOT NULL,
  table_name text NOT NULL,
  assigned_by_rule_id uuid REFERENCES public.email_rules(id) ON DELETE SET NULL,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(entity_role_id, record_id, table_name)
);

-- Enable RLS
ALTER TABLE public.record_role_assignments ENABLE ROW LEVEL SECURITY;

-- =============================================
-- PHASE 2: Security Helper Functions
-- =============================================

-- 2.1 Check if user has a specific entity role
CREATE OR REPLACE FUNCTION public.has_entity_role(
  _user_id uuid, 
  _entity_table text
) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_entity_roles uer
    JOIN entity_roles er ON er.id = uer.entity_role_id
    WHERE uer.user_id = _user_id
    AND er.entity_table = _entity_table
  )
$$;

-- 2.2 Check if user can view a specific record via role assignment
CREATE OR REPLACE FUNCTION public.can_view_record(
  _user_id uuid,
  _record_id uuid,
  _table_name text
) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM record_role_assignments rra
    JOIN user_entity_roles uer ON uer.entity_role_id = rra.entity_role_id
    WHERE uer.user_id = _user_id
    AND rra.record_id = _record_id
    AND rra.table_name = _table_name
  )
$$;

-- 2.3 Check if user can view a person via entity link
CREATE OR REPLACE FUNCTION public.can_view_person_via_entity(
  _user_id uuid,
  _person_id uuid
) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM people_entities pe
    JOIN entity_roles er ON er.entity_table = pe.entity_table
    JOIN user_entity_roles uer ON uer.entity_role_id = er.id
    WHERE uer.user_id = _user_id
    AND pe.person_id = _person_id
  )
$$;

-- =============================================
-- RLS Policies for Junction Tables
-- =============================================

-- People-Entities: View if admin, has entity role, or created the person
CREATE POLICY "View people_entities based on role"
  ON public.people_entities FOR SELECT
  USING (
    public.has_role(auth.uid(), 'admin')
    OR EXISTS (
      SELECT 1 FROM entity_roles er
      JOIN user_entity_roles uer ON uer.entity_role_id = er.id
      WHERE uer.user_id = auth.uid()
      AND er.entity_table = people_entities.entity_table
    )
  );

-- People-Entities: Insert if admin or has entity role
CREATE POLICY "Insert people_entities based on role"
  ON public.people_entities FOR INSERT
  WITH CHECK (
    public.has_role(auth.uid(), 'admin')
    OR EXISTS (
      SELECT 1 FROM entity_roles er
      JOIN user_entity_roles uer ON uer.entity_role_id = er.id
      WHERE uer.user_id = auth.uid()
      AND er.entity_table = people_entities.entity_table
    )
  );

-- People-Entities: Delete if admin or has entity role
CREATE POLICY "Delete people_entities based on role"
  ON public.people_entities FOR DELETE
  USING (
    public.has_role(auth.uid(), 'admin')
    OR EXISTS (
      SELECT 1 FROM entity_roles er
      JOIN user_entity_roles uer ON uer.entity_role_id = er.id
      WHERE uer.user_id = auth.uid()
      AND er.entity_table = people_entities.entity_table
    )
  );

-- Record Role Assignments: View own assignments or admin
CREATE POLICY "View record_role_assignments"
  ON public.record_role_assignments FOR SELECT
  USING (
    public.has_role(auth.uid(), 'admin')
    OR EXISTS (
      SELECT 1 FROM user_entity_roles uer
      WHERE uer.user_id = auth.uid()
      AND uer.entity_role_id = record_role_assignments.entity_role_id
    )
  );

-- Record Role Assignments: Admin can manage
CREATE POLICY "Admins manage record_role_assignments"
  ON public.record_role_assignments FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));