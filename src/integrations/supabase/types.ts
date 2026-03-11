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
      iptv_panels: {
        Row: {
          admin_password: string
          admin_user: string
          created_at: string
          id: string
          is_active: boolean
          name: string
          notes: string | null
          panel_type: string
          renewal_url: string | null
          updated_at: string
          url: string
        }
        Insert: {
          admin_password: string
          admin_user: string
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          notes?: string | null
          panel_type?: string
          renewal_url?: string | null
          updated_at?: string
          url: string
        }
        Update: {
          admin_password?: string
          admin_user?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          notes?: string | null
          panel_type?: string
          renewal_url?: string | null
          updated_at?: string
          url?: string
        }
        Relationships: []
      }
      customer_records: {
        Row: {
          id: string
          client_name: string
          username: string
          password: string
          expiry_month: string
          status: string
          next_renewal: string
          contact_number: string
          value: number
          expense: number
          profit: number
          subscription_value: number
          login_type: string
          sheet_month: string
          text_color: string | null
          created_at: string
        }
        Insert: {
          id?: string
          client_name: string
          username: string
          password: string
          expiry_month: string
          status?: string
          next_renewal: string
          contact_number: string
          value?: number
          expense?: number
          profit?: number
          subscription_value?: number
          login_type?: string
          sheet_month?: string
          text_color?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          client_name?: string
          username?: string
          password?: string
          expiry_month?: string
          status?: string
          next_renewal?: string
          contact_number?: string
          value?: number
          expense?: number
          profit?: number
          subscription_value?: number
          login_type?: string
          sheet_month?: string
          text_color?: string | null
          created_at?: string
        }
        Relationships: []
      }
      iptv_users: {
        Row: {
          amount_due: number
          created_at: string
          created_by: string | null
          customer_email: string | null
          customer_name: string | null
          id: string
          is_active: boolean
          plan_id: string | null
          updated_at: string
          username: string
        }
        Insert: {
          amount_due: number
          created_at?: string
          created_by?: string | null
          customer_email?: string | null
          customer_name?: string | null
          id?: string
          is_active?: boolean
          plan_id?: string | null
          updated_at?: string
          username: string
        }
        Update: {
          amount_due?: number
          created_at?: string
          created_by?: string | null
          customer_email?: string | null
          customer_name?: string | null
          id?: string
          is_active?: boolean
          plan_id?: string | null
          updated_at?: string
          username?: string
        }
        Relationships: [
          {
            foreignKeyName: "iptv_users_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      monthly_statements: {
        Row: {
          created_at: string | null
          gross_revenue: number
          id: string
          month: number
          net_profit: number
          renewed_plans: number
          total_expenses: number
          total_payments: number
          updated_at: string | null
          year: number
        }
        Insert: {
          created_at?: string | null
          gross_revenue?: number
          id?: string
          month: number
          net_profit?: number
          renewed_plans?: number
          total_expenses?: number
          total_payments?: number
          updated_at?: string | null
          year: number
        }
        Update: {
          created_at?: string | null
          gross_revenue?: number
          id?: string
          month?: number
          net_profit?: number
          renewed_plans?: number
          total_expenses?: number
          total_payments?: number
          updated_at?: string | null
          year?: number
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          customer_email: string | null
          customer_name: string | null
          id: string
          iptv_username: string
          mp_payment_id: string | null
          mp_preference_id: string | null
          paid_at: string | null
          panel_id: string | null
          plan_id: string | null
          renewal_message: string | null
          renewal_status: string | null
          status: string
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          customer_email?: string | null
          customer_name?: string | null
          id?: string
          iptv_username: string
          mp_payment_id?: string | null
          mp_preference_id?: string | null
          paid_at?: string | null
          panel_id?: string | null
          plan_id?: string | null
          renewal_message?: string | null
          renewal_status?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          customer_email?: string | null
          customer_name?: string | null
          id?: string
          iptv_username?: string
          mp_payment_id?: string | null
          mp_preference_id?: string | null
          paid_at?: string | null
          panel_id?: string | null
          plan_id?: string | null
          renewal_message?: string | null
          renewal_status?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_panel_id_fkey"
            columns: ["panel_id"]
            isOneToOne: false
            referencedRelation: "iptv_panels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      plans: {
        Row: {
          created_at: string
          description: string | null
          duration_days: number
          id: string
          is_active: boolean
          name: string
          panel_id: string | null
          price: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          duration_days: number
          id?: string
          is_active?: boolean
          name: string
          panel_id?: string | null
          price: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          duration_days?: number
          id?: string
          is_active?: boolean
          name?: string
          panel_id?: string | null
          price?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "plans_panel_id_fkey"
            columns: ["panel_id"]
            isOneToOne: false
            referencedRelation: "iptv_panels"
            referencedColumns: ["id"]
          },
        ]
      }
      settings: {
        Row: {
          created_at: string
          description: string | null
          id: string
          key: string
          updated_at: string
          value: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          key: string
          updated_at?: string
          value?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          key?: string
          updated_at?: string
          value?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          user_id?: string
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
    },
  },
} as const
