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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      community_boards: {
        Row: {
          created_at: string
          description: Json
          id: string
          image: string | null
          name: Json
          published: boolean
          slug: string
          sort_order: number
          tone: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: Json
          id?: string
          image?: string | null
          name?: Json
          published?: boolean
          slug: string
          sort_order?: number
          tone?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: Json
          id?: string
          image?: string | null
          name?: Json
          published?: boolean
          slug?: string
          sort_order?: number
          tone?: string
          updated_at?: string
        }
        Relationships: []
      }
      community_comments: {
        Row: {
          author_id: string
          body: string
          created_at: string
          id: string
          post_id: string
        }
        Insert: {
          author_id: string
          body: string
          created_at?: string
          id?: string
          post_id: string
        }
        Update: {
          author_id?: string
          body?: string
          created_at?: string
          id?: string
          post_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "community_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      community_post_votes: {
        Row: {
          created_at: string
          post_id: string
          user_id: string
          value: number
        }
        Insert: {
          created_at?: string
          post_id: string
          user_id: string
          value: number
        }
        Update: {
          created_at?: string
          post_id?: string
          user_id?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "community_post_votes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "community_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      community_posts: {
        Row: {
          author_id: string
          board_slug: string
          comment_count: number
          created_at: string
          id: string
          score: number
          title: string
        }
        Insert: {
          author_id: string
          board_slug: string
          comment_count?: number
          created_at?: string
          id?: string
          score?: number
          title: string
        }
        Update: {
          author_id?: string
          board_slug?: string
          comment_count?: number
          created_at?: string
          id?: string
          score?: number
          title?: string
        }
        Relationships: []
      }
      community_reports: {
        Row: {
          created_at: string
          id: string
          reason: string | null
          reporter_id: string
          status: string
          target_id: string
          target_type: string
        }
        Insert: {
          created_at?: string
          id?: string
          reason?: string | null
          reporter_id: string
          status?: string
          target_id: string
          target_type: string
        }
        Update: {
          created_at?: string
          id?: string
          reason?: string | null
          reporter_id?: string
          status?: string
          target_id?: string
          target_type?: string
        }
        Relationships: []
      }
      companies: {
        Row: {
          analyst_consensus: Json
          capital_allocation: Json
          cash_flow: Json
          company_timeline: Json
          current_projects: Json
          customer_concentration: Json
          debt_maturity: Json
          decision_card: Json
          employee_count: string | null
          forward_estimates: Json
          geographic_revenue: Json
          historical_valuation: Json
          insider_ownership: string | null
          insider_trades: Json
          management_team: Json
          margin_trend: Json
          operational_kpis: Json
          quarterly_results: Json
          regulatory_env: Json
          risk_items: Json
          segment_profit: Json
          share_count: Json
          valuation_scenarios: Json
          balance_sheet: Json
          ceo: Json | null
          change: string
          competitors: Json | null
          country: Json
          created_at: string
          data_sources: Json
          description: Json
          dividends: Json | null
          exchange: string
          executive_summary: Json | null
          financial_health: Json | null
          financial_ratios: Json
          financials: Json
          founded_year: number | null
          goals: Json
          growth_outlook: Json | null
          headquarters: Json | null
          how_to_buy: Json
          id: string
          logo: string | null
          market_cap: string
          name: Json
          news: Json
          official_docs: Json
          ownership: Json
          price: string
          published: boolean
          revenue_breakdown: Json
          sections: Json
          sector_id: string | null
          short: Json
          short_interest: Json
          slug: string
          sort_order: number
          stock_performance: Json | null
          ticker: string
          trading_stats: Json
          upcoming_events: Json
          updated_at: string
          valuation: Json
          website: string | null
        }
        Insert: {
          analyst_consensus?: Json
          capital_allocation?: Json
          cash_flow?: Json
          company_timeline?: Json
          current_projects?: Json
          customer_concentration?: Json
          debt_maturity?: Json
          decision_card?: Json
          employee_count?: string | null
          forward_estimates?: Json
          geographic_revenue?: Json
          historical_valuation?: Json
          insider_ownership?: string | null
          insider_trades?: Json
          management_team?: Json
          margin_trend?: Json
          operational_kpis?: Json
          quarterly_results?: Json
          regulatory_env?: Json
          risk_items?: Json
          segment_profit?: Json
          share_count?: Json
          valuation_scenarios?: Json
          balance_sheet?: Json
          ceo?: Json | null
          change?: string
          competitors?: Json | null
          country?: Json
          created_at?: string
          data_sources?: Json
          description?: Json
          dividends?: Json | null
          exchange?: string
          executive_summary?: Json | null
          financial_health?: Json | null
          financial_ratios?: Json
          financials?: Json
          founded_year?: number | null
          goals?: Json
          growth_outlook?: Json | null
          headquarters?: Json | null
          how_to_buy?: Json
          id?: string
          logo?: string | null
          market_cap?: string
          name?: Json
          news?: Json
          official_docs?: Json
          ownership?: Json
          price?: string
          published?: boolean
          revenue_breakdown?: Json
          sections?: Json
          sector_id?: string | null
          short?: Json
          short_interest?: Json
          slug: string
          sort_order?: number
          stock_performance?: Json | null
          ticker?: string
          trading_stats?: Json
          upcoming_events?: Json
          updated_at?: string
          valuation?: Json
          website?: string | null
        }
        Update: {
          analyst_consensus?: Json
          capital_allocation?: Json
          cash_flow?: Json
          company_timeline?: Json
          current_projects?: Json
          customer_concentration?: Json
          debt_maturity?: Json
          decision_card?: Json
          employee_count?: string | null
          forward_estimates?: Json
          geographic_revenue?: Json
          historical_valuation?: Json
          insider_ownership?: string | null
          insider_trades?: Json
          management_team?: Json
          margin_trend?: Json
          operational_kpis?: Json
          quarterly_results?: Json
          regulatory_env?: Json
          risk_items?: Json
          segment_profit?: Json
          share_count?: Json
          valuation_scenarios?: Json
          balance_sheet?: Json
          ceo?: Json | null
          change?: string
          competitors?: Json | null
          country?: Json
          created_at?: string
          data_sources?: Json
          description?: Json
          dividends?: Json | null
          exchange?: string
          executive_summary?: Json | null
          financial_health?: Json | null
          financial_ratios?: Json
          financials?: Json
          founded_year?: number | null
          goals?: Json
          growth_outlook?: Json | null
          headquarters?: Json | null
          how_to_buy?: Json
          id?: string
          logo?: string | null
          market_cap?: string
          name?: Json
          news?: Json
          official_docs?: Json
          ownership?: Json
          price?: string
          published?: boolean
          revenue_breakdown?: Json
          sections?: Json
          sector_id?: string | null
          short?: Json
          short_interest?: Json
          slug?: string
          sort_order?: number
          stock_performance?: Json | null
          ticker?: string
          trading_stats?: Json
          upcoming_events?: Json
          updated_at?: string
          valuation?: Json
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "companies_sector_id_fkey"
            columns: ["sector_id"]
            isOneToOne: false
            referencedRelation: "sectors"
            referencedColumns: ["id"]
          },
        ]
      }
      faqs: {
        Row: {
          answer: Json
          company_id: string | null
          created_at: string
          id: string
          published: boolean
          question: Json
          sort_order: number
          updated_at: string
        }
        Insert: {
          answer?: Json
          company_id?: string | null
          created_at?: string
          id?: string
          published?: boolean
          question?: Json
          sort_order?: number
          updated_at?: string
        }
        Update: {
          answer?: Json
          company_id?: string | null
          created_at?: string
          id?: string
          published?: boolean
          question?: Json
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "faqs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      knowledge_articles: {
        Row: {
          category: Json
          created_at: string
          icon: string
          id: string
          level: Json
          published: boolean
          reading_time: number
          sections: Json
          slug: string
          sort_order: number
          summary: Json
          title: Json
          updated_at: string
          videos: Json
        }
        Insert: {
          category?: Json
          created_at?: string
          icon?: string
          id?: string
          level?: Json
          published?: boolean
          reading_time?: number
          sections?: Json
          slug: string
          sort_order?: number
          summary?: Json
          title?: Json
          updated_at?: string
          videos?: Json
        }
        Update: {
          category?: Json
          created_at?: string
          icon?: string
          id?: string
          level?: Json
          published?: boolean
          reading_time?: number
          sections?: Json
          slug?: string
          sort_order?: number
          summary?: Json
          title?: Json
          updated_at?: string
          videos?: Json
        }
        Relationships: []
      }
      newsletter_subscribers: {
        Row: {
          created_at: string
          email: string
          id: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          email: string | null
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          email?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      research: {
        Row: {
          author: Json
          author_role: Json
          created_at: string
          id: string
          image: string
          published: boolean
          published_at: string
          reading_time: number
          refs: Json
          sections: Json
          sector_id: string | null
          slug: string
          summary: Json
          tags: Json
          title: Json
          updated_at: string
        }
        Insert: {
          author?: Json
          author_role?: Json
          created_at?: string
          id?: string
          image?: string
          published?: boolean
          published_at?: string
          reading_time?: number
          refs?: Json
          sections?: Json
          sector_id?: string | null
          slug: string
          summary?: Json
          tags?: Json
          title?: Json
          updated_at?: string
        }
        Update: {
          author?: Json
          author_role?: Json
          created_at?: string
          id?: string
          image?: string
          published?: boolean
          published_at?: string
          reading_time?: number
          refs?: Json
          sections?: Json
          sector_id?: string | null
          slug?: string
          summary?: Json
          tags?: Json
          title?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "research_sector_id_fkey"
            columns: ["sector_id"]
            isOneToOne: false
            referencedRelation: "sectors"
            referencedColumns: ["id"]
          },
        ]
      }
      sectors: {
        Row: {
          about: Json
          created_at: string
          description: Json
          icon: string
          id: string
          image: string | null
          name: Json
          performance_summary: Json
          performance_updated_at: string | null
          published: boolean
          slug: string
          sort_order: number
          tagline: Json
          tone: string
          updated_at: string
        }
        Insert: {
          about?: Json
          created_at?: string
          description?: Json
          icon?: string
          id?: string
          image?: string | null
          name?: Json
          performance_summary?: Json
          performance_updated_at?: string | null
          published?: boolean
          slug: string
          sort_order?: number
          tagline?: Json
          tone?: string
          updated_at?: string
        }
        Update: {
          about?: Json
          created_at?: string
          description?: Json
          icon?: string
          id?: string
          image?: string | null
          name?: Json
          performance_summary?: Json
          performance_updated_at?: string | null
          published?: boolean
          slug?: string
          sort_order?: number
          tagline?: Json
          tone?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      watchlist: {
        Row: {
          company_id: string
          created_at: string
          user_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          user_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "watchlist_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
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
      is_content_manager: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "editor" | "user"
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
      app_role: ["admin", "editor", "user"],
    },
  },
} as const
