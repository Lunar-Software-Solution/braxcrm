// Entity-Based Role Access Control Types

export interface EntityRole {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  entity_table: string;
  created_at: string;
}

export interface UserEntityRole {
  id: string;
  user_id: string;
  entity_role_id: string;
  assigned_by: string | null;
  assigned_at: string;
  entity_role?: EntityRole;
}

export interface PeopleEntity {
  id: string;
  person_id: string;
  entity_table: string;
  entity_id: string;
  created_at: string;
}

export interface RecordRoleAssignment {
  id: string;
  entity_role_id: string;
  record_id: string;
  table_name: string;
  assigned_by_rule_id: string | null;
  assigned_at: string;
}

// Map entity tables to their display names and routes
export const ENTITY_TABLE_CONFIG: Record<string, { displayName: string; route: string; color: string }> = {
  affiliates: { displayName: 'Affiliates', route: '/affiliates', color: '#ec4899' },
  vigile_partners: { displayName: 'Vigile Partners', route: '/vigile-partners', color: '#22c55e' },
  brax_distributors: { displayName: 'Brax Distributors', route: '/brax-distributors', color: '#7c3aed' },
  product_suppliers: { displayName: 'Product Suppliers', route: '/product-suppliers', color: '#3b82f6' },
  services_suppliers: { displayName: 'Services Suppliers', route: '/services-suppliers', color: '#f97316' },
  corporate_management: { displayName: 'Corporate Management', route: '/corporate-management', color: '#0891b2' },
  personal_contacts: { displayName: 'Personal Contacts', route: '/personal-contacts', color: '#8b5cf6' },
  subscriptions: { displayName: 'Subscriptions', route: '/subscriptions', color: '#f59e0b' },
  marketing_sources: { displayName: 'Marketing Sources', route: '/marketing-sources', color: '#64748b' },
  merchant_accounts: { displayName: 'Merchant Accounts', route: '/merchant-accounts', color: '#10b981' },
  logistic_suppliers: { displayName: 'Logistic Suppliers', route: '/logistic-suppliers', color: '#06b6d4' },
};
