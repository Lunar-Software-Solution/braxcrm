// Webhook Types

export type WebhookEventStatus = 'pending' | 'processing' | 'processed' | 'failed';

export interface WebhookEndpoint {
  id: string;
  name: string;
  slug: string;
  secret_key: string;
  is_active: boolean;
  description: string | null;
  allowed_object_types: string[];
  default_entity_table: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface WebhookEvent {
  id: string;
  endpoint_id: string;
  external_id: string | null;
  event_type: string;
  payload: Record<string, unknown>;
  status: WebhookEventStatus;
  entity_table: string | null;
  is_person: boolean | null;
  person_id: string | null;
  entity_id: string | null;
  ai_confidence: number | null;
  error_message: string | null;
  processed_at: string | null;
  user_id: string;
  created_at: string;
  // Joined data
  endpoint?: WebhookEndpoint;
  person?: {
    id: string;
    name: string;
    email: string;
  };
}

export interface WebhookEventLog {
  id: string;
  webhook_event_id: string;
  action_type: string;
  action_config: Record<string, unknown>;
  success: boolean;
  error_message: string | null;
  processed_at: string;
}

// Incoming webhook payload structure (recommended)
export interface WebhookPayload {
  external_id?: string;
  event_type: string;
  data: {
    name?: string;
    email?: string;
    phone?: string;
    company?: string;
    metadata?: Record<string, unknown>;
    [key: string]: unknown;
  };
}

// API response types
export interface WebhookIngestResponse {
  success: boolean;
  event_id?: string;
  message?: string;
  error?: string;
}

export interface PrepareWebhookResult {
  event_id: string;
  success: boolean;
  person_id?: string;
  entity_id?: string;
  person_created?: boolean;
  entity_created?: boolean;
  error?: string;
}

export interface ProcessWebhookRulesResult {
  event_id: string;
  actions_applied: Array<{
    action_type: string;
    success: boolean;
    error?: string;
  }>;
  auto_created?: {
    person_id?: string;
    entity_id?: string;
    person_created?: boolean;
    entity_created?: boolean;
  };
}
