export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      affiliates: {
        Row: {
          avatar_url: string | null
          created_at: string
          created_by: string
          email: string | null
          id: string
          name: string
          notes: string | null
          phone: string | null
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          source: string | null
          source_reference: string | null
          status: Database["public"]["Enums"]["entity_status"]
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          created_by: string
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          source?: string | null
          source_reference?: string | null
          status?: Database["public"]["Enums"]["entity_status"]
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          created_by?: string
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          source?: string | null
          source_reference?: string | null
          status?: Database["public"]["Enums"]["entity_status"]
          updated_at?: string
        }
        Relationships: []
      }
      automation_send_log: {
        Row: {
          automation_id: string
          automation_type: string
          contact_email: string
          contact_id: string
          contact_type: string
          created_at: string
          enrollment_id: string | null
          error_message: string | null
          id: string
          microsoft_message_id: string | null
          sent_at: string | null
          status: Database["public"]["Enums"]["automation_send_status"]
          subject: string
          template_id: string | null
          user_id: string
        }
        Insert: {
          automation_id: string
          automation_type: string
          contact_email: string
          contact_id: string
          contact_type: string
          created_at?: string
          enrollment_id?: string | null
          error_message?: string | null
          id?: string
          microsoft_message_id?: string | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["automation_send_status"]
          subject: string
          template_id?: string | null
          user_id: string
        }
        Update: {
          automation_id?: string
          automation_type?: string
          contact_email?: string
          contact_id?: string
          contact_type?: string
          created_at?: string
          enrollment_id?: string | null
          error_message?: string | null
          id?: string
          microsoft_message_id?: string | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["automation_send_status"]
          subject?: string
          template_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "automation_send_log_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "sequence_enrollments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automation_send_log_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "email_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      brax_distributors: {
        Row: {
          avatar_url: string | null
          created_at: string
          created_by: string
          email: string | null
          id: string
          name: string
          notes: string | null
          phone: string | null
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          source: string | null
          source_reference: string | null
          status: Database["public"]["Enums"]["entity_status"]
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          created_by: string
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          source?: string | null
          source_reference?: string | null
          status?: Database["public"]["Enums"]["entity_status"]
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          created_by?: string
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          source?: string | null
          source_reference?: string | null
          status?: Database["public"]["Enums"]["entity_status"]
          updated_at?: string
        }
        Relationships: []
      }
      chat_conversations: {
        Row: {
          created_at: string
          entity_id: string | null
          entity_table: string | null
          external_conversation_id: string
          id: string
          last_message_at: string | null
          last_message_preview: string | null
          message_count: number
          messages: Json
          participant_identifier: string
          participant_name: string | null
          person_id: string | null
          platform: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          entity_id?: string | null
          entity_table?: string | null
          external_conversation_id: string
          id?: string
          last_message_at?: string | null
          last_message_preview?: string | null
          message_count?: number
          messages?: Json
          participant_identifier: string
          participant_name?: string | null
          person_id?: string | null
          platform: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          entity_id?: string | null
          entity_table?: string | null
          external_conversation_id?: string
          id?: string
          last_message_at?: string | null
          last_message_preview?: string | null
          message_count?: number
          messages?: Json
          participant_identifier?: string
          participant_name?: string | null
          person_id?: string | null
          platform?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_conversations_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
        ]
      }
      corporate_management: {
        Row: {
          avatar_url: string | null
          created_at: string
          created_by: string
          email: string | null
          id: string
          name: string
          notes: string | null
          phone: string | null
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          source: string | null
          source_reference: string | null
          status: Database["public"]["Enums"]["entity_status"]
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          created_by: string
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          source?: string | null
          source_reference?: string | null
          status?: Database["public"]["Enums"]["entity_status"]
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          created_by?: string
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          source?: string | null
          source_reference?: string | null
          status?: Database["public"]["Enums"]["entity_status"]
          updated_at?: string
        }
        Relationships: []
      }
      email_affiliates: {
        Row: {
          affiliate_id: string
          assigned_at: string
          email_id: string
          id: string
        }
        Insert: {
          affiliate_id: string
          assigned_at?: string
          email_id: string
          id?: string
        }
        Update: {
          affiliate_id?: string
          assigned_at?: string
          email_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_influencers_email_id_fkey"
            columns: ["email_id"]
            isOneToOne: false
            referencedRelation: "email_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_influencers_influencer_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "affiliates"
            referencedColumns: ["id"]
          },
        ]
      }
      email_brax_distributors: {
        Row: {
          assigned_at: string
          brax_distributor_id: string
          email_id: string
          id: string
        }
        Insert: {
          assigned_at?: string
          brax_distributor_id: string
          email_id: string
          id?: string
        }
        Update: {
          assigned_at?: string
          brax_distributor_id?: string
          email_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_brax_distributors_brax_distributor_id_fkey"
            columns: ["brax_distributor_id"]
            isOneToOne: false
            referencedRelation: "brax_distributors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_brax_distributors_email_id_fkey"
            columns: ["email_id"]
            isOneToOne: false
            referencedRelation: "email_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      email_categories: {
        Row: {
          color: string | null
          created_at: string
          created_by: string
          description: string | null
          icon: string | null
          id: string
          is_active: boolean
          name: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean
          name: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          color?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean
          name?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_classification_logs: {
        Row: {
          ai_model: string | null
          ai_prompt: string | null
          ai_response: string | null
          confidence: number | null
          created_at: string
          email_id: string
          entity_table: string | null
          error_message: string | null
          id: string
          processing_time_ms: number | null
          source: string
          success: boolean
          user_id: string | null
        }
        Insert: {
          ai_model?: string | null
          ai_prompt?: string | null
          ai_response?: string | null
          confidence?: number | null
          created_at?: string
          email_id: string
          entity_table?: string | null
          error_message?: string | null
          id?: string
          processing_time_ms?: number | null
          source?: string
          success?: boolean
          user_id?: string | null
        }
        Update: {
          ai_model?: string | null
          ai_prompt?: string | null
          ai_response?: string | null
          confidence?: number | null
          created_at?: string
          email_id?: string
          entity_table?: string | null
          error_message?: string | null
          id?: string
          processing_time_ms?: number | null
          source?: string
          success?: boolean
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_classification_logs_email_id_fkey"
            columns: ["email_id"]
            isOneToOne: false
            referencedRelation: "email_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      email_corporate_management: {
        Row: {
          assigned_at: string
          corporate_management_id: string
          email_id: string
          id: string
        }
        Insert: {
          assigned_at?: string
          corporate_management_id: string
          email_id: string
          id?: string
        }
        Update: {
          assigned_at?: string
          corporate_management_id?: string
          email_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_corporate_management_corporate_management_id_fkey"
            columns: ["corporate_management_id"]
            isOneToOne: false
            referencedRelation: "corporate_management"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_corporate_management_email_id_fkey"
            columns: ["email_id"]
            isOneToOne: false
            referencedRelation: "email_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      email_logistic_suppliers: {
        Row: {
          assigned_at: string
          email_id: string
          id: string
          logistic_supplier_id: string
        }
        Insert: {
          assigned_at?: string
          email_id: string
          id?: string
          logistic_supplier_id: string
        }
        Update: {
          assigned_at?: string
          email_id?: string
          id?: string
          logistic_supplier_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_carriers_carrier_id_fkey"
            columns: ["logistic_supplier_id"]
            isOneToOne: false
            referencedRelation: "logistic_suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_carriers_email_id_fkey"
            columns: ["email_id"]
            isOneToOne: false
            referencedRelation: "email_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      email_marketing_sources: {
        Row: {
          assigned_at: string
          email_id: string
          id: string
          marketing_source_id: string
        }
        Insert: {
          assigned_at?: string
          email_id: string
          id?: string
          marketing_source_id: string
        }
        Update: {
          assigned_at?: string
          email_id?: string
          id?: string
          marketing_source_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_marketing_sources_email_id_fkey"
            columns: ["email_id"]
            isOneToOne: false
            referencedRelation: "email_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_marketing_sources_marketing_source_id_fkey"
            columns: ["marketing_source_id"]
            isOneToOne: false
            referencedRelation: "marketing_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      email_merchant_accounts: {
        Row: {
          assigned_at: string
          email_id: string
          id: string
          merchant_account_id: string
        }
        Insert: {
          assigned_at?: string
          email_id: string
          id?: string
          merchant_account_id: string
        }
        Update: {
          assigned_at?: string
          email_id?: string
          id?: string
          merchant_account_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_merchant_accounts_email_id_fkey"
            columns: ["email_id"]
            isOneToOne: false
            referencedRelation: "email_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_merchant_accounts_merchant_account_id_fkey"
            columns: ["merchant_account_id"]
            isOneToOne: false
            referencedRelation: "merchant_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      email_message_categories: {
        Row: {
          category_id: string
          confidence: number
          email_id: string
          id: string
          processed_at: string
        }
        Insert: {
          category_id: string
          confidence?: number
          email_id: string
          id?: string
          processed_at?: string
        }
        Update: {
          category_id?: string
          confidence?: number
          email_id?: string
          id?: string
          processed_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_message_categories_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "email_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_message_categories_email_id_fkey"
            columns: ["email_id"]
            isOneToOne: false
            referencedRelation: "email_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      email_message_tags: {
        Row: {
          created_at: string
          email_id: string
          id: string
          tag_id: string
        }
        Insert: {
          created_at?: string
          email_id: string
          id?: string
          tag_id: string
        }
        Update: {
          created_at?: string
          email_id?: string
          id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_message_tags_email_id_fkey"
            columns: ["email_id"]
            isOneToOne: false
            referencedRelation: "email_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_message_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "email_tags"
            referencedColumns: ["id"]
          },
        ]
      }
      email_messages: {
        Row: {
          ai_confidence: number | null
          body_preview: string | null
          category_id: string | null
          conversation_id: string | null
          created_at: string
          direction: string
          entity_table: string | null
          folder_id: string | null
          has_attachments: boolean
          id: string
          is_person: boolean | null
          is_processed: boolean
          is_read: boolean
          microsoft_message_id: string
          person_id: string | null
          received_at: string
          sender_email: string | null
          sender_id: string | null
          sender_name: string | null
          subject: string | null
          user_id: string | null
          visibility_group_id: string | null
        }
        Insert: {
          ai_confidence?: number | null
          body_preview?: string | null
          category_id?: string | null
          conversation_id?: string | null
          created_at?: string
          direction: string
          entity_table?: string | null
          folder_id?: string | null
          has_attachments?: boolean
          id?: string
          is_person?: boolean | null
          is_processed?: boolean
          is_read?: boolean
          microsoft_message_id: string
          person_id?: string | null
          received_at: string
          sender_email?: string | null
          sender_id?: string | null
          sender_name?: string | null
          subject?: string | null
          user_id?: string | null
          visibility_group_id?: string | null
        }
        Update: {
          ai_confidence?: number | null
          body_preview?: string | null
          category_id?: string | null
          conversation_id?: string | null
          created_at?: string
          direction?: string
          entity_table?: string | null
          folder_id?: string | null
          has_attachments?: boolean
          id?: string
          is_person?: boolean | null
          is_processed?: boolean
          is_read?: boolean
          microsoft_message_id?: string
          person_id?: string | null
          received_at?: string
          sender_email?: string | null
          sender_id?: string | null
          sender_name?: string | null
          subject?: string | null
          user_id?: string | null
          visibility_group_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_messages_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "email_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_messages_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "senders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_messages_visibility_group_id_fkey"
            columns: ["visibility_group_id"]
            isOneToOne: false
            referencedRelation: "email_visibility_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      email_object_types: {
        Row: {
          assigned_at: string
          email_id: string
          id: string
          object_type_id: string
        }
        Insert: {
          assigned_at?: string
          email_id: string
          id?: string
          object_type_id: string
        }
        Update: {
          assigned_at?: string
          email_id?: string
          id?: string
          object_type_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_object_types_email_id_fkey"
            columns: ["email_id"]
            isOneToOne: false
            referencedRelation: "email_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_object_types_object_type_id_fkey"
            columns: ["object_type_id"]
            isOneToOne: false
            referencedRelation: "object_types"
            referencedColumns: ["id"]
          },
        ]
      }
      email_personal_contacts: {
        Row: {
          assigned_at: string
          email_id: string
          id: string
          personal_contact_id: string
        }
        Insert: {
          assigned_at?: string
          email_id: string
          id?: string
          personal_contact_id: string
        }
        Update: {
          assigned_at?: string
          email_id?: string
          id?: string
          personal_contact_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_personal_contacts_email_id_fkey"
            columns: ["email_id"]
            isOneToOne: false
            referencedRelation: "email_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_personal_contacts_personal_contact_id_fkey"
            columns: ["personal_contact_id"]
            isOneToOne: false
            referencedRelation: "personal_contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      email_product_suppliers: {
        Row: {
          assigned_at: string
          email_id: string
          id: string
          product_supplier_id: string
        }
        Insert: {
          assigned_at?: string
          email_id: string
          id?: string
          product_supplier_id: string
        }
        Update: {
          assigned_at?: string
          email_id?: string
          id?: string
          product_supplier_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_suppliers_email_id_fkey"
            columns: ["email_id"]
            isOneToOne: false
            referencedRelation: "email_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_suppliers_supplier_id_fkey"
            columns: ["product_supplier_id"]
            isOneToOne: false
            referencedRelation: "product_suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      email_rule_actions: {
        Row: {
          action_type: Database["public"]["Enums"]["rule_action_type"]
          config: Json
          created_at: string
          id: string
          is_active: boolean
          rule_id: string
        }
        Insert: {
          action_type: Database["public"]["Enums"]["rule_action_type"]
          config?: Json
          created_at?: string
          id?: string
          is_active?: boolean
          rule_id: string
        }
        Update: {
          action_type?: Database["public"]["Enums"]["rule_action_type"]
          config?: Json
          created_at?: string
          id?: string
          is_active?: boolean
          rule_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_rule_actions_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "email_rules"
            referencedColumns: ["id"]
          },
        ]
      }
      email_rule_logs: {
        Row: {
          action_config: Json | null
          action_type: string
          email_id: string
          error_message: string | null
          id: string
          processed_at: string
          rule_id: string | null
          success: boolean
          user_id: string | null
        }
        Insert: {
          action_config?: Json | null
          action_type: string
          email_id: string
          error_message?: string | null
          id?: string
          processed_at?: string
          rule_id?: string | null
          success?: boolean
          user_id?: string | null
        }
        Update: {
          action_config?: Json | null
          action_type?: string
          email_id?: string
          error_message?: string | null
          id?: string
          processed_at?: string
          rule_id?: string | null
          success?: boolean
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_rule_logs_email_id_fkey"
            columns: ["email_id"]
            isOneToOne: false
            referencedRelation: "email_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_rule_logs_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "email_rules"
            referencedColumns: ["id"]
          },
        ]
      }
      email_rules: {
        Row: {
          category_id: string
          created_at: string
          created_by: string
          id: string
          is_active: boolean
          name: string
          priority: number
          updated_at: string
        }
        Insert: {
          category_id: string
          created_at?: string
          created_by: string
          id?: string
          is_active?: boolean
          name: string
          priority?: number
          updated_at?: string
        }
        Update: {
          category_id?: string
          created_at?: string
          created_by?: string
          id?: string
          is_active?: boolean
          name?: string
          priority?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_rules_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "email_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      email_sequences: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          entity_table: string | null
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          entity_table?: string | null
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          entity_table?: string | null
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      email_services_suppliers: {
        Row: {
          assigned_at: string
          email_id: string
          id: string
          services_supplier_id: string
        }
        Insert: {
          assigned_at?: string
          email_id: string
          id?: string
          services_supplier_id: string
        }
        Update: {
          assigned_at?: string
          email_id?: string
          id?: string
          services_supplier_id?: string
        }
        Relationships: []
      }
      email_subscription_suppliers: {
        Row: {
          assigned_at: string
          email_id: string
          id: string
          subscription_supplier_id: string
        }
        Insert: {
          assigned_at?: string
          email_id: string
          id?: string
          subscription_supplier_id: string
        }
        Update: {
          assigned_at?: string
          email_id?: string
          id?: string
          subscription_supplier_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_subscriptions_email_id_fkey"
            columns: ["email_id"]
            isOneToOne: false
            referencedRelation: "email_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_subscriptions_subscription_id_fkey"
            columns: ["subscription_supplier_id"]
            isOneToOne: false
            referencedRelation: "subscription_suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      email_tags: {
        Row: {
          color: string | null
          created_at: string
          created_by: string | null
          id: string
          name: string
          outlook_category: string | null
        }
        Insert: {
          color?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          name: string
          outlook_category?: string | null
        }
        Update: {
          color?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string
          outlook_category?: string | null
        }
        Relationships: []
      }
      email_templates: {
        Row: {
          body_html: string
          body_text: string | null
          created_at: string
          created_by: string
          id: string
          is_active: boolean
          merge_fields: Json | null
          name: string
          subject: string
          updated_at: string
        }
        Insert: {
          body_html: string
          body_text?: string | null
          created_at?: string
          created_by: string
          id?: string
          is_active?: boolean
          merge_fields?: Json | null
          name: string
          subject: string
          updated_at?: string
        }
        Update: {
          body_html?: string
          body_text?: string | null
          created_at?: string
          created_by?: string
          id?: string
          is_active?: boolean
          merge_fields?: Json | null
          name?: string
          subject?: string
          updated_at?: string
        }
        Relationships: []
      }
      email_triggers: {
        Row: {
          conditions: Json | null
          created_at: string
          created_by: string
          delay_minutes: number
          description: string | null
          entity_table: string
          id: string
          is_active: boolean
          name: string
          template_id: string
          trigger_type: string
          updated_at: string
        }
        Insert: {
          conditions?: Json | null
          created_at?: string
          created_by: string
          delay_minutes?: number
          description?: string | null
          entity_table: string
          id?: string
          is_active?: boolean
          name: string
          template_id: string
          trigger_type: string
          updated_at?: string
        }
        Update: {
          conditions?: Json | null
          created_at?: string
          created_by?: string
          delay_minutes?: number
          description?: string | null
          entity_table?: string
          id?: string
          is_active?: boolean
          name?: string
          template_id?: string
          trigger_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_triggers_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "email_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      email_vigile_partners: {
        Row: {
          assigned_at: string
          email_id: string
          id: string
          vigile_partner_id: string
        }
        Insert: {
          assigned_at?: string
          email_id: string
          id?: string
          vigile_partner_id: string
        }
        Update: {
          assigned_at?: string
          email_id?: string
          id?: string
          vigile_partner_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_resellers_email_id_fkey"
            columns: ["email_id"]
            isOneToOne: false
            referencedRelation: "email_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_resellers_reseller_id_fkey"
            columns: ["vigile_partner_id"]
            isOneToOne: false
            referencedRelation: "vigile_partners"
            referencedColumns: ["id"]
          },
        ]
      }
      email_visibility_group_members: {
        Row: {
          created_at: string
          group_id: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          group_id: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          group_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_visibility_group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "email_visibility_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      email_visibility_groups: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      entity_automation_rules: {
        Row: {
          ai_prompt: string | null
          created_at: string
          created_by: string
          description: string | null
          entity_table: string
          id: string
          is_active: boolean
          priority: number
          updated_at: string
        }
        Insert: {
          ai_prompt?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          entity_table: string
          id?: string
          is_active?: boolean
          priority?: number
          updated_at?: string
        }
        Update: {
          ai_prompt?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          entity_table?: string
          id?: string
          is_active?: boolean
          priority?: number
          updated_at?: string
        }
        Relationships: []
      }
      entity_field_values: {
        Row: {
          created_at: string
          entity_id: string
          entity_table: string
          field_id: string
          id: string
          updated_at: string
          value_boolean: boolean | null
          value_date: string | null
          value_json: Json | null
          value_number: number | null
          value_text: string | null
        }
        Insert: {
          created_at?: string
          entity_id: string
          entity_table: string
          field_id: string
          id?: string
          updated_at?: string
          value_boolean?: boolean | null
          value_date?: string | null
          value_json?: Json | null
          value_number?: number | null
          value_text?: string | null
        }
        Update: {
          created_at?: string
          entity_id?: string
          entity_table?: string
          field_id?: string
          id?: string
          updated_at?: string
          value_boolean?: boolean | null
          value_date?: string | null
          value_json?: Json | null
          value_number?: number | null
          value_text?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "entity_field_values_field_id_fkey"
            columns: ["field_id"]
            isOneToOne: false
            referencedRelation: "entity_fields"
            referencedColumns: ["id"]
          },
        ]
      }
      entity_fields: {
        Row: {
          config: Json | null
          created_at: string
          created_by: string
          data_type: Database["public"]["Enums"]["entity_field_type"]
          description: string | null
          entity_table: string
          icon: string | null
          id: string
          is_active: boolean
          is_required: boolean
          name: string
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          config?: Json | null
          created_at?: string
          created_by: string
          data_type?: Database["public"]["Enums"]["entity_field_type"]
          description?: string | null
          entity_table: string
          icon?: string | null
          id?: string
          is_active?: boolean
          is_required?: boolean
          name: string
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          config?: Json | null
          created_at?: string
          created_by?: string
          data_type?: Database["public"]["Enums"]["entity_field_type"]
          description?: string | null
          entity_table?: string
          icon?: string | null
          id?: string
          is_active?: boolean
          is_required?: boolean
          name?: string
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      entity_files: {
        Row: {
          created_at: string
          entity_id: string
          entity_table: string
          file_name: string
          file_path: string
          file_size: number
          id: string
          mime_type: string
          uploaded_by: string
        }
        Insert: {
          created_at?: string
          entity_id: string
          entity_table: string
          file_name: string
          file_path: string
          file_size: number
          id?: string
          mime_type: string
          uploaded_by: string
        }
        Update: {
          created_at?: string
          entity_id?: string
          entity_table?: string
          file_name?: string
          file_path?: string
          file_size?: number
          id?: string
          mime_type?: string
          uploaded_by?: string
        }
        Relationships: []
      }
      entity_roles: {
        Row: {
          created_at: string
          description: string | null
          entity_table: string
          id: string
          name: string
          slug: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          entity_table: string
          id?: string
          name: string
          slug: string
        }
        Update: {
          created_at?: string
          description?: string | null
          entity_table?: string
          id?: string
          name?: string
          slug?: string
        }
        Relationships: []
      }
      entity_rule_actions: {
        Row: {
          action_type: string
          config: Json
          created_at: string
          entity_rule_id: string
          id: string
          is_active: boolean
          sort_order: number
        }
        Insert: {
          action_type: string
          config?: Json
          created_at?: string
          entity_rule_id: string
          id?: string
          is_active?: boolean
          sort_order?: number
        }
        Update: {
          action_type?: string
          config?: Json
          created_at?: string
          entity_rule_id?: string
          id?: string
          is_active?: boolean
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "entity_rule_actions_entity_rule_id_fkey"
            columns: ["entity_rule_id"]
            isOneToOne: false
            referencedRelation: "entity_automation_rules"
            referencedColumns: ["id"]
          },
        ]
      }
      extracted_invoices: {
        Row: {
          amount: number | null
          created_at: string
          currency: string | null
          due_date: string | null
          email_id: string
          id: string
          invoice_number: string | null
          raw_extraction: Json | null
          status: Database["public"]["Enums"]["invoice_status"]
          user_id: string | null
          vendor_name: string | null
        }
        Insert: {
          amount?: number | null
          created_at?: string
          currency?: string | null
          due_date?: string | null
          email_id: string
          id?: string
          invoice_number?: string | null
          raw_extraction?: Json | null
          status?: Database["public"]["Enums"]["invoice_status"]
          user_id?: string | null
          vendor_name?: string | null
        }
        Update: {
          amount?: number | null
          created_at?: string
          currency?: string | null
          due_date?: string | null
          email_id?: string
          id?: string
          invoice_number?: string | null
          raw_extraction?: Json | null
          status?: Database["public"]["Enums"]["invoice_status"]
          user_id?: string | null
          vendor_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "extracted_invoices_email_id_fkey"
            columns: ["email_id"]
            isOneToOne: false
            referencedRelation: "email_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      invitations: {
        Row: {
          accepted_at: string | null
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string
          name: string | null
          status: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          invited_by: string
          name?: string | null
          status?: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string
          name?: string | null
          status?: string
        }
        Relationships: []
      }
      logistic_suppliers: {
        Row: {
          avatar_url: string | null
          created_at: string
          created_by: string
          email: string | null
          id: string
          name: string
          notes: string | null
          phone: string | null
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          source: string | null
          source_reference: string | null
          status: Database["public"]["Enums"]["entity_status"]
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          created_by: string
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          source?: string | null
          source_reference?: string | null
          status?: Database["public"]["Enums"]["entity_status"]
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          created_by?: string
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          source?: string | null
          source_reference?: string | null
          status?: Database["public"]["Enums"]["entity_status"]
          updated_at?: string
        }
        Relationships: []
      }
      marketing_sources: {
        Row: {
          avatar_url: string | null
          created_at: string
          created_by: string
          email: string | null
          id: string
          name: string
          notes: string | null
          phone: string | null
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          source: string | null
          source_reference: string | null
          status: Database["public"]["Enums"]["entity_status"]
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          created_by: string
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          source?: string | null
          source_reference?: string | null
          status?: Database["public"]["Enums"]["entity_status"]
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          created_by?: string
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          source?: string | null
          source_reference?: string | null
          status?: Database["public"]["Enums"]["entity_status"]
          updated_at?: string
        }
        Relationships: []
      }
      merchant_accounts: {
        Row: {
          avatar_url: string | null
          created_at: string
          created_by: string
          email: string | null
          id: string
          name: string
          notes: string | null
          phone: string | null
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          source: string | null
          source_reference: string | null
          status: Database["public"]["Enums"]["entity_status"]
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          created_by: string
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          source?: string | null
          source_reference?: string | null
          status?: Database["public"]["Enums"]["entity_status"]
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          created_by?: string
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          source?: string | null
          source_reference?: string | null
          status?: Database["public"]["Enums"]["entity_status"]
          updated_at?: string
        }
        Relationships: []
      }
      messaging_connections: {
        Row: {
          api_secret: string | null
          connection_id: string
          created_at: string
          display_name: string | null
          id: string
          is_active: boolean
          last_synced_at: string | null
          phone_number: string | null
          platform: string
          updated_at: string
          user_id: string
          username: string | null
        }
        Insert: {
          api_secret?: string | null
          connection_id: string
          created_at?: string
          display_name?: string | null
          id?: string
          is_active?: boolean
          last_synced_at?: string | null
          phone_number?: string | null
          platform: string
          updated_at?: string
          user_id: string
          username?: string | null
        }
        Update: {
          api_secret?: string | null
          connection_id?: string
          created_at?: string
          display_name?: string | null
          id?: string
          is_active?: boolean
          last_synced_at?: string | null
          phone_number?: string | null
          platform?: string
          updated_at?: string
          user_id?: string
          username?: string | null
        }
        Relationships: []
      }
      microsoft_tokens: {
        Row: {
          access_token: string
          created_at: string
          display_name: string | null
          expires_at: string
          id: string
          is_primary: boolean | null
          microsoft_email: string | null
          refresh_token: string
          updated_at: string
          user_id: string
        }
        Insert: {
          access_token: string
          created_at?: string
          display_name?: string | null
          expires_at: string
          id?: string
          is_primary?: boolean | null
          microsoft_email?: string | null
          refresh_token: string
          updated_at?: string
          user_id: string
        }
        Update: {
          access_token?: string
          created_at?: string
          display_name?: string | null
          expires_at?: string
          id?: string
          is_primary?: boolean | null
          microsoft_email?: string | null
          refresh_token?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notes: {
        Row: {
          content: string
          created_at: string
          created_by: string
          entity_id: string
          entity_table: string
          id: string
          title: string | null
          updated_at: string
        }
        Insert: {
          content: string
          created_at?: string
          created_by: string
          entity_id: string
          entity_table: string
          id?: string
          title?: string | null
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          created_by?: string
          entity_id?: string
          entity_table?: string
          id?: string
          title?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      object_types: {
        Row: {
          color: string | null
          created_at: string
          created_by: string
          description: string | null
          icon: string | null
          id: string
          is_active: boolean
          name: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean
          name: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          color?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean
          name?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      opportunities: {
        Row: {
          closed_at: string | null
          created_at: string
          created_by: string
          currency: string | null
          description: string | null
          entity_id: string
          entity_table: string
          expected_close_date: string | null
          id: string
          name: string
          probability: number | null
          stage: Database["public"]["Enums"]["opportunity_stage"]
          updated_at: string
          value: number | null
        }
        Insert: {
          closed_at?: string | null
          created_at?: string
          created_by: string
          currency?: string | null
          description?: string | null
          entity_id: string
          entity_table: string
          expected_close_date?: string | null
          id?: string
          name: string
          probability?: number | null
          stage?: Database["public"]["Enums"]["opportunity_stage"]
          updated_at?: string
          value?: number | null
        }
        Update: {
          closed_at?: string | null
          created_at?: string
          created_by?: string
          currency?: string | null
          description?: string | null
          entity_id?: string
          entity_table?: string
          expected_close_date?: string | null
          id?: string
          name?: string
          probability?: number | null
          stage?: Database["public"]["Enums"]["opportunity_stage"]
          updated_at?: string
          value?: number | null
        }
        Relationships: []
      }
      people: {
        Row: {
          avatar_url: string | null
          city: string | null
          created_at: string
          created_by: string
          email: string
          id: string
          is_auto_created: boolean
          linkedin_url: string | null
          name: string
          notes: string | null
          phone: string | null
          title: string | null
          twitter_handle: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          city?: string | null
          created_at?: string
          created_by: string
          email: string
          id?: string
          is_auto_created?: boolean
          linkedin_url?: string | null
          name: string
          notes?: string | null
          phone?: string | null
          title?: string | null
          twitter_handle?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          city?: string | null
          created_at?: string
          created_by?: string
          email?: string
          id?: string
          is_auto_created?: boolean
          linkedin_url?: string | null
          name?: string
          notes?: string | null
          phone?: string | null
          title?: string | null
          twitter_handle?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      people_entities: {
        Row: {
          created_at: string
          entity_id: string
          entity_table: string
          id: string
          person_id: string
        }
        Insert: {
          created_at?: string
          entity_id: string
          entity_table: string
          id?: string
          person_id: string
        }
        Update: {
          created_at?: string
          entity_id?: string
          entity_table?: string
          id?: string
          person_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "people_entities_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
        ]
      }
      person_object_types: {
        Row: {
          assigned_at: string
          assigned_by: string | null
          id: string
          object_type_id: string
          person_id: string
          source: string
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          id?: string
          object_type_id: string
          person_id: string
          source?: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
          id?: string
          object_type_id?: string
          person_id?: string
          source?: string
        }
        Relationships: [
          {
            foreignKeyName: "person_object_types_object_type_id_fkey"
            columns: ["object_type_id"]
            isOneToOne: false
            referencedRelation: "object_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "person_object_types_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
        ]
      }
      personal_contacts: {
        Row: {
          avatar_url: string | null
          created_at: string
          created_by: string
          email: string | null
          id: string
          name: string
          notes: string | null
          phone: string | null
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          source: string | null
          source_reference: string | null
          status: Database["public"]["Enums"]["entity_status"]
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          created_by: string
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          source?: string | null
          source_reference?: string | null
          status?: Database["public"]["Enums"]["entity_status"]
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          created_by?: string
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          source?: string | null
          source_reference?: string | null
          status?: Database["public"]["Enums"]["entity_status"]
          updated_at?: string
        }
        Relationships: []
      }
      product_suppliers: {
        Row: {
          avatar_url: string | null
          created_at: string
          created_by: string
          email: string | null
          id: string
          name: string
          notes: string | null
          phone: string | null
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          source: string | null
          source_reference: string | null
          status: Database["public"]["Enums"]["entity_status"]
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          created_by: string
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          source?: string | null
          source_reference?: string | null
          status?: Database["public"]["Enums"]["entity_status"]
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          created_by?: string
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          source?: string | null
          source_reference?: string | null
          status?: Database["public"]["Enums"]["entity_status"]
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          email: string | null
          id: string
          status: string
          suspended_at: string | null
          suspended_by: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          status?: string
          suspended_at?: string | null
          suspended_by?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          status?: string
          suspended_at?: string | null
          suspended_by?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      record_role_assignments: {
        Row: {
          assigned_at: string
          assigned_by_rule_id: string | null
          entity_role_id: string
          id: string
          record_id: string
          table_name: string
        }
        Insert: {
          assigned_at?: string
          assigned_by_rule_id?: string | null
          entity_role_id: string
          id?: string
          record_id: string
          table_name: string
        }
        Update: {
          assigned_at?: string
          assigned_by_rule_id?: string | null
          entity_role_id?: string
          id?: string
          record_id?: string
          table_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "record_role_assignments_assigned_by_rule_id_fkey"
            columns: ["assigned_by_rule_id"]
            isOneToOne: false
            referencedRelation: "email_rules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "record_role_assignments_entity_role_id_fkey"
            columns: ["entity_role_id"]
            isOneToOne: false
            referencedRelation: "entity_roles"
            referencedColumns: ["id"]
          },
        ]
      }
      senders: {
        Row: {
          created_at: string
          created_by: string
          display_name: string | null
          domain: string | null
          email: string
          entity_id: string | null
          entity_table: string | null
          id: string
          is_auto_created: boolean
          sender_type: Database["public"]["Enums"]["sender_type"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          display_name?: string | null
          domain?: string | null
          email: string
          entity_id?: string | null
          entity_table?: string | null
          id?: string
          is_auto_created?: boolean
          sender_type?: Database["public"]["Enums"]["sender_type"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          display_name?: string | null
          domain?: string | null
          email?: string
          entity_id?: string | null
          entity_table?: string | null
          id?: string
          is_auto_created?: boolean
          sender_type?: Database["public"]["Enums"]["sender_type"]
          updated_at?: string
        }
        Relationships: []
      }
      sequence_enrollments: {
        Row: {
          completed_at: string | null
          contact_email: string
          contact_id: string
          contact_type: string
          current_step: number
          enrolled_at: string
          enrolled_by: string
          id: string
          next_send_at: string | null
          sequence_id: string
          status: Database["public"]["Enums"]["enrollment_status"]
        }
        Insert: {
          completed_at?: string | null
          contact_email: string
          contact_id: string
          contact_type: string
          current_step?: number
          enrolled_at?: string
          enrolled_by: string
          id?: string
          next_send_at?: string | null
          sequence_id: string
          status?: Database["public"]["Enums"]["enrollment_status"]
        }
        Update: {
          completed_at?: string | null
          contact_email?: string
          contact_id?: string
          contact_type?: string
          current_step?: number
          enrolled_at?: string
          enrolled_by?: string
          id?: string
          next_send_at?: string | null
          sequence_id?: string
          status?: Database["public"]["Enums"]["enrollment_status"]
        }
        Relationships: [
          {
            foreignKeyName: "sequence_enrollments_sequence_id_fkey"
            columns: ["sequence_id"]
            isOneToOne: false
            referencedRelation: "email_sequences"
            referencedColumns: ["id"]
          },
        ]
      }
      sequence_steps: {
        Row: {
          created_at: string
          delay_days: number
          delay_hours: number
          id: string
          is_active: boolean
          sequence_id: string
          step_order: number
          template_id: string
        }
        Insert: {
          created_at?: string
          delay_days?: number
          delay_hours?: number
          id?: string
          is_active?: boolean
          sequence_id: string
          step_order?: number
          template_id: string
        }
        Update: {
          created_at?: string
          delay_days?: number
          delay_hours?: number
          id?: string
          is_active?: boolean
          sequence_id?: string
          step_order?: number
          template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sequence_steps_sequence_id_fkey"
            columns: ["sequence_id"]
            isOneToOne: false
            referencedRelation: "email_sequences"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sequence_steps_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "email_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      services_suppliers: {
        Row: {
          avatar_url: string | null
          created_at: string
          created_by: string
          email: string | null
          id: string
          name: string
          notes: string | null
          phone: string | null
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          source: string | null
          source_reference: string | null
          status: Database["public"]["Enums"]["entity_status"]
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          created_by: string
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          source?: string | null
          source_reference?: string | null
          status?: Database["public"]["Enums"]["entity_status"]
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          created_by?: string
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          source?: string | null
          source_reference?: string | null
          status?: Database["public"]["Enums"]["entity_status"]
          updated_at?: string
        }
        Relationships: []
      }
      subscription_suppliers: {
        Row: {
          avatar_url: string | null
          created_at: string
          created_by: string
          email: string | null
          id: string
          name: string
          notes: string | null
          phone: string | null
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          source: string | null
          source_reference: string | null
          status: Database["public"]["Enums"]["entity_status"]
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          created_by: string
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          source?: string | null
          source_reference?: string | null
          status?: Database["public"]["Enums"]["entity_status"]
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          created_by?: string
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          source?: string | null
          source_reference?: string | null
          status?: Database["public"]["Enums"]["entity_status"]
          updated_at?: string
        }
        Relationships: []
      }
      tasks: {
        Row: {
          assigned_to: string | null
          completed_at: string | null
          created_at: string
          created_by: string
          description: string | null
          due_date: string | null
          entity_id: string
          entity_table: string
          id: string
          priority: Database["public"]["Enums"]["task_priority"]
          status: Database["public"]["Enums"]["task_status"]
          title: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          due_date?: string | null
          entity_id: string
          entity_table: string
          id?: string
          priority?: Database["public"]["Enums"]["task_priority"]
          status?: Database["public"]["Enums"]["task_status"]
          title: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          due_date?: string | null
          entity_id?: string
          entity_table?: string
          id?: string
          priority?: Database["public"]["Enums"]["task_priority"]
          status?: Database["public"]["Enums"]["task_status"]
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_entity_roles: {
        Row: {
          assigned_at: string
          assigned_by: string | null
          entity_role_id: string
          id: string
          user_id: string
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          entity_role_id: string
          id?: string
          user_id: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
          entity_role_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_entity_roles_entity_role_id_fkey"
            columns: ["entity_role_id"]
            isOneToOne: false
            referencedRelation: "entity_roles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      vigile_partners: {
        Row: {
          avatar_url: string | null
          created_at: string
          created_by: string
          email: string | null
          id: string
          name: string
          notes: string | null
          phone: string | null
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          source: string | null
          source_reference: string | null
          status: Database["public"]["Enums"]["entity_status"]
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          created_by: string
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          source?: string | null
          source_reference?: string | null
          status?: Database["public"]["Enums"]["entity_status"]
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          created_by?: string
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          source?: string | null
          source_reference?: string | null
          status?: Database["public"]["Enums"]["entity_status"]
          updated_at?: string
        }
        Relationships: []
      }
      webflow_sync_config: {
        Row: {
          created_at: string
          created_by: string
          endpoint_id: string | null
          form_id: string | null
          form_name: string | null
          id: string
          is_active: boolean
          last_synced_at: string | null
          site_id: string
          sync_interval_hours: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          endpoint_id?: string | null
          form_id?: string | null
          form_name?: string | null
          id?: string
          is_active?: boolean
          last_synced_at?: string | null
          site_id: string
          sync_interval_hours?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          endpoint_id?: string | null
          form_id?: string | null
          form_name?: string | null
          id?: string
          is_active?: boolean
          last_synced_at?: string | null
          site_id?: string
          sync_interval_hours?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "webflow_sync_config_endpoint_id_fkey"
            columns: ["endpoint_id"]
            isOneToOne: false
            referencedRelation: "webhook_endpoints"
            referencedColumns: ["id"]
          },
        ]
      }
      webflow_tokens: {
        Row: {
          api_token: string
          created_at: string
          created_by: string
          id: string
          site_id: string
          site_name: string | null
          updated_at: string
        }
        Insert: {
          api_token: string
          created_at?: string
          created_by: string
          id?: string
          site_id: string
          site_name?: string | null
          updated_at?: string
        }
        Update: {
          api_token?: string
          created_at?: string
          created_by?: string
          id?: string
          site_id?: string
          site_name?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      webhook_endpoints: {
        Row: {
          allowed_object_types: string[] | null
          created_at: string
          created_by: string
          default_entity_table: string | null
          description: string | null
          id: string
          is_active: boolean
          name: string
          secret_key: string
          slug: string
          updated_at: string
        }
        Insert: {
          allowed_object_types?: string[] | null
          created_at?: string
          created_by: string
          default_entity_table?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          secret_key: string
          slug: string
          updated_at?: string
        }
        Update: {
          allowed_object_types?: string[] | null
          created_at?: string
          created_by?: string
          default_entity_table?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          secret_key?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      webhook_event_logs: {
        Row: {
          action_config: Json | null
          action_type: string
          error_message: string | null
          id: string
          processed_at: string
          success: boolean
          webhook_event_id: string
        }
        Insert: {
          action_config?: Json | null
          action_type: string
          error_message?: string | null
          id?: string
          processed_at?: string
          success?: boolean
          webhook_event_id: string
        }
        Update: {
          action_config?: Json | null
          action_type?: string
          error_message?: string | null
          id?: string
          processed_at?: string
          success?: boolean
          webhook_event_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "webhook_event_logs_webhook_event_id_fkey"
            columns: ["webhook_event_id"]
            isOneToOne: false
            referencedRelation: "webhook_events"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_events: {
        Row: {
          ai_confidence: number | null
          created_at: string
          endpoint_id: string
          entity_id: string | null
          entity_table: string | null
          error_message: string | null
          event_type: string
          external_id: string | null
          id: string
          is_person: boolean | null
          payload: Json
          person_id: string | null
          processed_at: string | null
          status: Database["public"]["Enums"]["webhook_event_status"]
          user_id: string
        }
        Insert: {
          ai_confidence?: number | null
          created_at?: string
          endpoint_id: string
          entity_id?: string | null
          entity_table?: string | null
          error_message?: string | null
          event_type: string
          external_id?: string | null
          id?: string
          is_person?: boolean | null
          payload?: Json
          person_id?: string | null
          processed_at?: string | null
          status?: Database["public"]["Enums"]["webhook_event_status"]
          user_id: string
        }
        Update: {
          ai_confidence?: number | null
          created_at?: string
          endpoint_id?: string
          entity_id?: string | null
          entity_table?: string | null
          error_message?: string | null
          event_type?: string
          external_id?: string | null
          id?: string
          is_person?: boolean | null
          payload?: Json
          person_id?: string | null
          processed_at?: string | null
          status?: Database["public"]["Enums"]["webhook_event_status"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "webhook_events_endpoint_id_fkey"
            columns: ["endpoint_id"]
            isOneToOne: false
            referencedRelation: "webhook_endpoints"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "webhook_events_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_view_person_via_entity: {
        Args: { _person_id: string; _user_id: string }
        Returns: boolean
      }
      can_view_record: {
        Args: { _record_id: string; _table_name: string; _user_id: string }
        Returns: boolean
      }
      has_entity_role: {
        Args: { _entity_table: string; _user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "member"
      automation_send_status: "pending" | "sent" | "failed" | "bounced"
      enrollment_status:
        | "active"
        | "completed"
        | "paused"
        | "unsubscribed"
        | "failed"
      entity_field_type:
        | "text"
        | "number"
        | "date"
        | "datetime"
        | "boolean"
        | "currency"
        | "link"
        | "address"
        | "actor"
      entity_status:
        | "draft"
        | "pending"
        | "under_review"
        | "approved"
        | "rejected"
      invoice_status: "pending" | "reviewed" | "approved" | "rejected"
      opportunity_stage:
        | "lead"
        | "qualified"
        | "proposal"
        | "negotiation"
        | "won"
        | "lost"
      rule_action_type:
        | "visibility"
        | "tag"
        | "extract_attachments"
        | "extract_invoice"
        | "move_folder"
        | "mark_priority"
        | "assign_object_type"
        | "assign_entity"
        | "assign_role"
      sender_type: "automated" | "newsletter" | "shared_inbox" | "system"
      task_priority: "low" | "medium" | "high" | "urgent"
      task_status: "todo" | "in_progress" | "completed" | "cancelled"
      webhook_event_status: "pending" | "processing" | "processed" | "failed"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "member"],
      automation_send_status: ["pending", "sent", "failed", "bounced"],
      enrollment_status: [
        "active",
        "completed",
        "paused",
        "unsubscribed",
        "failed",
      ],
      entity_field_type: [
        "text",
        "number",
        "date",
        "datetime",
        "boolean",
        "currency",
        "link",
        "address",
        "actor",
      ],
      entity_status: [
        "draft",
        "pending",
        "under_review",
        "approved",
        "rejected",
      ],
      invoice_status: ["pending", "reviewed", "approved", "rejected"],
      opportunity_stage: [
        "lead",
        "qualified",
        "proposal",
        "negotiation",
        "won",
        "lost",
      ],
      rule_action_type: [
        "visibility",
        "tag",
        "extract_attachments",
        "extract_invoice",
        "move_folder",
        "mark_priority",
        "assign_object_type",
        "assign_entity",
        "assign_role",
      ],
      sender_type: ["automated", "newsletter", "shared_inbox", "system"],
      task_priority: ["low", "medium", "high", "urgent"],
      task_status: ["todo", "in_progress", "completed", "cancelled"],
      webhook_event_status: ["pending", "processing", "processed", "failed"],
    },
  },
} as const
