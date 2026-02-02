// Types for Notes, Tasks, and Opportunities

export type EntityTable = 
  | 'people'
  | 'affiliates'
  | 'vigile_partners'
  | 'brax_distributors'
  | 'product_suppliers'
  | 'services_suppliers'
  | 'corporate_management'
  | 'personal_contacts'
  | 'subscription_suppliers'
  | 'marketing_sources'
  | 'merchant_accounts'
  | 'logistic_suppliers';

export interface LinkableEntity {
  entity_table: EntityTable;
  entity_id: string;
}

// Notes
export interface Note {
  id: string;
  title: string | null;
  content: string;
  entity_table: EntityTable;
  entity_id: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface NoteInsert {
  title?: string | null;
  content: string;
  entity_table: EntityTable;
  entity_id: string;
  created_by: string;
}

export interface NoteUpdate {
  title?: string | null;
  content?: string;
}

// Tasks
export type TaskStatus = 'todo' | 'in_progress' | 'completed' | 'cancelled';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface Task {
  id: string;
  title: string;
  description: string | null;
  entity_table: EntityTable;
  entity_id: string;
  status: TaskStatus;
  priority: TaskPriority;
  due_date: string | null;
  assigned_to: string | null;
  created_by: string;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  assigned_user?: {
    display_name: string | null;
    email: string | null;
    avatar_url: string | null;
  };
}

export interface TaskInsert {
  title: string;
  description?: string | null;
  entity_table: EntityTable;
  entity_id: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  due_date?: string | null;
  assigned_to?: string | null;
  created_by: string;
}

export interface TaskUpdate {
  title?: string;
  description?: string | null;
  status?: TaskStatus;
  priority?: TaskPriority;
  due_date?: string | null;
  assigned_to?: string | null;
  completed_at?: string | null;
}

// Opportunities
export type OpportunityStage = 'lead' | 'qualified' | 'proposal' | 'negotiation' | 'won' | 'lost';

export interface Opportunity {
  id: string;
  name: string;
  description: string | null;
  entity_table: EntityTable;
  entity_id: string;
  stage: OpportunityStage;
  value: number | null;
  currency: string;
  probability: number | null;
  expected_close_date: string | null;
  closed_at: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface OpportunityInsert {
  name: string;
  description?: string | null;
  entity_table: EntityTable;
  entity_id: string;
  stage?: OpportunityStage;
  value?: number | null;
  currency?: string;
  probability?: number | null;
  expected_close_date?: string | null;
  created_by: string;
}

export interface OpportunityUpdate {
  name?: string;
  description?: string | null;
  stage?: OpportunityStage;
  value?: number | null;
  currency?: string;
  probability?: number | null;
  expected_close_date?: string | null;
  closed_at?: string | null;
}

// Helper to get display name for entity table
export const entityTableLabels: Record<EntityTable, string> = {
  people: 'People',
  affiliates: 'Affiliates',
  vigile_partners: 'Vigile Partners',
  brax_distributors: 'Brax Distributors',
  product_suppliers: 'Product Suppliers',
  services_suppliers: 'Services Suppliers',
  corporate_management: 'Corporate Management',
  personal_contacts: 'Personal Contacts',
  subscription_suppliers: 'Subscription Suppliers',
  marketing_sources: 'Marketing Sources',
  merchant_accounts: 'Merchant Accounts',
  logistic_suppliers: 'Logistic Suppliers',
};

export const taskStatusLabels: Record<TaskStatus, string> = {
  todo: 'To Do',
  in_progress: 'In Progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

export const taskPriorityLabels: Record<TaskPriority, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  urgent: 'Urgent',
};

export const opportunityStageLabels: Record<OpportunityStage, string> = {
  lead: 'Lead',
  qualified: 'Qualified',
  proposal: 'Proposal',
  negotiation: 'Negotiation',
  won: 'Won',
  lost: 'Lost',
};
