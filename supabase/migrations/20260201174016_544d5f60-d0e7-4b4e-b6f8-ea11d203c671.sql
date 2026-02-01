-- Create chat_conversations table for storing messaging threads with JSONB messages
CREATE TABLE public.chat_conversations (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  platform text NOT NULL CHECK (platform IN ('whatsapp', 'signal', 'telegram', 'wechat')),
  external_conversation_id text NOT NULL,
  person_id uuid REFERENCES public.people(id) ON DELETE SET NULL,
  entity_table text,
  entity_id uuid,
  participant_identifier text NOT NULL,
  participant_name text,
  messages jsonb NOT NULL DEFAULT '[]'::jsonb,
  message_count integer NOT NULL DEFAULT 0,
  last_message_at timestamptz,
  last_message_preview text,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (external_conversation_id, platform, user_id)
);

-- Create messaging_connections table for managing platform connections
CREATE TABLE public.messaging_connections (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  platform text NOT NULL CHECK (platform IN ('whatsapp', 'signal', 'telegram', 'wechat')),
  connection_id text NOT NULL UNIQUE,
  phone_number text,
  username text,
  display_name text,
  api_secret text,
  is_active boolean NOT NULL DEFAULT true,
  last_synced_at timestamptz,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS on both tables
ALTER TABLE public.chat_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messaging_connections ENABLE ROW LEVEL SECURITY;

-- RLS policies for chat_conversations
CREATE POLICY "Users can view their own conversations"
  ON public.chat_conversations FOR SELECT
  USING (user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can insert their own conversations"
  ON public.chat_conversations FOR INSERT
  WITH CHECK (user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can update their own conversations"
  ON public.chat_conversations FOR UPDATE
  USING (user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can delete their own conversations"
  ON public.chat_conversations FOR DELETE
  USING (user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

-- RLS policies for messaging_connections
CREATE POLICY "Users can view their own connections"
  ON public.messaging_connections FOR SELECT
  USING (user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can insert their own connections"
  ON public.messaging_connections FOR INSERT
  WITH CHECK (user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can update their own connections"
  ON public.messaging_connections FOR UPDATE
  USING (user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can delete their own connections"
  ON public.messaging_connections FOR DELETE
  USING (user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

-- Create indexes for efficient querying
CREATE INDEX idx_chat_conversations_person_id ON public.chat_conversations(person_id);
CREATE INDEX idx_chat_conversations_platform ON public.chat_conversations(platform);
CREATE INDEX idx_chat_conversations_last_message_at ON public.chat_conversations(last_message_at DESC);
CREATE INDEX idx_chat_conversations_user_id ON public.chat_conversations(user_id);
CREATE INDEX idx_messaging_connections_user_id ON public.messaging_connections(user_id);
CREATE INDEX idx_messaging_connections_platform ON public.messaging_connections(platform);

-- Create trigger for updated_at
CREATE TRIGGER update_chat_conversations_updated_at
  BEFORE UPDATE ON public.chat_conversations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_messaging_connections_updated_at
  BEFORE UPDATE ON public.messaging_connections
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();