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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      activation_reminder_log: {
        Row: {
          advertiser_id: string
          created_at: string
          email: string
          error: string | null
          id: string
          sent_on: string
          status: string
          subtype: string | null
        }
        Insert: {
          advertiser_id: string
          created_at?: string
          email: string
          error?: string | null
          id?: string
          sent_on?: string
          status?: string
          subtype?: string | null
        }
        Update: {
          advertiser_id?: string
          created_at?: string
          email?: string
          error?: string | null
          id?: string
          sent_on?: string
          status?: string
          subtype?: string | null
        }
        Relationships: []
      }
      admin_2fa_codes: {
        Row: {
          code_hash: string
          consumed_at: string | null
          created_at: string
          expires_at: string
          id: string
          user_id: string
        }
        Insert: {
          code_hash: string
          consumed_at?: string | null
          created_at?: string
          expires_at: string
          id?: string
          user_id: string
        }
        Update: {
          code_hash?: string
          consumed_at?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      admin_settings: {
        Row: {
          description: string | null
          id: string
          key: string
          updated_at: string
          value: string
        }
        Insert: {
          description?: string | null
          id?: string
          key: string
          updated_at?: string
          value: string
        }
        Update: {
          description?: string | null
          id?: string
          key?: string
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      advertiser_categories: {
        Row: {
          advertiser_id: string
          advertiser_subtype:
            | Database["public"]["Enums"]["advertiser_subtype"]
            | null
          advertiser_type: Database["public"]["Enums"]["advertiser_type"] | null
          category_id: string
          created_at: string
          id: string
          status: string
        }
        Insert: {
          advertiser_id: string
          advertiser_subtype?:
            | Database["public"]["Enums"]["advertiser_subtype"]
            | null
          advertiser_type?:
            | Database["public"]["Enums"]["advertiser_type"]
            | null
          category_id: string
          created_at?: string
          id?: string
          status?: string
        }
        Update: {
          advertiser_id?: string
          advertiser_subtype?:
            | Database["public"]["Enums"]["advertiser_subtype"]
            | null
          advertiser_type?:
            | Database["public"]["Enums"]["advertiser_type"]
            | null
          category_id?: string
          created_at?: string
          id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "advertiser_categories_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      advertiser_websites: {
        Row: {
          advertiser_id: string
          created_at: string
          domain: string
          id: string
          is_verified: boolean
          otp_code: string | null
          otp_expires_at: string | null
        }
        Insert: {
          advertiser_id: string
          created_at?: string
          domain: string
          id?: string
          is_verified?: boolean
          otp_code?: string | null
          otp_expires_at?: string | null
        }
        Update: {
          advertiser_id?: string
          created_at?: string
          domain?: string
          id?: string
          is_verified?: boolean
          otp_code?: string | null
          otp_expires_at?: string | null
        }
        Relationships: []
      }
      api_keys: {
        Row: {
          campaign_id: string
          created_at: string
          id: string
          key: string
        }
        Insert: {
          campaign_id: string
          created_at?: string
          id?: string
          key: string
        }
        Update: {
          campaign_id?: string
          created_at?: string
          id?: string
          key?: string
        }
        Relationships: [
          {
            foreignKeyName: "api_keys_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      blogs: {
        Row: {
          content: string | null
          created_at: string
          excerpt: string | null
          id: string
          is_published: boolean
          meta_description: string | null
          meta_title: string | null
          slug: string
          title: string
        }
        Insert: {
          content?: string | null
          created_at?: string
          excerpt?: string | null
          id?: string
          is_published?: boolean
          meta_description?: string | null
          meta_title?: string | null
          slug: string
          title: string
        }
        Update: {
          content?: string | null
          created_at?: string
          excerpt?: string | null
          id?: string
          is_published?: boolean
          meta_description?: string | null
          meta_title?: string | null
          slug?: string
          title?: string
        }
        Relationships: []
      }
      business_verifications: {
        Row: {
          admin_notes: string | null
          advertiser_id: string
          created_at: string
          document_type: string
          document_url: string
          id: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          updated_at: string
        }
        Insert: {
          admin_notes?: string | null
          advertiser_id: string
          created_at?: string
          document_type?: string
          document_url: string
          id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          admin_notes?: string | null
          advertiser_id?: string
          created_at?: string
          document_type?: string
          document_url?: string
          id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      campaign_questions: {
        Row: {
          campaign_id: string
          correct_answer: boolean
          created_at: string
          id: string
          question: string
        }
        Insert: {
          campaign_id: string
          correct_answer: boolean
          created_at?: string
          id?: string
          question: string
        }
        Update: {
          campaign_id?: string
          correct_answer?: boolean
          created_at?: string
          id?: string
          question?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_questions_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_script_health: {
        Row: {
          campaign_id: string
          campaign_tracker_install_id: string | null
          domain: string | null
          flagged_at: string | null
          flagged_reason: string | null
          id: string
          install_integrity: string | null
          integrity_message: string | null
          last_ping_at: string | null
          last_script_signature: string | null
          last_tracker_version: string | null
          status: string
          updated_at: string
        }
        Insert: {
          campaign_id: string
          campaign_tracker_install_id?: string | null
          domain?: string | null
          flagged_at?: string | null
          flagged_reason?: string | null
          id?: string
          install_integrity?: string | null
          integrity_message?: string | null
          last_ping_at?: string | null
          last_script_signature?: string | null
          last_tracker_version?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          campaign_id?: string
          campaign_tracker_install_id?: string | null
          domain?: string | null
          flagged_at?: string | null
          flagged_reason?: string | null
          id?: string
          install_integrity?: string | null
          integrity_message?: string | null
          last_ping_at?: string | null
          last_script_signature?: string | null
          last_tracker_version?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_script_health_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: true
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_script_health_campaign_tracker_install_id_fkey"
            columns: ["campaign_tracker_install_id"]
            isOneToOne: false
            referencedRelation: "campaign_tracker_installs"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_sources: {
        Row: {
          campaign_id: string
          created_at: string
          id: string
          type: Database["public"]["Enums"]["source_type"]
          url: string
          verified: boolean
        }
        Insert: {
          campaign_id: string
          created_at?: string
          id?: string
          type?: Database["public"]["Enums"]["source_type"]
          url: string
          verified?: boolean
        }
        Update: {
          campaign_id?: string
          created_at?: string
          id?: string
          type?: Database["public"]["Enums"]["source_type"]
          url?: string
          verified?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "campaign_sources_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_tracker_installs: {
        Row: {
          api_key_snapshot: string | null
          campaign_id: string
          created_at: string
          id: string
          installed_at: string | null
          release_id: string
          snippet: string | null
          status: string
          tracker_release_id: string | null
          updated_at: string | null
        }
        Insert: {
          api_key_snapshot?: string | null
          campaign_id: string
          created_at?: string
          id?: string
          installed_at?: string | null
          release_id: string
          snippet?: string | null
          status?: string
          tracker_release_id?: string | null
          updated_at?: string | null
        }
        Update: {
          api_key_snapshot?: string | null
          campaign_id?: string
          created_at?: string
          id?: string
          installed_at?: string | null
          release_id?: string
          snippet?: string | null
          status?: string
          tracker_release_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "campaign_tracker_installs_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: true
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_tracker_installs_release_id_fkey"
            columns: ["release_id"]
            isOneToOne: false
            referencedRelation: "tracker_releases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_tracker_installs_tracker_release_id_fkey"
            columns: ["tracker_release_id"]
            isOneToOne: false
            referencedRelation: "tracker_releases"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_upgrade_notices: {
        Row: {
          acknowledged: boolean
          campaign_id: string
          created_at: string
          from_version: string | null
          id: string
          message: string | null
          severity: string
          to_version: string
        }
        Insert: {
          acknowledged?: boolean
          campaign_id: string
          created_at?: string
          from_version?: string | null
          id?: string
          message?: string | null
          severity?: string
          to_version: string
        }
        Update: {
          acknowledged?: boolean
          campaign_id?: string
          created_at?: string
          from_version?: string | null
          id?: string
          message?: string | null
          severity?: string
          to_version?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_upgrade_notices_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      campaigns: {
        Row: {
          ad_type: Database["public"]["Enums"]["advertiser_type"] | null
          advertiser_id: string
          app_link: string | null
          approval_notified_at: string | null
          auto_activation_at: string
          budget_remaining: number
          campaign_mode: string
          completed_at: string | null
          created_at: string
          email_notifications_enabled: boolean
          extra_escrow_buffer: number
          id: string
          integration_type: string
          integration_verified: boolean
          is_draft: boolean
          name: string
          notified_event_count: number
          platform_type: string
          price_download: number
          price_purchase: number
          price_signup: number
          selected_milestones: string[]
          status: Database["public"]["Enums"]["campaign_status"]
          target_users: number
          total_cost: number
          website_id: string | null
        }
        Insert: {
          ad_type?: Database["public"]["Enums"]["advertiser_type"] | null
          advertiser_id: string
          app_link?: string | null
          approval_notified_at?: string | null
          auto_activation_at?: string
          budget_remaining?: number
          campaign_mode?: string
          completed_at?: string | null
          created_at?: string
          email_notifications_enabled?: boolean
          extra_escrow_buffer?: number
          id?: string
          integration_type?: string
          integration_verified?: boolean
          is_draft?: boolean
          name: string
          notified_event_count?: number
          platform_type?: string
          price_download?: number
          price_purchase?: number
          price_signup?: number
          selected_milestones?: string[]
          status?: Database["public"]["Enums"]["campaign_status"]
          target_users?: number
          total_cost?: number
          website_id?: string | null
        }
        Update: {
          ad_type?: Database["public"]["Enums"]["advertiser_type"] | null
          advertiser_id?: string
          app_link?: string | null
          approval_notified_at?: string | null
          auto_activation_at?: string
          budget_remaining?: number
          campaign_mode?: string
          completed_at?: string | null
          created_at?: string
          email_notifications_enabled?: boolean
          extra_escrow_buffer?: number
          id?: string
          integration_type?: string
          integration_verified?: boolean
          is_draft?: boolean
          name?: string
          notified_event_count?: number
          platform_type?: string
          price_download?: number
          price_purchase?: number
          price_signup?: number
          selected_milestones?: string[]
          status?: Database["public"]["Enums"]["campaign_status"]
          target_users?: number
          total_cost?: number
          website_id?: string | null
        }
        Relationships: []
      }
      categories: {
        Row: {
          created_at: string
          description: string | null
          group_id: string | null
          id: string
          is_active: boolean
          is_partnership: boolean
          mode: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          group_id?: string | null
          id?: string
          is_active?: boolean
          is_partnership?: boolean
          mode?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          group_id?: string | null
          id?: string
          is_active?: boolean
          is_partnership?: boolean
          mode?: string
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "category_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      category_change_requests: {
        Row: {
          admin_notes: string | null
          advertiser_id: string
          created_at: string
          current_category_id: string
          id: string
          reason: string
          requested_category_id: string
          status: string
          updated_at: string
        }
        Insert: {
          admin_notes?: string | null
          advertiser_id: string
          created_at?: string
          current_category_id: string
          id?: string
          reason: string
          requested_category_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          admin_notes?: string | null
          advertiser_id?: string
          created_at?: string
          current_category_id?: string
          id?: string
          reason?: string
          requested_category_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      category_groups: {
        Row: {
          created_at: string
          description: string | null
          display_order: number
          id: string
          name: string
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          name: string
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          name?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      clicks: {
        Row: {
          created_at: string
          id: string
          ip: string | null
          referral_id: string
          user_agent: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          ip?: string | null
          referral_id: string
          user_agent?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          ip?: string | null
          referral_id?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clicks_referral_id_fkey"
            columns: ["referral_id"]
            isOneToOne: false
            referencedRelation: "referrals"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_messages: {
        Row: {
          admin_reply: string | null
          created_at: string | null
          email: string
          id: string
          is_read: boolean | null
          message: string
          name: string
          replied_at: string | null
        }
        Insert: {
          admin_reply?: string | null
          created_at?: string | null
          email: string
          id?: string
          is_read?: boolean | null
          message: string
          name: string
          replied_at?: string | null
        }
        Update: {
          admin_reply?: string | null
          created_at?: string | null
          email?: string
          id?: string
          is_read?: boolean | null
          message?: string
          name?: string
          replied_at?: string | null
        }
        Relationships: []
      }
      creative_campaigns: {
        Row: {
          advertiser_id: string
          campaign_id: string
          created_at: string
          event_types: string[]
          id: string
          media_link: string
          media_type: string
          min_interactions: number
          placement_fee: number
          rate_per_interaction: number
          subscriber_rate: number | null
          target_subscribers: number | null
          transcription: string | null
          transcription_confirmed: boolean | null
          updated_at: string
          viewer_rate: number | null
        }
        Insert: {
          advertiser_id: string
          campaign_id: string
          created_at?: string
          event_types?: string[]
          id?: string
          media_link: string
          media_type: string
          min_interactions?: number
          placement_fee?: number
          rate_per_interaction?: number
          subscriber_rate?: number | null
          target_subscribers?: number | null
          transcription?: string | null
          transcription_confirmed?: boolean | null
          updated_at?: string
          viewer_rate?: number | null
        }
        Update: {
          advertiser_id?: string
          campaign_id?: string
          created_at?: string
          event_types?: string[]
          id?: string
          media_link?: string
          media_type?: string
          min_interactions?: number
          placement_fee?: number
          rate_per_interaction?: number
          subscriber_rate?: number | null
          target_subscribers?: number | null
          transcription?: string | null
          transcription_confirmed?: boolean | null
          updated_at?: string
          viewer_rate?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "creative_campaigns_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      email_templates: {
        Row: {
          body: string
          created_at: string
          created_by: string | null
          id: string
          name: string
          subject: string
          updated_at: string
          variables: string[]
        }
        Insert: {
          body: string
          created_at?: string
          created_by?: string | null
          id?: string
          name: string
          subject: string
          updated_at?: string
          variables?: string[]
        }
        Update: {
          body?: string
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string
          subject?: string
          updated_at?: string
          variables?: string[]
        }
        Relationships: []
      }
      events: {
        Row: {
          amount: number | null
          campaign_id: string
          created_at: string
          event_type: Database["public"]["Enums"]["event_type"]
          external_user_id: string
          id: string
          ip: string | null
          referral_id: string | null
        }
        Insert: {
          amount?: number | null
          campaign_id: string
          created_at?: string
          event_type: Database["public"]["Enums"]["event_type"]
          external_user_id: string
          id?: string
          ip?: string | null
          referral_id?: string | null
        }
        Update: {
          amount?: number | null
          campaign_id?: string
          created_at?: string
          event_type?: Database["public"]["Enums"]["event_type"]
          external_user_id?: string
          id?: string
          ip?: string | null
          referral_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "events_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_referral_id_fkey"
            columns: ["referral_id"]
            isOneToOne: false
            referencedRelation: "referrals"
            referencedColumns: ["id"]
          },
        ]
      }
      extension_clicks: {
        Row: {
          campaign_id: string
          created_at: string
          destination_url: string
          ext_user_id: string
          id: string
          ip: string | null
          status: string
          user_agent: string | null
        }
        Insert: {
          campaign_id: string
          created_at?: string
          destination_url: string
          ext_user_id: string
          id?: string
          ip?: string | null
          status?: string
          user_agent?: string | null
        }
        Update: {
          campaign_id?: string
          created_at?: string
          destination_url?: string
          ext_user_id?: string
          id?: string
          ip?: string | null
          status?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "extension_clicks_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      extension_conversions: {
        Row: {
          click_id: string
          created_at: string
          event_type: string
          id: string
          rewarded: boolean
          status: string
        }
        Insert: {
          click_id: string
          created_at?: string
          event_type: string
          id?: string
          rewarded?: boolean
          status?: string
        }
        Update: {
          click_id?: string
          created_at?: string
          event_type?: string
          id?: string
          rewarded?: boolean
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "extension_conversions_click_id_fkey"
            columns: ["click_id"]
            isOneToOne: false
            referencedRelation: "extension_clicks"
            referencedColumns: ["id"]
          },
        ]
      }
      extension_rewards: {
        Row: {
          campaign_id: string
          click_id: string | null
          created_at: string
          ext_user_id: string
          id: string
          points: number
          reward_type: string
        }
        Insert: {
          campaign_id: string
          click_id?: string | null
          created_at?: string
          ext_user_id: string
          id?: string
          points?: number
          reward_type: string
        }
        Update: {
          campaign_id?: string
          click_id?: string | null
          created_at?: string
          ext_user_id?: string
          id?: string
          points?: number
          reward_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "extension_rewards_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "extension_rewards_click_id_fkey"
            columns: ["click_id"]
            isOneToOne: false
            referencedRelation: "extension_clicks"
            referencedColumns: ["id"]
          },
        ]
      }
      external_referral_programs: {
        Row: {
          activation_fee_paid: boolean
          admin_notes: string | null
          admin_referral_code: string | null
          admin_referral_link: string | null
          advertiser_id: string
          campaign_id: string
          compensation_structure: string
          created_at: string
          id: string
          referral_guide: string
          registration_link: string
          status: string
          updated_at: string
        }
        Insert: {
          activation_fee_paid?: boolean
          admin_notes?: string | null
          admin_referral_code?: string | null
          admin_referral_link?: string | null
          advertiser_id: string
          campaign_id: string
          compensation_structure?: string
          created_at?: string
          id?: string
          referral_guide?: string
          registration_link?: string
          status?: string
          updated_at?: string
        }
        Update: {
          activation_fee_paid?: boolean
          admin_notes?: string | null
          admin_referral_code?: string | null
          admin_referral_link?: string | null
          advertiser_id?: string
          campaign_id?: string
          compensation_structure?: string
          created_at?: string
          id?: string
          referral_guide?: string
          registration_link?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "external_referral_programs_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      manual_events: {
        Row: {
          campaign_id: string
          count: number
          created_at: string
          event_type: string
          id: string
          notes: string | null
          purchase_amount: number | null
          recorded_by: string
          total_deducted: number
        }
        Insert: {
          campaign_id: string
          count?: number
          created_at?: string
          event_type: string
          id?: string
          notes?: string | null
          purchase_amount?: number | null
          recorded_by: string
          total_deducted?: number
        }
        Update: {
          campaign_id?: string
          count?: number
          created_at?: string
          event_type?: string
          id?: string
          notes?: string | null
          purchase_amount?: number | null
          recorded_by?: string
          total_deducted?: number
        }
        Relationships: [
          {
            foreignKeyName: "manual_events_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      offerwall_interactions: {
        Row: {
          attempt_number: number
          campaign_id: string
          charge_amount: number
          created_at: string
          external_user_id: string
          id: string
          is_correct: boolean
          points_earned: number
          question_id: string
        }
        Insert: {
          attempt_number?: number
          campaign_id: string
          charge_amount?: number
          created_at?: string
          external_user_id: string
          id?: string
          is_correct: boolean
          points_earned?: number
          question_id: string
        }
        Update: {
          attempt_number?: number
          campaign_id?: string
          charge_amount?: number
          created_at?: string
          external_user_id?: string
          id?: string
          is_correct?: boolean
          points_earned?: number
          question_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "offerwall_interactions_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offerwall_interactions_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "campaign_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      offline_offers: {
        Row: {
          admin_notes: string | null
          advertiser_id: string
          business_address: string
          business_email: string
          business_phone: string
          created_at: string
          description: string | null
          id: string
          moq_unit: Database["public"]["Enums"]["moq_unit"]
          moq_value: number
          product_name: string
          reviewed_at: string | null
          state: string
          status: string
          submission_fee: number
          updated_at: string
        }
        Insert: {
          admin_notes?: string | null
          advertiser_id: string
          business_address: string
          business_email: string
          business_phone: string
          created_at?: string
          description?: string | null
          id?: string
          moq_unit: Database["public"]["Enums"]["moq_unit"]
          moq_value: number
          product_name: string
          reviewed_at?: string | null
          state: string
          status?: string
          submission_fee?: number
          updated_at?: string
        }
        Update: {
          admin_notes?: string | null
          advertiser_id?: string
          business_address?: string
          business_email?: string
          business_phone?: string
          created_at?: string
          description?: string | null
          id?: string
          moq_unit?: Database["public"]["Enums"]["moq_unit"]
          moq_value?: number
          product_name?: string
          reviewed_at?: string | null
          state?: string
          status?: string
          submission_fee?: number
          updated_at?: string
        }
        Relationships: []
      }
      offline_orders: {
        Row: {
          accept_deadline: string
          accepted_at: string | null
          admin_notes: string | null
          advertiser_id: string
          buyer_email: string | null
          buyer_name: string
          buyer_phone: string | null
          commission_amount: number
          commission_rate: number
          confirmed_at: string | null
          created_at: string
          fulfill_deadline: string | null
          fulfilled_at: string | null
          id: string
          notification_sent_at: string | null
          offer_id: string
          quantity: number
          status: Database["public"]["Enums"]["offline_order_status"]
          total_amount: number
          unit_price: number
          updated_at: string
        }
        Insert: {
          accept_deadline?: string
          accepted_at?: string | null
          admin_notes?: string | null
          advertiser_id: string
          buyer_email?: string | null
          buyer_name: string
          buyer_phone?: string | null
          commission_amount?: number
          commission_rate?: number
          confirmed_at?: string | null
          created_at?: string
          fulfill_deadline?: string | null
          fulfilled_at?: string | null
          id?: string
          notification_sent_at?: string | null
          offer_id: string
          quantity: number
          status?: Database["public"]["Enums"]["offline_order_status"]
          total_amount: number
          unit_price: number
          updated_at?: string
        }
        Update: {
          accept_deadline?: string
          accepted_at?: string | null
          admin_notes?: string | null
          advertiser_id?: string
          buyer_email?: string | null
          buyer_name?: string
          buyer_phone?: string | null
          commission_amount?: number
          commission_rate?: number
          confirmed_at?: string | null
          created_at?: string
          fulfill_deadline?: string | null
          fulfilled_at?: string | null
          id?: string
          notification_sent_at?: string | null
          offer_id?: string
          quantity?: number
          status?: Database["public"]["Enums"]["offline_order_status"]
          total_amount?: number
          unit_price?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "offline_orders_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "offline_offers"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          company_name: string | null
          created_at: string
          created_by_admin: boolean
          email: string
          full_name: string | null
          id: string
          is_blocked: boolean
          website: string | null
          whatsapp_otp_code: string | null
          whatsapp_otp_expires_at: string | null
          whatsapp_phone: string | null
          whatsapp_verified: boolean
        }
        Insert: {
          company_name?: string | null
          created_at?: string
          created_by_admin?: boolean
          email: string
          full_name?: string | null
          id: string
          is_blocked?: boolean
          website?: string | null
          whatsapp_otp_code?: string | null
          whatsapp_otp_expires_at?: string | null
          whatsapp_phone?: string | null
          whatsapp_verified?: boolean
        }
        Update: {
          company_name?: string | null
          created_at?: string
          created_by_admin?: boolean
          email?: string
          full_name?: string | null
          id?: string
          is_blocked?: boolean
          website?: string | null
          whatsapp_otp_code?: string | null
          whatsapp_otp_expires_at?: string | null
          whatsapp_phone?: string | null
          whatsapp_verified?: boolean
        }
        Relationships: []
      }
      quiz_change_requests: {
        Row: {
          admin_notes: string | null
          advertiser_id: string
          campaign_id: string
          created_at: string
          id: string
          question_id: string
          reason: string
          status: string
          updated_at: string
        }
        Insert: {
          admin_notes?: string | null
          advertiser_id: string
          campaign_id: string
          created_at?: string
          id?: string
          question_id: string
          reason: string
          status?: string
          updated_at?: string
        }
        Update: {
          admin_notes?: string | null
          advertiser_id?: string
          campaign_id?: string
          created_at?: string
          id?: string
          question_id?: string
          reason?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      referrals: {
        Row: {
          campaign_id: string
          code: string
          created_at: string
          id: string
          redirect_url: string | null
        }
        Insert: {
          campaign_id: string
          code: string
          created_at?: string
          id?: string
          redirect_url?: string | null
        }
        Update: {
          campaign_id?: string
          code?: string
          created_at?: string
          id?: string
          redirect_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "referrals_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      site_content: {
        Row: {
          content: string | null
          id: string
          is_visible: boolean | null
          section_key: string
          sort_order: number | null
          subtitle: string | null
          title: string | null
          updated_at: string | null
        }
        Insert: {
          content?: string | null
          id?: string
          is_visible?: boolean | null
          section_key: string
          sort_order?: number | null
          subtitle?: string | null
          title?: string | null
          updated_at?: string | null
        }
        Update: {
          content?: string | null
          id?: string
          is_visible?: boolean | null
          section_key?: string
          sort_order?: number | null
          subtitle?: string | null
          title?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      tracker_releases: {
        Row: {
          bundle_path: string
          changelog: string | null
          created_at: string
          force_upgrade: boolean
          id: string
          is_stable: boolean
          release_policy: string
          version: string
        }
        Insert: {
          bundle_path: string
          changelog?: string | null
          created_at?: string
          force_upgrade?: boolean
          id?: string
          is_stable?: boolean
          release_policy?: string
          version: string
        }
        Update: {
          bundle_path?: string
          changelog?: string | null
          created_at?: string
          force_upgrade?: boolean
          id?: string
          is_stable?: boolean
          release_policy?: string
          version?: string
        }
        Relationships: []
      }
      tracking_sessions: {
        Row: {
          advertiser_id: string | null
          campaign_id: string | null
          first_seen_at: string
          id: string
          last_seen_at: string
          metadata: Json | null
          referral_code: string | null
          referral_id: string | null
          tid: string
        }
        Insert: {
          advertiser_id?: string | null
          campaign_id?: string | null
          first_seen_at?: string
          id?: string
          last_seen_at?: string
          metadata?: Json | null
          referral_code?: string | null
          referral_id?: string | null
          tid: string
        }
        Update: {
          advertiser_id?: string | null
          campaign_id?: string | null
          first_seen_at?: string
          id?: string
          last_seen_at?: string
          metadata?: Json | null
          referral_code?: string | null
          referral_id?: string | null
          tid?: string
        }
        Relationships: [
          {
            foreignKeyName: "tracking_sessions_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tracking_sessions_referral_id_fkey"
            columns: ["referral_id"]
            isOneToOne: false
            referencedRelation: "referrals"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          amount: number
          campaign_id: string
          created_at: string
          description: string | null
          event_id: string | null
          id: string
        }
        Insert: {
          amount: number
          campaign_id: string
          created_at?: string
          description?: string | null
          event_id?: string | null
          id?: string
        }
        Update: {
          amount?: number
          campaign_id?: string
          created_at?: string
          description?: string | null
          event_id?: string | null
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
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
      users_tracking: {
        Row: {
          campaign_id: string
          external_user_id: string
          first_seen_at: string
          id: string
          referral_id: string | null
          referred_by: string | null
          tid: string | null
        }
        Insert: {
          campaign_id: string
          external_user_id: string
          first_seen_at?: string
          id?: string
          referral_id?: string | null
          referred_by?: string | null
          tid?: string | null
        }
        Update: {
          campaign_id?: string
          external_user_id?: string
          first_seen_at?: string
          id?: string
          referral_id?: string | null
          referred_by?: string | null
          tid?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "users_tracking_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "users_tracking_referral_id_fkey"
            columns: ["referral_id"]
            isOneToOne: false
            referencedRelation: "referrals"
            referencedColumns: ["id"]
          },
        ]
      }
      wallet_transactions: {
        Row: {
          amount: number
          created_at: string
          description: string | null
          id: string
          reference: string | null
          status: string
          type: string
          wallet_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          description?: string | null
          id?: string
          reference?: string | null
          status?: string
          type: string
          wallet_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string | null
          id?: string
          reference?: string | null
          status?: string
          type?: string
          wallet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wallet_transactions_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "wallets"
            referencedColumns: ["id"]
          },
        ]
      }
      wallets: {
        Row: {
          advertiser_id: string
          balance: number
          created_at: string
          currency: string
          flutterwave_bank_name: string | null
          flutterwave_barter_id: string | null
          flutterwave_nuban: string | null
          flutterwave_psa_reference: string | null
          id: string
          is_activated: boolean
          paystack_customer_code: string | null
          paystack_dva_account_number: string | null
          paystack_dva_bank_name: string | null
          updated_at: string
        }
        Insert: {
          advertiser_id: string
          balance?: number
          created_at?: string
          currency?: string
          flutterwave_bank_name?: string | null
          flutterwave_barter_id?: string | null
          flutterwave_nuban?: string | null
          flutterwave_psa_reference?: string | null
          id?: string
          is_activated?: boolean
          paystack_customer_code?: string | null
          paystack_dva_account_number?: string | null
          paystack_dva_bank_name?: string | null
          updated_at?: string
        }
        Update: {
          advertiser_id?: string
          balance?: number
          created_at?: string
          currency?: string
          flutterwave_bank_name?: string | null
          flutterwave_barter_id?: string | null
          flutterwave_nuban?: string | null
          flutterwave_psa_reference?: string | null
          id?: string
          is_activated?: boolean
          paystack_customer_code?: string | null
          paystack_dva_account_number?: string | null
          paystack_dva_bank_name?: string | null
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_offline_order: { Args: { _order_id: string }; Returns: Json }
      auto_activate_pending_campaigns: { Args: never; Returns: undefined }
      confirm_offline_order: {
        Args: { _notes: string; _order_id: string }
        Returns: Json
      }
      end_campaign_early: { Args: { _campaign_id: string }; Returns: Json }
      expire_stale_offline_orders: { Args: never; Returns: number }
      expire_stale_pending_wallet_transactions: { Args: never; Returns: number }
      fulfill_offline_order: { Args: { _order_id: string }; Returns: Json }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      refund_campaign_escrow: {
        Args: { _campaign_id: string }
        Returns: number
      }
      review_offline_offer: {
        Args: { _approve: boolean; _notes: string; _offer_id: string }
        Returns: Json
      }
      submit_offline_offer: { Args: { _offer_id: string }; Returns: Json }
      topup_campaign_escrow: {
        Args: { _amount: number; _campaign_id: string }
        Returns: Json
      }
    }
    Enums: {
      advertiser_subtype:
        | "musician"
        | "youtuber"
        | "app"
        | "website"
        | "ecommerce"
        | "service"
        | "real_estate"
        | "oil_gas"
        | "distributor"
      advertiser_type: "engagement" | "performance" | "commerce" | "offline"
      app_role: "admin" | "user"
      campaign_status:
        | "pending"
        | "active"
        | "rejected"
        | "completed"
        | "paused"
        | "ended"
      event_type: "download" | "signup" | "purchase"
      moq_unit: "liter" | "kg" | "piece"
      offline_order_status:
        | "pending_acceptance"
        | "accepted"
        | "fulfilled_by_advertiser"
        | "confirmed_by_admin"
        | "expired"
        | "rejected"
      source_type: "web" | "android" | "ios"
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
      advertiser_subtype: [
        "musician",
        "youtuber",
        "app",
        "website",
        "ecommerce",
        "service",
        "real_estate",
        "oil_gas",
        "distributor",
      ],
      advertiser_type: ["engagement", "performance", "commerce", "offline"],
      app_role: ["admin", "user"],
      campaign_status: [
        "pending",
        "active",
        "rejected",
        "completed",
        "paused",
        "ended",
      ],
      event_type: ["download", "signup", "purchase"],
      moq_unit: ["liter", "kg", "piece"],
      offline_order_status: [
        "pending_acceptance",
        "accepted",
        "fulfilled_by_advertiser",
        "confirmed_by_admin",
        "expired",
        "rejected",
      ],
      source_type: ["web", "android", "ios"],
    },
  },
} as const
