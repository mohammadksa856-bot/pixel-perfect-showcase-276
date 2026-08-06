export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.15";
  };
  public: {
    Tables: {
      community_posts: {
        Row: {
          author_id: string;
          board_slug: string;
          comment_count: number;
          created_at: string;
          id: string;
          score: number;
          title: string;
        };
        Insert: {
          author_id: string;
          board_slug: string;
          comment_count?: number;
          created_at?: string;
          id?: string;
          score?: number;
          title: string;
        };
        Update: {
          author_id?: string;
          board_slug?: string;
          comment_count?: number;
          created_at?: string;
          id?: string;
          score?: number;
          title?: string;
        };
        Relationships: [];
      };
      community_post_votes: {
        Row: {
          created_at: string;
          post_id: string;
          user_id: string;
          value: number;
        };
        Insert: {
          created_at?: string;
          post_id: string;
          user_id: string;
          value: number;
        };
        Update: {
          created_at?: string;
          post_id?: string;
          user_id?: string;
          value?: number;
        };
        Relationships: [];
      };
      community_comments: {
        Row: {
          author_id: string;
          body: string;
          created_at: string;
          id: string;
          post_id: string;
        };
        Insert: {
          author_id: string;
          body: string;
          created_at?: string;
          id?: string;
          post_id: string;
        };
        Update: {
          author_id?: string;
          body?: string;
          created_at?: string;
          id?: string;
          post_id?: string;
        };
        Relationships: [];
      };
      companies: {
        Row: {
          change: string;
          country: Json;
          created_at: string;
          description: Json;
          exchange: string;
          financials: Json;
          goals: Json;
          how_to_buy: Json;
          id: string;
          market_cap: string;
          name: Json;
          news: Json;
          price: string;
          published: boolean;
          sections: Json;
          sector_id: string | null;
          short: Json;
          slug: string;
          sort_order: number;
          ticker: string;
          updated_at: string;
          valuation: Json;
        };
        Insert: {
          change?: string;
          country?: Json;
          created_at?: string;
          description?: Json;
          exchange?: string;
          financials?: Json;
          goals?: Json;
          how_to_buy?: Json;
          id?: string;
          market_cap?: string;
          name?: Json;
          news?: Json;
          price?: string;
          published?: boolean;
          sections?: Json;
          sector_id?: string | null;
          short?: Json;
          slug: string;
          sort_order?: number;
          ticker?: string;
          updated_at?: string;
          valuation?: Json;
        };
        Update: {
          change?: string;
          country?: Json;
          created_at?: string;
          description?: Json;
          exchange?: string;
          financials?: Json;
          goals?: Json;
          how_to_buy?: Json;
          id?: string;
          market_cap?: string;
          name?: Json;
          news?: Json;
          price?: string;
          published?: boolean;
          sections?: Json;
          sector_id?: string | null;
          short?: Json;
          slug?: string;
          sort_order?: number;
          ticker?: string;
          updated_at?: string;
          valuation?: Json;
        };
        Relationships: [
          {
            foreignKeyName: "companies_sector_id_fkey";
            columns: ["sector_id"];
            isOneToOne: false;
            referencedRelation: "sectors";
            referencedColumns: ["id"];
          },
        ];
      };
      faqs: {
        Row: {
          answer: Json;
          company_id: string | null;
          created_at: string;
          id: string;
          published: boolean;
          question: Json;
          sort_order: number;
          updated_at: string;
        };
        Insert: {
          answer?: Json;
          company_id?: string | null;
          created_at?: string;
          id?: string;
          published?: boolean;
          question?: Json;
          sort_order?: number;
          updated_at?: string;
        };
        Update: {
          answer?: Json;
          company_id?: string | null;
          created_at?: string;
          id?: string;
          published?: boolean;
          question?: Json;
          sort_order?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "faqs_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
        ];
      };
      knowledge_articles: {
        Row: {
          category: Json;
          created_at: string;
          icon: string;
          id: string;
          level: Json;
          published: boolean;
          reading_time: number;
          sections: Json;
          slug: string;
          sort_order: number;
          summary: Json;
          title: Json;
          updated_at: string;
          videos: Json;
        };
        Insert: {
          category?: Json;
          created_at?: string;
          icon?: string;
          id?: string;
          level?: Json;
          published?: boolean;
          reading_time?: number;
          sections?: Json;
          slug: string;
          sort_order?: number;
          summary?: Json;
          title?: Json;
          updated_at?: string;
          videos?: Json;
        };
        Update: {
          category?: Json;
          created_at?: string;
          icon?: string;
          id?: string;
          level?: Json;
          published?: boolean;
          reading_time?: number;
          sections?: Json;
          slug?: string;
          sort_order?: number;
          summary?: Json;
          title?: Json;
          updated_at?: string;
          videos?: Json;
        };
        Relationships: [];
      };
      newsletter_subscribers: {
        Row: {
          created_at: string;
          email: string;
          id: string;
        };
        Insert: {
          created_at?: string;
          email: string;
          id?: string;
        };
        Update: {
          created_at?: string;
          email?: string;
          id?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          created_at: string;
          display_name: string | null;
          email: string | null;
          id: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          display_name?: string | null;
          email?: string | null;
          id: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          display_name?: string | null;
          email?: string | null;
          id?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      research: {
        Row: {
          author: Json;
          author_role: Json;
          created_at: string;
          id: string;
          image: string;
          published: boolean;
          published_at: string;
          reading_time: number;
          refs: Json;
          sections: Json;
          sector_id: string | null;
          slug: string;
          summary: Json;
          tags: Json;
          title: Json;
          updated_at: string;
        };
        Insert: {
          author?: Json;
          author_role?: Json;
          created_at?: string;
          id?: string;
          image?: string;
          published?: boolean;
          published_at?: string;
          reading_time?: number;
          refs?: Json;
          sections?: Json;
          sector_id?: string | null;
          slug: string;
          summary?: Json;
          tags?: Json;
          title?: Json;
          updated_at?: string;
        };
        Update: {
          author?: Json;
          author_role?: Json;
          created_at?: string;
          id?: string;
          image?: string;
          published?: boolean;
          published_at?: string;
          reading_time?: number;
          refs?: Json;
          sections?: Json;
          sector_id?: string | null;
          slug?: string;
          summary?: Json;
          tags?: Json;
          title?: Json;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "research_sector_id_fkey";
            columns: ["sector_id"];
            isOneToOne: false;
            referencedRelation: "sectors";
            referencedColumns: ["id"];
          },
        ];
      };
      sectors: {
        Row: {
          about: Json;
          created_at: string;
          description: Json;
          icon: string;
          id: string;
          name: Json;
          published: boolean;
          slug: string;
          sort_order: number;
          tagline: Json;
          tone: string;
          updated_at: string;
        };
        Insert: {
          about?: Json;
          created_at?: string;
          description?: Json;
          icon?: string;
          id?: string;
          name?: Json;
          published?: boolean;
          slug: string;
          sort_order?: number;
          tagline?: Json;
          tone?: string;
          updated_at?: string;
        };
        Update: {
          about?: Json;
          created_at?: string;
          description?: Json;
          icon?: string;
          id?: string;
          name?: Json;
          published?: boolean;
          slug?: string;
          sort_order?: number;
          tagline?: Json;
          tone?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      user_roles: {
        Row: {
          created_at: string;
          id: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          role?: Database["public"]["Enums"]["app_role"];
          user_id?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"];
          _user_id: string;
        };
        Returns: boolean;
      };
      is_content_manager: { Args: { _user_id: string }; Returns: boolean };
    };
    Enums: {
      app_role: "admin" | "editor" | "user";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema["CompositeTypes"] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "editor", "user"],
    },
  },
} as const;
