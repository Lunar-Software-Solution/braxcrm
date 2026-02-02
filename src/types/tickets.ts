import type { EntityTable } from './activities';

export type TicketPriority = 'low' | 'medium' | 'high' | 'urgent';
export type TicketStatus = 'open' | 'in_progress' | 'waiting' | 'resolved' | 'closed';

export const ticketStatusLabels: Record<TicketStatus, string> = {
  open: 'Open',
  in_progress: 'In Progress',
  waiting: 'Waiting',
  resolved: 'Resolved',
  closed: 'Closed',
};

export const ticketStatusColors: Record<TicketStatus, string> = {
  open: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  in_progress: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
  waiting: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
  resolved: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  closed: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300',
};

export const ticketPriorityLabels: Record<TicketPriority, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  urgent: 'Urgent',
};

export const ticketPriorityColors: Record<TicketPriority, string> = {
  low: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  medium: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  high: 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300',
  urgent: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
};

export const ticketTypesByEntity: Record<EntityTable, string[]> = {
  people: ['Follow-up Required', 'Data Update', 'Communication Issue'],
  logistic_suppliers: ['Shipping Exception', 'Delivery Issue', 'Customs Hold', 'Carrier Dispute'],
  merchant_accounts: ['Manual Processing', 'Chargeback Review', 'Account Update', 'Compliance Action'],
  subscription_suppliers: ['New Subscription Setup', 'Renewal Request', 'Cancellation', 'Plan Change'],
  services_suppliers: ['Service Request', 'Expense Approval', 'Contract Review', 'Vendor Onboarding'],
  product_suppliers: ['Order Issue', 'Quality Dispute', 'Return Request', 'Price Adjustment'],
  affiliates: ['Commission Dispute', 'Payment Issue', 'Link Problem', 'Agreement Update'],
  vigile_partners: ['New Partner Onboarding', 'Certification Update', 'Compliance Issue', 'Training Request', 'Audit Follow-up'],
  brax_distributors: ['New Distributor Onboarding', 'Inventory Issue', 'Pricing Dispute', 'Territory Conflict', 'Performance Review'],
  corporate_management: ['Legal Request', 'Compliance Filing', 'Document Request', 'Approval Escalation'],
  personal_contacts: ['Follow-up Required', 'Introduction Request', 'Reference Check', 'Event Coordination'],
  marketing_sources: ['Campaign Issue', 'Attribution Dispute', 'Budget Approval', 'Creative Request'],
};

export const allStatuses: TicketStatus[] = ['open', 'in_progress', 'waiting', 'resolved', 'closed'];
export const allPriorities: TicketPriority[] = ['low', 'medium', 'high', 'urgent'];

export interface Ticket {
  id: string;
  ticket_number: string;
  title: string;
  description: string | null;
  entity_table: string;
  entity_id: string;
  ticket_type: string;
  priority: TicketPriority;
  status: TicketStatus;
  assigned_to: string | null;
  due_date: string | null;
  resolved_at: string | null;
  resolution_notes: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface TicketWithDetails extends Ticket {
  assigned_user?: {
    display_name: string | null;
    email: string | null;
  } | null;
  entity_name?: string;
}

export interface TicketInsert {
  title: string;
  description?: string | null;
  entity_table: string;
  entity_id: string;
  ticket_type: string;
  priority?: TicketPriority;
  status?: TicketStatus;
  assigned_to?: string | null;
  due_date?: string | null;
  created_by: string;
}

export interface TicketUpdate {
  title?: string;
  description?: string | null;
  ticket_type?: string;
  priority?: TicketPriority;
  status?: TicketStatus;
  assigned_to?: string | null;
  due_date?: string | null;
  resolved_at?: string | null;
  resolution_notes?: string | null;
}
