// CRM types for People, Object Types, and Email tracking

export interface ObjectType {
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

export interface PersonObjectType {
  id: string;
  person_id: string;
  object_type_id: string;
  assigned_by: string | null;
  assigned_at: string;
  source: 'manual' | 'email_rule' | 'ai_suggestion';
  object_type?: ObjectType;
}

export interface EmailObjectType {
  id: string;
  email_id: string;
  object_type_id: string;
  assigned_at: string;
  object_type?: ObjectType;
}

export interface Person {
  id: string;
  workspace_id: string;
  name: string;
  email: string;
  title?: string;
  phone?: string;
  notes?: string;
  avatar_url?: string;
  city?: string;
  linkedin_url?: string;
  twitter_handle?: string;
  is_auto_created: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
  // Object types assigned to this person
  object_types?: PersonObjectType[];
}

export interface EmailMessage {
  id: string;
  workspace_id: string;
  microsoft_message_id: string;
  person_id?: string;
  person?: Person;
  direction: 'inbound' | 'outbound';
  subject?: string;
  body_preview?: string;
  received_at: string;
  is_read: boolean;
  has_attachments: boolean;
  conversation_id?: string;
  folder_id?: string;
  created_at: string;
  // Object types assigned to this email
  object_types?: EmailObjectType[];
}

// Helper to extract domain from email
export function extractDomainFromEmail(email: string): string | null {
  const match = email.match(/@([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})$/);
  return match ? match[1].toLowerCase() : null;
}
