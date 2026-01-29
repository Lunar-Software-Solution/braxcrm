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
  influencers: { displayName: 'Influencers', route: '/influencers', color: '#ec4899' },
  resellers: { displayName: 'Resellers', route: '/resellers', color: '#22c55e' },
  suppliers: { displayName: 'Suppliers', route: '/suppliers', color: '#3b82f6' },
  corporate_management: { displayName: 'Corporate Management', route: '/corporate-management', color: '#0891b2' },
  personal_contacts: { displayName: 'Personal Contacts', route: '/personal-contacts', color: '#8b5cf6' },
};
