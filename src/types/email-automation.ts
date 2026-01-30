// Email Automation Types

export type EnrollmentStatus = 'active' | 'completed' | 'paused' | 'unsubscribed' | 'failed';
export type AutomationSendStatus = 'pending' | 'sent' | 'failed' | 'bounced';
export type TriggerType = 'entity_created' | 'entity_updated' | 'person_created' | 'person_linked' | 'email_classified' | 'manual';

// Entity types that can be targeted for automation
export const AUTOMATION_ENTITY_TABLES = [
  'people',
  'influencers',
  'resellers',
  'product_suppliers',
  'expense_suppliers',
  'corporate_management',
  'personal_contacts',
  'subscriptions',
  'marketing_sources',
  'merchant_accounts',
  'logistic_suppliers',
] as const;

export type AutomationEntityTable = typeof AUTOMATION_ENTITY_TABLES[number];

// Email Template
export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body_html: string;
  body_text: string | null;
  merge_fields: MergeField[];
  is_active: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface EmailTemplateInsert {
  name: string;
  subject: string;
  body_html: string;
  body_text?: string | null;
  merge_fields?: MergeField[];
  is_active?: boolean;
  created_by: string;
}

export interface EmailTemplateUpdate {
  name?: string;
  subject?: string;
  body_html?: string;
  body_text?: string | null;
  merge_fields?: MergeField[];
  is_active?: boolean;
}

// Merge Fields
export interface MergeField {
  token: string;
  label: string;
  category: 'person' | 'entity' | 'system';
}

export const DEFAULT_MERGE_FIELDS: MergeField[] = [
  // Person fields
  { token: '{{person.name}}', label: 'Person Name', category: 'person' },
  { token: '{{person.email}}', label: 'Person Email', category: 'person' },
  { token: '{{person.title}}', label: 'Person Title', category: 'person' },
  { token: '{{person.phone}}', label: 'Person Phone', category: 'person' },
  { token: '{{person.city}}', label: 'Person City', category: 'person' },
  // Entity fields
  { token: '{{entity.name}}', label: 'Entity Name', category: 'entity' },
  { token: '{{entity.email}}', label: 'Entity Email', category: 'entity' },
  { token: '{{entity.phone}}', label: 'Entity Phone', category: 'entity' },
  // System fields
  { token: '{{current_date}}', label: 'Current Date', category: 'system' },
  { token: '{{sender.name}}', label: 'Sender Name', category: 'system' },
  { token: '{{sender.email}}', label: 'Sender Email', category: 'system' },
];

// Email Sequence
export interface EmailSequence {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  entity_table: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  steps?: SequenceStep[];
  enrollment_count?: number;
}

export interface EmailSequenceInsert {
  name: string;
  description?: string | null;
  is_active?: boolean;
  entity_table?: string | null;
  created_by: string;
}

export interface EmailSequenceUpdate {
  name?: string;
  description?: string | null;
  is_active?: boolean;
  entity_table?: string | null;
}

// Sequence Step
export interface SequenceStep {
  id: string;
  sequence_id: string;
  step_order: number;
  template_id: string;
  delay_days: number;
  delay_hours: number;
  is_active: boolean;
  created_at: string;
  template?: EmailTemplate;
}

export interface SequenceStepInsert {
  sequence_id: string;
  step_order: number;
  template_id: string;
  delay_days?: number;
  delay_hours?: number;
  is_active?: boolean;
}

export interface SequenceStepUpdate {
  step_order?: number;
  template_id?: string;
  delay_days?: number;
  delay_hours?: number;
  is_active?: boolean;
}

// Sequence Enrollment
export interface SequenceEnrollment {
  id: string;
  sequence_id: string;
  contact_type: string;
  contact_id: string;
  contact_email: string;
  current_step: number;
  status: EnrollmentStatus;
  enrolled_at: string;
  next_send_at: string | null;
  completed_at: string | null;
  enrolled_by: string;
  sequence?: EmailSequence;
  contact_name?: string;
}

export interface SequenceEnrollmentInsert {
  sequence_id: string;
  contact_type: string;
  contact_id: string;
  contact_email: string;
  current_step?: number;
  status?: EnrollmentStatus;
  next_send_at?: string | null;
  enrolled_by: string;
}

export interface SequenceEnrollmentUpdate {
  current_step?: number;
  status?: EnrollmentStatus;
  next_send_at?: string | null;
  completed_at?: string | null;
}

// Email Trigger
export interface EmailTrigger {
  id: string;
  name: string;
  description: string | null;
  trigger_type: TriggerType;
  entity_table: string;
  conditions: TriggerCondition;
  template_id: string;
  delay_minutes: number;
  is_active: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
  template?: EmailTemplate;
}

export interface TriggerCondition {
  field?: string;
  operator?: 'equals' | 'not_equals' | 'contains' | 'not_contains' | 'is_empty' | 'is_not_empty';
  value?: string;
  and_conditions?: TriggerCondition[];
  or_conditions?: TriggerCondition[];
}

export interface EmailTriggerInsert {
  name: string;
  description?: string | null;
  trigger_type: TriggerType;
  entity_table: string;
  conditions?: TriggerCondition;
  template_id: string;
  delay_minutes?: number;
  is_active?: boolean;
  created_by: string;
}

export interface EmailTriggerUpdate {
  name?: string;
  description?: string | null;
  trigger_type?: TriggerType;
  entity_table?: string;
  conditions?: TriggerCondition;
  template_id?: string;
  delay_minutes?: number;
  is_active?: boolean;
}

// Automation Send Log
export interface AutomationSendLog {
  id: string;
  automation_type: 'sequence' | 'trigger';
  automation_id: string;
  enrollment_id: string | null;
  contact_type: string;
  contact_id: string;
  contact_email: string;
  template_id: string | null;
  subject: string;
  status: AutomationSendStatus;
  sent_at: string | null;
  error_message: string | null;
  microsoft_message_id: string | null;
  user_id: string;
  created_at: string;
}

// Helper function to format delay
export function formatDelay(days: number, hours: number): string {
  const parts: string[] = [];
  if (days > 0) {
    parts.push(`${days} day${days > 1 ? 's' : ''}`);
  }
  if (hours > 0) {
    parts.push(`${hours} hour${hours > 1 ? 's' : ''}`);
  }
  if (parts.length === 0) {
    return 'Immediately';
  }
  return parts.join(', ');
}

// Helper function to get entity display name
export function getEntityDisplayName(entityTable: string | null): string {
  if (!entityTable) return 'All Contacts';
  
  const displayNames: Record<string, string> = {
    people: 'People',
    influencers: 'Influencers',
    resellers: 'Resellers',
    product_suppliers: 'Product Suppliers',
    expense_suppliers: 'Expense Suppliers',
    corporate_management: 'Corporate Management',
    personal_contacts: 'Personal Contacts',
    subscriptions: 'Subscriptions',
    marketing_sources: 'Marketing Sources',
    merchant_accounts: 'Merchant Accounts',
    logistic_suppliers: 'Logistic Suppliers',
  };
  
  return displayNames[entityTable] || entityTable;
}

// Merge context for template resolution
export interface MergeContext {
  person?: {
    name?: string;
    email?: string;
    title?: string;
    phone?: string;
    city?: string;
  };
  entity?: {
    name?: string;
    email?: string;
    phone?: string;
  };
  sender?: {
    name?: string;
    email?: string;
  };
  current_date?: string;
}

// Helper to resolve merge fields in a template
export function resolveMergeFields(template: string, context: MergeContext): string {
  return template.replace(/\{\{(\w+)\.(\w+)\}\}/g, (match, entity, field) => {
    const entityContext = context[entity as keyof MergeContext];
    if (typeof entityContext === 'object' && entityContext !== null) {
      return (entityContext as Record<string, string | undefined>)[field] ?? match;
    }
    if (entity === 'current_date' && context.current_date) {
      return context.current_date;
    }
    return match;
  });
}
