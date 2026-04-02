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
          category_id: string
          created_at: string
          id: string
          status: string
        }
        Insert: {
          advertiser_id: string
          category_id: string
          created_at?: string
          id?: string
          status?: string
        }
        Update: {
          advertiser_id?: string
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
          advertiser_id: string
          budget_remaining: number
          created_at: string
          id: string
          integration_type: string
          integration_verified: boolean
          name: string
          price_download: number
          price_purchase: number
          price_signup: number
          selected_milestones: string[]
          status: Database["public"]["Enums"]["campaign_status"]
          target_users: number
          total_cost: number
        }
        Insert: {
          advertiser_id: string
          budget_remaining?: number
          created_at?: string
          id?: string
          integration_type?: string
          integration_verified?: boolean
          name: string
          price_download?: number
          price_purchase?: number
          price_signup?: number
          selected_milestones?: string[]
          status?: Database["public"]["Enums"]["campaign_status"]
          target_users?: number
          total_cost?: number
        }
        Update: {
          advertiser_id?: string
          budget_remaining?: number
          created_at?: string
          id?: string
          integration_type?: string
          integration_verified?: boolean
          name?: string
          price_download?: number
          price_purchase?: number
          price_signup?: number
          selected_milestones?: string[]
          status?: Database["public"]["Enums"]["campaign_status"]
          target_users?: number
          total_cost?: number
        }
        Relationships: []
      }
      categories: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
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
      app_role: ["admin", "user"],
      campaign_status: ["pending", "active", "rejected"],
      event_type: ["download", "signup", "purchase"],
      source_type: ["web", "android", "ios"],
    },
  },
} as const
