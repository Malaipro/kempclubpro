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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      achievements: {
        Row: {
          badge_type: string
          category: string
          created_at: string
          criteria: Json
          description: string
          icon_color: string | null
          icon_name: string | null
          id: string
          is_active: boolean | null
          name: string
          points_reward: number | null
        }
        Insert: {
          badge_type: string
          category: string
          created_at?: string
          criteria: Json
          description: string
          icon_color?: string | null
          icon_name?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          points_reward?: number | null
        }
        Update: {
          badge_type?: string
          category?: string
          created_at?: string
          criteria?: Json
          description?: string
          icon_color?: string | null
          icon_name?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          points_reward?: number | null
        }
        Relationships: []
      }
      challenges: {
        Row: {
          challenge_type: string
          created_at: string
          description: string | null
          end_date: string | null
          id: string
          is_active: boolean | null
          max_participants: number | null
          name: string
          points_reward: number | null
          requirements: Json | null
          start_date: string | null
        }
        Insert: {
          challenge_type: string
          created_at?: string
          description?: string | null
          end_date?: string | null
          id?: string
          is_active?: boolean | null
          max_participants?: number | null
          name: string
          points_reward?: number | null
          requirements?: Json | null
          start_date?: string | null
        }
        Update: {
          challenge_type?: string
          created_at?: string
          description?: string | null
          end_date?: string | null
          id?: string
          is_active?: boolean | null
          max_participants?: number | null
          name?: string
          points_reward?: number | null
          requirements?: Json | null
          start_date?: string | null
        }
        Relationships: []
      }
      leaderboard: {
        Row: {
          bjj_points: number | null
          challenges_points: number | null
          id: string
          kickboxing_points: number | null
          last_updated: string | null
          monthly_points: number | null
          ofp_points: number | null
          rank_position: number | null
          tactical_points: number | null
          theory_points: number | null
          total_points: number | null
          user_id: string
        }
        Insert: {
          bjj_points?: number | null
          challenges_points?: number | null
          id?: string
          kickboxing_points?: number | null
          last_updated?: string | null
          monthly_points?: number | null
          ofp_points?: number | null
          rank_position?: number | null
          tactical_points?: number | null
          theory_points?: number | null
          total_points?: number | null
          user_id: string
        }
        Update: {
          bjj_points?: number | null
          challenges_points?: number | null
          id?: string
          kickboxing_points?: number | null
          last_updated?: string | null
          monthly_points?: number | null
          ofp_points?: number | null
          rank_position?: number | null
          tactical_points?: number | null
          theory_points?: number | null
          total_points?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "leaderboard_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      notifications: {
        Row: {
          action_url: string | null
          created_at: string
          id: string
          is_read: boolean | null
          message: string
          notification_type: string | null
          title: string
          user_id: string
        }
        Insert: {
          action_url?: string | null
          created_at?: string
          id?: string
          is_read?: boolean | null
          message: string
          notification_type?: string | null
          title: string
          user_id: string
        }
        Update: {
          action_url?: string | null
          created_at?: string
          id?: string
          is_read?: boolean | null
          message?: string
          notification_type?: string | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          first_name: string | null
          id: string
          join_date: string | null
          last_name: string | null
          phone: string | null
          rank_position: number | null
          telegram: string | null
          total_points: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          first_name?: string | null
          id?: string
          join_date?: string | null
          last_name?: string | null
          phone?: string | null
          rank_position?: number | null
          telegram?: string | null
          total_points?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          first_name?: string | null
          id?: string
          join_date?: string | null
          last_name?: string | null
          phone?: string | null
          rank_position?: number | null
          telegram?: string | null
          total_points?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      trainers: {
        Row: {
          bio: string | null
          created_at: string
          experience: number | null
          id: string
          image_url: string | null
          is_active: boolean | null
          name: string
          quote: string | null
          role: string
          sort_order: number | null
          updated_at: string | null
        }
        Insert: {
          bio?: string | null
          created_at?: string
          experience?: number | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          name: string
          quote?: string | null
          role: string
          sort_order?: number | null
          updated_at?: string | null
        }
        Update: {
          bio?: string | null
          created_at?: string
          experience?: number | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          name?: string
          quote?: string | null
          role?: string
          sort_order?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      training_programs: {
        Row: {
          category: string
          created_at: string
          description: string | null
          difficulty_level: number | null
          duration_minutes: number | null
          id: string
          image_url: string | null
          is_active: boolean | null
          name: string
          points_reward: number | null
        }
        Insert: {
          category: string
          created_at?: string
          description?: string | null
          difficulty_level?: number | null
          duration_minutes?: number | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          name: string
          points_reward?: number | null
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          difficulty_level?: number | null
          duration_minutes?: number | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          name?: string
          points_reward?: number | null
        }
        Relationships: []
      }
      training_sessions: {
        Row: {
          created_at: string
          id: string
          notes: string | null
          points_earned: number | null
          program_id: string | null
          session_date: string | null
          session_type: string
          trainer_id: string | null
          user_id: string
          verified: boolean | null
          verified_by: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string | null
          points_earned?: number | null
          program_id?: string | null
          session_date?: string | null
          session_type: string
          trainer_id?: string | null
          user_id: string
          verified?: boolean | null
          verified_by?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string | null
          points_earned?: number | null
          program_id?: string | null
          session_date?: string | null
          session_type?: string
          trainer_id?: string | null
          user_id?: string
          verified?: boolean | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "training_sessions_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "training_programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_sessions_trainer_id_fkey"
            columns: ["trainer_id"]
            isOneToOne: false
            referencedRelation: "trainers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "training_sessions_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "trainers"
            referencedColumns: ["id"]
          },
        ]
      }
      user_achievements: {
        Row: {
          achievement_id: string
          earned_at: string | null
          id: string
          is_completed: boolean | null
          notes: string | null
          progress: number | null
          user_id: string
          verified_by: string | null
        }
        Insert: {
          achievement_id: string
          earned_at?: string | null
          id?: string
          is_completed?: boolean | null
          notes?: string | null
          progress?: number | null
          user_id: string
          verified_by?: string | null
        }
        Update: {
          achievement_id?: string
          earned_at?: string | null
          id?: string
          is_completed?: boolean | null
          notes?: string | null
          progress?: number | null
          user_id?: string
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_achievements_achievement_id_fkey"
            columns: ["achievement_id"]
            isOneToOne: false
            referencedRelation: "achievements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_achievements_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "user_achievements_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "trainers"
            referencedColumns: ["id"]
          },
        ]
      }
      user_challenges: {
        Row: {
          challenge_id: string
          completed_at: string | null
          id: string
          is_completed: boolean | null
          joined_at: string | null
          points_earned: number | null
          progress: number | null
          result_data: Json | null
          user_id: string
        }
        Insert: {
          challenge_id: string
          completed_at?: string | null
          id?: string
          is_completed?: boolean | null
          joined_at?: string | null
          points_earned?: number | null
          progress?: number | null
          result_data?: Json | null
          user_id: string
        }
        Update: {
          challenge_id?: string
          completed_at?: string | null
          id?: string
          is_completed?: boolean | null
          joined_at?: string | null
          points_earned?: number | null
          progress?: number | null
          result_data?: Json | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_challenges_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "challenges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_challenges_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
