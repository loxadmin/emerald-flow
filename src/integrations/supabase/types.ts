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
      campaigns: {
        Row: {
          ad_type: Database["public"]["Enums"]["advertiser_type"] | null
          advertiser_id: string
          budget_remaining: number
          created_at: string
          id: string
          integration_type: string
          integration_verified: boolean
          is_draft: boolean
          name: string
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
          budget_remaining?: number
          created_at?: string
          id?: string
          integration_type?: string
          integration_verified?: boolean
          is_draft?: boolean
          name: string
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
          budget_remaining?: number
          created_at?: string
          id?: string
          integration_type?: string
          integration_verified?: boolean
          is_draft?: boolean
          name?: string
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
          id: string
          is_active: boolean
          is_partnership: boolean
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          is_partnership?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          is_partnership?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
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
          id: string
          media_link: string
          media_type: string
          min_interactions: number
          placement_fee: number
          rate_per_interaction: number
          transcription: string | null
          transcription_confirmed: boolean | null
          updated_at: string
        }
        Insert: {
          advertiser_id: string
          campaign_id: string
          created_at?: string
          id?: string
          media_link: string
          media_type: string
          min_interactions?: number
          placement_fee?: number
          rate_per_interaction?: number
          transcription?: string | null
          transcription_confirmed?: boolean | null
          updated_at?: string
        }
        Update: {
          advertiser_id?: string
          campaign_id?: string
          created_at?: string
          id?: string
          media_link?: string
          media_type?: string
          min_interactions?: number
          placement_fee?: number
          rate_per_interaction?: number
          transcription?: string | null
          transcription_confirmed?: boolean | null
          updated_at?: string
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
      profiles: {
        Row: {
          company_name: string | null
          created_at: string
          email: string
          full_name: string | null
          id: string
          website: string | null
        }
        Insert: {
          company_name?: string | null
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          website?: string | null
        }
        Update: {
          company_name?: string | null
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          website?: string | null
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
        }
        Insert: {
          campaign_id: string
          external_user_id: string
          first_seen_at?: string
          id?: string
          referral_id?: string | null
        }
        Update: {
          campaign_id?: string
          external_user_id?: string
          first_seen_at?: string
          id?: string
          referral_id?: string | null
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
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
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
      advertiser_type: "engagement" | "performance" | "commerce"
      app_role: "admin" | "user"
      campaign_status: "pending" | "active" | "rejected"
      event_type: "download" | "signup" | "purchase"
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
      ],
      advertiser_type: ["engagement", "performance", "commerce"],
      app_role: ["admin", "user"],
      campaign_status: ["pending", "active", "rejected"],
      event_type: ["download", "signup", "purchase"],
      source_type: ["web", "android", "ios"],
    },
  },
} as const
