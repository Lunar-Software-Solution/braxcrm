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
          updated_at?: string
        }
        Relationships: []
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
      email_influencers: {
        Row: {
          assigned_at: string
          email_id: string
          id: string
          influencer_id: string
        }
        Insert: {
          assigned_at?: string
          email_id: string
          id?: string
          influencer_id: string
        }
        Update: {
          assigned_at?: string
          email_id?: string
          id?: string
          influencer_id?: string
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
            columns: ["influencer_id"]
            isOneToOne: false
            referencedRelation: "influencers"
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
          folder_id: string | null
          has_attachments: boolean
          id: string
          is_processed: boolean
          is_read: boolean
          microsoft_message_id: string
          person_id: string | null
          received_at: string
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
          folder_id?: string | null
          has_attachments?: boolean
          id?: string
          is_processed?: boolean
          is_read?: boolean
          microsoft_message_id: string
          person_id?: string | null
          received_at: string
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
          folder_id?: string | null
          has_attachments?: boolean
          id?: string
          is_processed?: boolean
          is_read?: boolean
          microsoft_message_id?: string
          person_id?: string | null
          received_at?: string
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
      email_resellers: {
        Row: {
          assigned_at: string
          email_id: string
          id: string
          reseller_id: string
        }
        Insert: {
          assigned_at?: string
          email_id: string
          id?: string
          reseller_id: string
        }
        Update: {
          assigned_at?: string
          email_id?: string
          id?: string
          reseller_id?: string
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
            columns: ["reseller_id"]
            isOneToOne: false
            referencedRelation: "resellers"
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
      email_suppliers: {
        Row: {
          assigned_at: string
          email_id: string
          id: string
          supplier_id: string
        }
        Insert: {
          assigned_at?: string
          email_id: string
          id?: string
          supplier_id: string
        }
        Update: {
          assigned_at?: string
          email_id?: string
          id?: string
          supplier_id?: string
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
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
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
      influencers: {
        Row: {
          avatar_url: string | null
          created_at: string
          created_by: string
          email: string | null
          id: string
          name: string
          notes: string | null
          phone: string | null
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
          updated_at?: string
        }
        Relationships: []
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
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
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
      resellers: {
        Row: {
          avatar_url: string | null
          created_at: string
          created_by: string
          email: string | null
          id: string
          name: string
          notes: string | null
          phone: string | null
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
          updated_at?: string
        }
        Relationships: []
      }
      suppliers: {
        Row: {
          avatar_url: string | null
          created_at: string
          created_by: string
          email: string | null
          id: string
          name: string
          notes: string | null
          phone: string | null
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
      invoice_status: "pending" | "reviewed" | "approved" | "rejected"
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
      invoice_status: ["pending", "reviewed", "approved", "rejected"],
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
    },
  },
} as const
