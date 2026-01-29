// Email Rules System Types

export type RuleActionType = 
  | 'visibility'
  | 'tag'
  | 'extract_attachments'
  | 'extract_invoice'
  | 'move_folder'
  | 'mark_priority'
  | 'assign_object_type'
  | 'assign_entity';

export type EntityType = 'influencer' | 'reseller' | 'supplier' | 'corporate_management';

export type InvoiceStatus = 'pending' | 'reviewed' | 'approved' | 'rejected';

export interface EmailCategory {
  id: string;
  workspace_id: string;
  name: string;
  description: string | null;
  color: string;
  icon: string;
  is_active: boolean;
  sort_order: number;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface EmailRule {
  id: string;
  workspace_id: string;
  category_id: string;
  name: string;
  is_active: boolean;
  priority: number;
  created_by: string;
  created_at: string;
  updated_at: string;
  // Joined data
  category?: EmailCategory;
  actions?: EmailRuleAction[];
}

export interface EmailRuleAction {
  id: string;
  rule_id: string;
  action_type: RuleActionType;
  config: RuleActionConfig;
  is_active: boolean;
  created_at: string;
}

// Action-specific config types
export interface VisibilityActionConfig {
  visibility_group_id: string;
}

export interface TagActionConfig {
  tag_ids: string[];
}

export interface ExtractAttachmentsConfig {
  folder_pattern?: string;
  file_types?: string[];
}

export interface ExtractInvoiceConfig {
  auto_approve?: boolean;
}

export interface MoveFolderConfig {
  folder_id: string;
  folder_name?: string;
}

export interface MarkPriorityConfig {
  priority: 'high' | 'normal' | 'low';
}

export interface AssignObjectTypeConfig {
  object_type_ids: string[];
  assign_to_person: boolean;
  assign_to_email: boolean;
}

export interface AssignEntityConfig {
  entity_type: EntityType;
  create_if_not_exists: boolean;
}

export type RuleActionConfig = 
  | VisibilityActionConfig
  | TagActionConfig
  | ExtractAttachmentsConfig
  | ExtractInvoiceConfig
  | MoveFolderConfig
  | MarkPriorityConfig
  | AssignObjectTypeConfig
  | AssignEntityConfig
  | Record<string, unknown>;

export interface EmailTag {
  id: string;
  workspace_id: string;
  name: string;
  color: string;
  outlook_category: string | null;
  created_at: string;
}

export interface EmailMessageTag {
  id: string;
  email_id: string;
  tag_id: string;
  created_at: string;
  // Joined data
  tag?: EmailTag;
}

export interface EmailMessageCategory {
  id: string;
  email_id: string;
  category_id: string;
  confidence: number;
  processed_at: string;
  // Joined data
  category?: EmailCategory;
}

export interface EmailVisibilityGroup {
  id: string;
  workspace_id: string;
  name: string;
  description: string | null;
  created_at: string;
  // Joined data
  members?: EmailVisibilityGroupMember[];
  member_count?: number;
}

export interface EmailVisibilityGroupMember {
  id: string;
  group_id: string;
  user_id: string;
  created_at: string;
}

export interface ExtractedInvoice {
  id: string;
  workspace_id: string;
  email_id: string;
  vendor_name: string | null;
  invoice_number: string | null;
  amount: number | null;
  currency: string;
  due_date: string | null;
  raw_extraction: Record<string, unknown> | null;
  status: InvoiceStatus;
  created_at: string;
}

// Form types for creating/editing
export interface CreateEmailCategoryInput {
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  is_active?: boolean;
  sort_order?: number;
}

export interface UpdateEmailCategoryInput extends Partial<CreateEmailCategoryInput> {
  id: string;
}

export interface CreateEmailRuleInput {
  category_id: string;
  name: string;
  is_active?: boolean;
  priority?: number;
}

export interface UpdateEmailRuleInput extends Partial<CreateEmailRuleInput> {
  id: string;
}

export interface CreateEmailRuleActionInput {
  rule_id: string;
  action_type: RuleActionType;
  config: RuleActionConfig;
  is_active?: boolean;
}

export interface CreateEmailTagInput {
  name: string;
  color?: string;
  outlook_category?: string;
}

export interface UpdateEmailTagInput extends Partial<CreateEmailTagInput> {
  id: string;
}

export interface CreateVisibilityGroupInput {
  name: string;
  description?: string;
}

export interface UpdateVisibilityGroupInput extends Partial<CreateVisibilityGroupInput> {
  id: string;
}

// Classification result from AI
export interface ClassificationResult {
  category_id: string | null;
  category_name: string | null;
  confidence: number;
  reasoning?: string;
}

// Processing result
export interface EmailProcessingResult {
  email_id: string;
  classification: ClassificationResult;
  actions_applied: {
    action_type: RuleActionType;
    success: boolean;
    error?: string;
  }[];
}
