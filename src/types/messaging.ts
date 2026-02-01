// Types for messaging import system

export type MessagingPlatform = 'whatsapp' | 'signal' | 'telegram' | 'wechat';

export interface ChatMessage {
  id: string;
  direction: 'inbound' | 'outbound';
  type: 'text' | 'image' | 'audio' | 'video' | 'file' | 'location';
  content: string;
  media_url?: string | null;
  sent_at: string;
}

export interface ChatConversation {
  id: string;
  platform: MessagingPlatform;
  external_conversation_id: string;
  person_id: string | null;
  entity_table: string | null;
  entity_id: string | null;
  participant_identifier: string;
  participant_name: string | null;
  messages: ChatMessage[];
  message_count: number;
  last_message_at: string | null;
  last_message_preview: string | null;
  user_id: string;
  created_at: string;
  updated_at: string;
  // Joined data
  person?: {
    id: string;
    name: string;
    email: string;
    avatar_url?: string | null;
  };
}

export interface MessagingConnection {
  id: string;
  platform: MessagingPlatform;
  connection_id: string;
  phone_number: string | null;
  username: string | null;
  display_name: string | null;
  api_secret: string | null;
  is_active: boolean;
  last_synced_at: string | null;
  user_id: string;
  created_at: string;
  updated_at: string;
}

// Ingest API types
export interface IngestMessagePayload {
  id: string;
  direction: 'inbound' | 'outbound';
  type: 'text' | 'image' | 'audio' | 'video' | 'file' | 'location';
  content: string;
  media_url?: string | null;
  sent_at: string;
}

export interface IngestConversationPayload {
  external_conversation_id: string;
  participant_identifier: string;
  participant_name?: string;
  messages: IngestMessagePayload[];
}

export interface IngestRequestPayload {
  platform: MessagingPlatform;
  connection_id: string;
  conversations: IngestConversationPayload[];
}

// Platform display helpers
export const PLATFORM_LABELS: Record<MessagingPlatform, string> = {
  whatsapp: 'WhatsApp',
  signal: 'Signal',
  telegram: 'Telegram',
  wechat: 'WeChat',
};

export const PLATFORM_COLORS: Record<MessagingPlatform, string> = {
  whatsapp: '#25D366',
  signal: '#3A76F0',
  telegram: '#0088cc',
  wechat: '#07C160',
};
