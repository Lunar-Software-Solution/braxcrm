// CRM types for Companies, People, and Email tracking

export interface Company {
  id: string;
  workspace_id: string;
  name: string;
  domain?: string;
  website?: string;
  industry?: string;
  notes?: string;
  employees?: number;
  linkedin_url?: string;
  address?: string;
  account_owner_id?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface Person {
  id: string;
  workspace_id: string;
  company_id?: string;
  company?: Company;
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
}

// Helper to extract domain from email
export function extractDomainFromEmail(email: string): string | null {
  const match = email.match(/@([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})$/);
  return match ? match[1].toLowerCase() : null;
}

// Helper to extract company name from domain
export function extractCompanyNameFromDomain(domain: string): string {
  // Remove common TLDs and capitalize
  const name = domain
    .replace(/\.(com|org|net|io|co|app|dev|tech|ai|xyz|info|biz)$/i, '')
    .split('.')
    .pop() || domain;
  
  return name.charAt(0).toUpperCase() + name.slice(1);
}
