// Sender types for non-person email addresses (automated systems, newsletters, etc.)

export type SenderType = 'automated' | 'newsletter' | 'shared_inbox' | 'system';

export interface Sender {
  id: string;
  email: string;
  display_name: string | null;
  sender_type: SenderType;
  entity_table: string | null;
  entity_id: string | null;
  domain: string | null;
  is_auto_created: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

// Patterns for detecting non-person sender types
const SENDER_TYPE_PATTERNS: Record<SenderType, RegExp> = {
  automated: /^(noreply|no-reply|donotreply|do-not-reply|mailer|auto|bounce|daemon)$/i,
  newsletter: /^(newsletter|news|updates|digest|weekly|daily|monthly|bulletin)$/i,
  system: /^(system|automated|notifications|alerts|notify|alert|admin|root|postmaster|webmaster)$/i,
  shared_inbox: /^(support|info|hello|contact|sales|team|help|service|billing|feedback|inquiries)$/i,
};

/**
 * Detects if an email address belongs to a non-person sender
 * Returns the sender type if detected, null if it appears to be a person
 */
export function detectSenderType(email: string): SenderType | null {
  const localPart = email.split('@')[0].toLowerCase();
  
  for (const [type, pattern] of Object.entries(SENDER_TYPE_PATTERNS)) {
    if (pattern.test(localPart)) {
      return type as SenderType;
    }
  }
  
  return null;
}

/**
 * Checks if an email address is a non-person sender
 */
export function isNonPersonSender(email: string): boolean {
  return detectSenderType(email) !== null;
}

/**
 * Extracts domain from an email address
 */
export function extractDomain(email: string): string | null {
  const match = email.match(/@([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})$/);
  return match ? match[1].toLowerCase() : null;
}

/**
 * Gets a friendly label for a sender type
 */
export function getSenderTypeLabel(type: SenderType): string {
  const labels: Record<SenderType, string> = {
    automated: 'Automated',
    newsletter: 'Newsletter',
    shared_inbox: 'Shared Inbox',
    system: 'System',
  };
  return labels[type] || type;
}
