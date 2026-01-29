-- =============================================
-- PHASE 3: Drop ALL workspace-dependent policies FIRST
-- =============================================

-- Drop policies for PEOPLE (these depend on workspace_id)
DROP POLICY IF EXISTS "Team members can view people in their workspace" ON public.people;
DROP POLICY IF EXISTS "Team members can create people" ON public.people;
DROP POLICY IF EXISTS "Team members can update people in their workspace" ON public.people;
DROP POLICY IF EXISTS "Team members can delete people in their workspace" ON public.people;

-- Drop policies for PERSON_OBJECT_TYPES (these depend on people.workspace_id)
DROP POLICY IF EXISTS "Team members can view person object types" ON public.person_object_types;
DROP POLICY IF EXISTS "Team members can create person object types" ON public.person_object_types;
DROP POLICY IF EXISTS "Team members can delete person object types" ON public.person_object_types;

-- Drop policies for EMAIL_MESSAGES
DROP POLICY IF EXISTS "Team members can view emails in their workspace" ON public.email_messages;
DROP POLICY IF EXISTS "Team members can create emails" ON public.email_messages;
DROP POLICY IF EXISTS "Team members can update emails in their workspace" ON public.email_messages;
DROP POLICY IF EXISTS "Team members can delete emails in their workspace" ON public.email_messages;

-- Drop policies for EMAIL_CATEGORIES
DROP POLICY IF EXISTS "Team members can view categories in their workspace" ON public.email_categories;
DROP POLICY IF EXISTS "Team members can create categories" ON public.email_categories;
DROP POLICY IF EXISTS "Team members can update categories in their workspace" ON public.email_categories;
DROP POLICY IF EXISTS "Team members can delete categories in their workspace" ON public.email_categories;

-- Drop policies for EMAIL_RULES
DROP POLICY IF EXISTS "Team members can view rules in their workspace" ON public.email_rules;
DROP POLICY IF EXISTS "Team members can create rules" ON public.email_rules;
DROP POLICY IF EXISTS "Team members can update rules in their workspace" ON public.email_rules;
DROP POLICY IF EXISTS "Team members can delete rules in their workspace" ON public.email_rules;

-- Drop policies for EMAIL_TAGS
DROP POLICY IF EXISTS "Team members can view tags in their workspace" ON public.email_tags;
DROP POLICY IF EXISTS "Team members can create tags" ON public.email_tags;
DROP POLICY IF EXISTS "Team members can update tags in their workspace" ON public.email_tags;
DROP POLICY IF EXISTS "Team members can delete tags in their workspace" ON public.email_tags;

-- Drop policies for EMAIL_VISIBILITY_GROUPS
DROP POLICY IF EXISTS "Team members can view visibility groups in their workspace" ON public.email_visibility_groups;
DROP POLICY IF EXISTS "Team members can create visibility groups" ON public.email_visibility_groups;
DROP POLICY IF EXISTS "Team members can update visibility groups in their workspace" ON public.email_visibility_groups;
DROP POLICY IF EXISTS "Team members can delete visibility groups in their workspace" ON public.email_visibility_groups;

-- Drop policies for EMAIL_VISIBILITY_GROUP_MEMBERS (depends on visibility groups)
DROP POLICY IF EXISTS "Team members can view group members" ON public.email_visibility_group_members;
DROP POLICY IF EXISTS "Team members can manage group members" ON public.email_visibility_group_members;
DROP POLICY IF EXISTS "Team members can delete group members" ON public.email_visibility_group_members;

-- Drop policies for OBJECT_TYPES
DROP POLICY IF EXISTS "Team members can view object types in their workspace" ON public.object_types;
DROP POLICY IF EXISTS "Team members can create object types" ON public.object_types;
DROP POLICY IF EXISTS "Team members can update object types in their workspace" ON public.object_types;
DROP POLICY IF EXISTS "Team members can delete object types in their workspace" ON public.object_types;

-- Drop policies for EXTRACTED_INVOICES
DROP POLICY IF EXISTS "Team members can view invoices in their workspace" ON public.extracted_invoices;
DROP POLICY IF EXISTS "Team members can create invoices" ON public.extracted_invoices;
DROP POLICY IF EXISTS "Team members can update invoices in their workspace" ON public.extracted_invoices;
DROP POLICY IF EXISTS "Team members can delete invoices in their workspace" ON public.extracted_invoices;

-- Drop policies for EMAIL_MESSAGE_CATEGORIES (depends on email_messages.workspace_id)
DROP POLICY IF EXISTS "Team members can view message categories" ON public.email_message_categories;
DROP POLICY IF EXISTS "Team members can create message categories" ON public.email_message_categories;
DROP POLICY IF EXISTS "Team members can update message categories" ON public.email_message_categories;
DROP POLICY IF EXISTS "Team members can delete message categories" ON public.email_message_categories;

-- Drop policies for EMAIL_MESSAGE_TAGS (depends on email_messages.workspace_id)
DROP POLICY IF EXISTS "Team members can view message tags" ON public.email_message_tags;
DROP POLICY IF EXISTS "Team members can create message tags" ON public.email_message_tags;
DROP POLICY IF EXISTS "Team members can delete message tags" ON public.email_message_tags;

-- Drop policies for EMAIL_OBJECT_TYPES (depends on email_messages.workspace_id)
DROP POLICY IF EXISTS "Team members can view email object types" ON public.email_object_types;
DROP POLICY IF EXISTS "Team members can create email object types" ON public.email_object_types;
DROP POLICY IF EXISTS "Team members can delete email object types" ON public.email_object_types;

-- Drop policies for EMAIL_RULE_ACTIONS (depends on email_rules.workspace_id)
DROP POLICY IF EXISTS "Team members can view rule actions" ON public.email_rule_actions;
DROP POLICY IF EXISTS "Team members can create rule actions" ON public.email_rule_actions;
DROP POLICY IF EXISTS "Team members can update rule actions" ON public.email_rule_actions;
DROP POLICY IF EXISTS "Team members can delete rule actions" ON public.email_rule_actions;

-- Drop policies for EMAIL_INFLUENCERS (depends on email_messages.workspace_id)
DROP POLICY IF EXISTS "Team members can view email influencers" ON public.email_influencers;
DROP POLICY IF EXISTS "Team members can create email influencers" ON public.email_influencers;
DROP POLICY IF EXISTS "Team members can delete email influencers" ON public.email_influencers;

-- Drop policies for EMAIL_RESELLERS (depends on email_messages.workspace_id)
DROP POLICY IF EXISTS "Team members can view email resellers" ON public.email_resellers;
DROP POLICY IF EXISTS "Team members can create email resellers" ON public.email_resellers;
DROP POLICY IF EXISTS "Team members can delete email resellers" ON public.email_resellers;

-- Drop policies for EMAIL_SUPPLIERS (depends on email_messages.workspace_id)
DROP POLICY IF EXISTS "Team members can view email suppliers" ON public.email_suppliers;
DROP POLICY IF EXISTS "Team members can create email suppliers" ON public.email_suppliers;
DROP POLICY IF EXISTS "Team members can delete email suppliers" ON public.email_suppliers;

-- Drop policies for EMAIL_CORPORATE_MANAGEMENT (depends on email_messages.workspace_id)
DROP POLICY IF EXISTS "Team members can view email_corporate_management" ON public.email_corporate_management;
DROP POLICY IF EXISTS "Team members can create email_corporate_management" ON public.email_corporate_management;
DROP POLICY IF EXISTS "Team members can delete email_corporate_management" ON public.email_corporate_management;

-- =============================================
-- Now add missing ownership columns
-- =============================================
ALTER TABLE public.email_tags ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id);
ALTER TABLE public.email_visibility_groups ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id);
ALTER TABLE public.email_messages ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id);
ALTER TABLE public.extracted_invoices ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id);

-- =============================================
-- Now drop workspace_id columns
-- =============================================
ALTER TABLE public.people DROP COLUMN IF EXISTS workspace_id;
ALTER TABLE public.email_messages DROP COLUMN IF EXISTS workspace_id;
ALTER TABLE public.email_categories DROP COLUMN IF EXISTS workspace_id;
ALTER TABLE public.email_rules DROP COLUMN IF EXISTS workspace_id;
ALTER TABLE public.email_tags DROP COLUMN IF EXISTS workspace_id;
ALTER TABLE public.email_visibility_groups DROP COLUMN IF EXISTS workspace_id;
ALTER TABLE public.object_types DROP COLUMN IF EXISTS workspace_id;
ALTER TABLE public.extracted_invoices DROP COLUMN IF EXISTS workspace_id;

-- =============================================
-- Create new role-based RLS policies
-- =============================================

-- PEOPLE policies
CREATE POLICY "Role-based select for people" ON public.people FOR SELECT
USING (
  public.has_role(auth.uid(), 'admin')
  OR public.can_view_person_via_entity(auth.uid(), id)
  OR public.can_view_record(auth.uid(), id, 'people')
  OR created_by = auth.uid()
);

CREATE POLICY "Role-based insert for people" ON public.people FOR INSERT
WITH CHECK (
  public.has_role(auth.uid(), 'admin')
  OR created_by = auth.uid()
);

CREATE POLICY "Role-based update for people" ON public.people FOR UPDATE
USING (
  public.has_role(auth.uid(), 'admin')
  OR created_by = auth.uid()
);

CREATE POLICY "Role-based delete for people" ON public.people FOR DELETE
USING (
  public.has_role(auth.uid(), 'admin')
  OR created_by = auth.uid()
);

-- PERSON_OBJECT_TYPES policies
CREATE POLICY "Role-based select for person_object_types" ON public.person_object_types FOR SELECT
USING (
  public.has_role(auth.uid(), 'admin')
  OR EXISTS (
    SELECT 1 FROM people p 
    WHERE p.id = person_object_types.person_id 
    AND (p.created_by = auth.uid() OR public.can_view_person_via_entity(auth.uid(), p.id))
  )
);

CREATE POLICY "Role-based insert for person_object_types" ON public.person_object_types FOR INSERT
WITH CHECK (
  public.has_role(auth.uid(), 'admin')
  OR EXISTS (SELECT 1 FROM people p WHERE p.id = person_object_types.person_id AND p.created_by = auth.uid())
);

CREATE POLICY "Role-based delete for person_object_types" ON public.person_object_types FOR DELETE
USING (
  public.has_role(auth.uid(), 'admin')
  OR EXISTS (SELECT 1 FROM people p WHERE p.id = person_object_types.person_id AND p.created_by = auth.uid())
);

-- EMAIL_MESSAGES policies
CREATE POLICY "Role-based select for email_messages" ON public.email_messages FOR SELECT
USING (
  public.has_role(auth.uid(), 'admin')
  OR user_id = auth.uid()
  OR public.can_view_record(auth.uid(), id, 'email_messages')
);

CREATE POLICY "Role-based insert for email_messages" ON public.email_messages FOR INSERT
WITH CHECK (
  public.has_role(auth.uid(), 'admin')
  OR user_id = auth.uid()
);

CREATE POLICY "Role-based update for email_messages" ON public.email_messages FOR UPDATE
USING (
  public.has_role(auth.uid(), 'admin')
  OR user_id = auth.uid()
);

CREATE POLICY "Role-based delete for email_messages" ON public.email_messages FOR DELETE
USING (
  public.has_role(auth.uid(), 'admin')
  OR user_id = auth.uid()
);

-- EMAIL_CATEGORIES policies (shared, admin-managed)
CREATE POLICY "Authenticated can view email_categories" ON public.email_categories FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can insert email_categories" ON public.email_categories FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update email_categories" ON public.email_categories FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete email_categories" ON public.email_categories FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));

-- EMAIL_RULES policies (shared, admin-managed)
CREATE POLICY "Authenticated can view email_rules" ON public.email_rules FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can insert email_rules" ON public.email_rules FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update email_rules" ON public.email_rules FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete email_rules" ON public.email_rules FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));

-- EMAIL_TAGS policies (shared, admin-managed)
CREATE POLICY "Authenticated can view email_tags" ON public.email_tags FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can insert email_tags" ON public.email_tags FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update email_tags" ON public.email_tags FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete email_tags" ON public.email_tags FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));

-- EMAIL_VISIBILITY_GROUPS policies (shared, admin-managed)
CREATE POLICY "Authenticated can view email_visibility_groups" ON public.email_visibility_groups FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can insert email_visibility_groups" ON public.email_visibility_groups FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update email_visibility_groups" ON public.email_visibility_groups FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete email_visibility_groups" ON public.email_visibility_groups FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));

-- EMAIL_VISIBILITY_GROUP_MEMBERS policies
CREATE POLICY "Authenticated can view email_visibility_group_members" ON public.email_visibility_group_members FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can insert email_visibility_group_members" ON public.email_visibility_group_members FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete email_visibility_group_members" ON public.email_visibility_group_members FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));

-- OBJECT_TYPES policies (shared, admin-managed)
CREATE POLICY "Authenticated can view object_types" ON public.object_types FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can insert object_types" ON public.object_types FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update object_types" ON public.object_types FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete object_types" ON public.object_types FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));

-- EXTRACTED_INVOICES policies
CREATE POLICY "Role-based select for extracted_invoices" ON public.extracted_invoices FOR SELECT
USING (public.has_role(auth.uid(), 'admin') OR user_id = auth.uid());

CREATE POLICY "Role-based insert for extracted_invoices" ON public.extracted_invoices FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin') OR user_id = auth.uid());

CREATE POLICY "Role-based update for extracted_invoices" ON public.extracted_invoices FOR UPDATE
USING (public.has_role(auth.uid(), 'admin') OR user_id = auth.uid());

CREATE POLICY "Role-based delete for extracted_invoices" ON public.extracted_invoices FOR DELETE
USING (public.has_role(auth.uid(), 'admin') OR user_id = auth.uid());

-- EMAIL_MESSAGE_CATEGORIES policies
CREATE POLICY "Role-based select for email_message_categories" ON public.email_message_categories FOR SELECT
USING (
  public.has_role(auth.uid(), 'admin')
  OR EXISTS (SELECT 1 FROM email_messages e WHERE e.id = email_message_categories.email_id AND e.user_id = auth.uid())
);

CREATE POLICY "Role-based insert for email_message_categories" ON public.email_message_categories FOR INSERT
WITH CHECK (
  public.has_role(auth.uid(), 'admin')
  OR EXISTS (SELECT 1 FROM email_messages e WHERE e.id = email_message_categories.email_id AND e.user_id = auth.uid())
);

CREATE POLICY "Role-based update for email_message_categories" ON public.email_message_categories FOR UPDATE
USING (
  public.has_role(auth.uid(), 'admin')
  OR EXISTS (SELECT 1 FROM email_messages e WHERE e.id = email_message_categories.email_id AND e.user_id = auth.uid())
);

CREATE POLICY "Role-based delete for email_message_categories" ON public.email_message_categories FOR DELETE
USING (
  public.has_role(auth.uid(), 'admin')
  OR EXISTS (SELECT 1 FROM email_messages e WHERE e.id = email_message_categories.email_id AND e.user_id = auth.uid())
);

-- EMAIL_MESSAGE_TAGS policies
CREATE POLICY "Role-based select for email_message_tags" ON public.email_message_tags FOR SELECT
USING (
  public.has_role(auth.uid(), 'admin')
  OR EXISTS (SELECT 1 FROM email_messages e WHERE e.id = email_message_tags.email_id AND e.user_id = auth.uid())
);

CREATE POLICY "Role-based insert for email_message_tags" ON public.email_message_tags FOR INSERT
WITH CHECK (
  public.has_role(auth.uid(), 'admin')
  OR EXISTS (SELECT 1 FROM email_messages e WHERE e.id = email_message_tags.email_id AND e.user_id = auth.uid())
);

CREATE POLICY "Role-based delete for email_message_tags" ON public.email_message_tags FOR DELETE
USING (
  public.has_role(auth.uid(), 'admin')
  OR EXISTS (SELECT 1 FROM email_messages e WHERE e.id = email_message_tags.email_id AND e.user_id = auth.uid())
);

-- EMAIL_OBJECT_TYPES policies
CREATE POLICY "Role-based select for email_object_types" ON public.email_object_types FOR SELECT
USING (
  public.has_role(auth.uid(), 'admin')
  OR EXISTS (SELECT 1 FROM email_messages e WHERE e.id = email_object_types.email_id AND e.user_id = auth.uid())
);

CREATE POLICY "Role-based insert for email_object_types" ON public.email_object_types FOR INSERT
WITH CHECK (
  public.has_role(auth.uid(), 'admin')
  OR EXISTS (SELECT 1 FROM email_messages e WHERE e.id = email_object_types.email_id AND e.user_id = auth.uid())
);

CREATE POLICY "Role-based delete for email_object_types" ON public.email_object_types FOR DELETE
USING (
  public.has_role(auth.uid(), 'admin')
  OR EXISTS (SELECT 1 FROM email_messages e WHERE e.id = email_object_types.email_id AND e.user_id = auth.uid())
);

-- EMAIL_RULE_ACTIONS policies (admin-managed)
CREATE POLICY "Authenticated can view email_rule_actions" ON public.email_rule_actions FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can insert email_rule_actions" ON public.email_rule_actions FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update email_rule_actions" ON public.email_rule_actions FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete email_rule_actions" ON public.email_rule_actions FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));

-- EMAIL_INFLUENCERS policies
CREATE POLICY "Role-based select for email_influencers" ON public.email_influencers FOR SELECT
USING (
  public.has_role(auth.uid(), 'admin')
  OR public.has_entity_role(auth.uid(), 'influencers')
  OR EXISTS (SELECT 1 FROM email_messages e WHERE e.id = email_influencers.email_id AND e.user_id = auth.uid())
);

CREATE POLICY "Role-based insert for email_influencers" ON public.email_influencers FOR INSERT
WITH CHECK (
  public.has_role(auth.uid(), 'admin')
  OR public.has_entity_role(auth.uid(), 'influencers')
);

CREATE POLICY "Role-based delete for email_influencers" ON public.email_influencers FOR DELETE
USING (
  public.has_role(auth.uid(), 'admin')
  OR public.has_entity_role(auth.uid(), 'influencers')
);

-- EMAIL_RESELLERS policies
CREATE POLICY "Role-based select for email_resellers" ON public.email_resellers FOR SELECT
USING (
  public.has_role(auth.uid(), 'admin')
  OR public.has_entity_role(auth.uid(), 'resellers')
  OR EXISTS (SELECT 1 FROM email_messages e WHERE e.id = email_resellers.email_id AND e.user_id = auth.uid())
);

CREATE POLICY "Role-based insert for email_resellers" ON public.email_resellers FOR INSERT
WITH CHECK (
  public.has_role(auth.uid(), 'admin')
  OR public.has_entity_role(auth.uid(), 'resellers')
);

CREATE POLICY "Role-based delete for email_resellers" ON public.email_resellers FOR DELETE
USING (
  public.has_role(auth.uid(), 'admin')
  OR public.has_entity_role(auth.uid(), 'resellers')
);

-- EMAIL_SUPPLIERS policies
CREATE POLICY "Role-based select for email_suppliers" ON public.email_suppliers FOR SELECT
USING (
  public.has_role(auth.uid(), 'admin')
  OR public.has_entity_role(auth.uid(), 'suppliers')
  OR EXISTS (SELECT 1 FROM email_messages e WHERE e.id = email_suppliers.email_id AND e.user_id = auth.uid())
);

CREATE POLICY "Role-based insert for email_suppliers" ON public.email_suppliers FOR INSERT
WITH CHECK (
  public.has_role(auth.uid(), 'admin')
  OR public.has_entity_role(auth.uid(), 'suppliers')
);

CREATE POLICY "Role-based delete for email_suppliers" ON public.email_suppliers FOR DELETE
USING (
  public.has_role(auth.uid(), 'admin')
  OR public.has_entity_role(auth.uid(), 'suppliers')
);

-- EMAIL_CORPORATE_MANAGEMENT policies
CREATE POLICY "Role-based select for email_corporate_management" ON public.email_corporate_management FOR SELECT
USING (
  public.has_role(auth.uid(), 'admin')
  OR public.has_entity_role(auth.uid(), 'corporate_management')
  OR EXISTS (SELECT 1 FROM email_messages e WHERE e.id = email_corporate_management.email_id AND e.user_id = auth.uid())
);

CREATE POLICY "Role-based insert for email_corporate_management" ON public.email_corporate_management FOR INSERT
WITH CHECK (
  public.has_role(auth.uid(), 'admin')
  OR public.has_entity_role(auth.uid(), 'corporate_management')
);

CREATE POLICY "Role-based delete for email_corporate_management" ON public.email_corporate_management FOR DELETE
USING (
  public.has_role(auth.uid(), 'admin')
  OR public.has_entity_role(auth.uid(), 'corporate_management')
);

-- =============================================
-- Drop workspace tables and function
-- =============================================
DROP TABLE IF EXISTS public.workspace_settings CASCADE;
DROP TABLE IF EXISTS public.team_members CASCADE;
DROP TABLE IF EXISTS public.workspaces CASCADE;
DROP FUNCTION IF EXISTS public.is_workspace_member CASCADE;

-- =============================================
-- Add assign_role action type
-- =============================================
ALTER TYPE public.rule_action_type ADD VALUE IF NOT EXISTS 'assign_role';