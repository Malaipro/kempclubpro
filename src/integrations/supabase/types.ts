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
      achievement_types: {
        Row: {
          color: string
          created_at: string
          description: string | null
          icon: string
          id: string
          name: string
          shape: string
        }
        Insert: {
          color: string
          created_at?: string
          description?: string | null
          icon: string
          id?: string
          name: string
          shape: string
        }
        Update: {
          color?: string
          created_at?: string
          description?: string | null
          icon?: string
          id?: string
          name?: string
          shape?: string
        }
        Relationships: []
      }
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
      activities: {
        Row: {
          category: string
          created_at: string
          description: string | null
          difficulty_level: number | null
          duration_minutes: number | null
          id: string
          is_active: boolean | null
          name: string
          points: number | null
          updated_at: string
        }
        Insert: {
          category: string
          created_at?: string
          description?: string | null
          difficulty_level?: number | null
          duration_minutes?: number | null
          id?: string
          is_active?: boolean | null
          name: string
          points?: number | null
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          difficulty_level?: number | null
          duration_minutes?: number | null
          id?: string
          is_active?: boolean | null
          name?: string
          points?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      admin_access_log: {
        Row: {
          accessed_at: string | null
          action: string
          admin_user_id: string | null
          id: string
          ip_address: unknown
          table_name: string
          user_agent: string | null
        }
        Insert: {
          accessed_at?: string | null
          action: string
          admin_user_id?: string | null
          id?: string
          ip_address?: unknown
          table_name: string
          user_agent?: string | null
        }
        Update: {
          accessed_at?: string | null
          action?: string
          admin_user_id?: string | null
          id?: string
          ip_address?: unknown
          table_name?: string
          user_agent?: string | null
        }
        Relationships: []
      }
      admin_sessions: {
        Row: {
          created_at: string | null
          expires_at: string | null
          id: string
          ip_address: unknown
          is_active: boolean | null
          last_activity: string | null
          session_token: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          expires_at?: string | null
          id?: string
          ip_address?: unknown
          is_active?: boolean | null
          last_activity?: string | null
          session_token: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          expires_at?: string | null
          id?: string
          ip_address?: unknown
          is_active?: boolean | null
          last_activity?: string | null
          session_token?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      ascetic_activities: {
        Row: {
          activity_type: string
          challenge_duration: number | null
          challenge_name: string | null
          completed_at: string
          completion_percentage: number | null
          created_at: string
          duration_minutes: number | null
          id: string
          notes: string | null
          points_earned: number | null
          user_id: string
          verified: boolean | null
          verified_by: string | null
        }
        Insert: {
          activity_type: string
          challenge_duration?: number | null
          challenge_name?: string | null
          completed_at?: string
          completion_percentage?: number | null
          created_at?: string
          duration_minutes?: number | null
          id?: string
          notes?: string | null
          points_earned?: number | null
          user_id: string
          verified?: boolean | null
          verified_by?: string | null
        }
        Update: {
          activity_type?: string
          challenge_duration?: number | null
          challenge_name?: string | null
          completed_at?: string
          completion_percentage?: number | null
          created_at?: string
          duration_minutes?: number | null
          id?: string
          notes?: string | null
          points_earned?: number | null
          user_id?: string
          verified?: boolean | null
          verified_by?: string | null
        }
        Relationships: []
      }
      ascetic_types: {
        Row: {
          created_at: string
          default_duration_minutes: number | null
          default_points: number | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          default_duration_minutes?: number | null
          default_points?: number | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          default_duration_minutes?: number | null
          default_points?: number | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      audit_log: {
        Row: {
          action: string
          id: string
          ip_address: unknown
          record_id: string | null
          table_name: string | null
          timestamp: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          id?: string
          ip_address?: unknown
          record_id?: string | null
          table_name?: string | null
          timestamp?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          id?: string
          ip_address?: unknown
          record_id?: string | null
          table_name?: string | null
          timestamp?: string | null
          user_agent?: string | null
          user_id?: string | null
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
      coin_rules: {
        Row: {
          code: string
          coin_amount: number
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          code: string
          coin_amount?: number
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          code?: string
          coin_amount?: number
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      coin_transactions: {
        Row: {
          amount: number
          created_at: string
          created_by: string | null
          id: string
          reason: string
          rule_id: string | null
          source_id: string | null
          source_type: string | null
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          created_by?: string | null
          id?: string
          reason: string
          rule_id?: string | null
          source_id?: string | null
          source_type?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string | null
          id?: string
          reason?: string
          rule_id?: string | null
          source_id?: string | null
          source_type?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "coin_transactions_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "coin_rules"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_rate_limit: {
        Row: {
          created_at: string | null
          id: string
          ip_address: unknown
          submission_count: number | null
          window_start: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          ip_address: unknown
          submission_count?: number | null
          window_start?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          ip_address?: unknown
          submission_count?: number | null
          window_start?: string | null
        }
        Relationships: []
      }
      contact_submissions: {
        Row: {
          course: string
          created_at: string
          id: string
          message: string | null
          name: string
          phone: string
          processed: boolean | null
          processed_at: string | null
          processed_by: string | null
          social: string | null
        }
        Insert: {
          course: string
          created_at?: string
          id?: string
          message?: string | null
          name: string
          phone: string
          processed?: boolean | null
          processed_at?: string | null
          processed_by?: string | null
          social?: string | null
        }
        Update: {
          course?: string
          created_at?: string
          id?: string
          message?: string | null
          name?: string
          phone?: string
          processed?: boolean | null
          processed_at?: string | null
          processed_by?: string | null
          social?: string | null
        }
        Relationships: []
      }
      content_blocks: {
        Row: {
          block_key: string
          content: string | null
          created_at: string
          id: string
          image_url: string | null
          is_active: boolean | null
          metadata: Json | null
          title: string | null
          updated_at: string
        }
        Insert: {
          block_key: string
          content?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          metadata?: Json | null
          title?: string | null
          updated_at?: string
        }
        Update: {
          block_key?: string
          content?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          metadata?: Json | null
          title?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      contract_data: {
        Row: {
          created_at: string | null
          id: string
          inn: string | null
          passport_department_code: string | null
          passport_issued_by: string | null
          passport_issued_date: string | null
          passport_number: string | null
          passport_series: string | null
          registration_address: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          inn?: string | null
          passport_department_code?: string | null
          passport_issued_by?: string | null
          passport_issued_date?: string | null
          passport_number?: string | null
          passport_series?: string | null
          registration_address?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          inn?: string | null
          passport_department_code?: string | null
          passport_issued_by?: string | null
          passport_issued_date?: string | null
          passport_number?: string | null
          passport_series?: string | null
          registration_address?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      contracts: {
        Row: {
          created_at: string | null
          id: string
          pdf_url: string | null
          podpislon_document_id: string | null
          sent_at: string | null
          signed_at: string | null
          signed_pdf_url: string | null
          status: string
          stream_id: string | null
          updated_at: string | null
          user_id: string
          viewed_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          pdf_url?: string | null
          podpislon_document_id?: string | null
          sent_at?: string | null
          signed_at?: string | null
          signed_pdf_url?: string | null
          status?: string
          stream_id?: string | null
          updated_at?: string | null
          user_id: string
          viewed_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          pdf_url?: string | null
          podpislon_document_id?: string | null
          sent_at?: string | null
          signed_at?: string | null
          signed_pdf_url?: string | null
          status?: string
          stream_id?: string | null
          updated_at?: string | null
          user_id?: string
          viewed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contracts_stream_id_fkey"
            columns: ["stream_id"]
            isOneToOne: false
            referencedRelation: "streams"
            referencedColumns: ["id"]
          },
        ]
      }
      cooper_test_results: {
        Row: {
          age: number | null
          created_at: string
          fitness_level: string | null
          gender: string | null
          id: string
          notes: string | null
          test_date: string
          test_phase: string | null
          total_minutes: number | null
          total_seconds: number | null
          total_time: number | null
          user_id: string
          verified: boolean | null
          verified_by: string | null
        }
        Insert: {
          age?: number | null
          created_at?: string
          fitness_level?: string | null
          gender?: string | null
          id?: string
          notes?: string | null
          test_date?: string
          test_phase?: string | null
          total_minutes?: number | null
          total_seconds?: number | null
          total_time?: number | null
          user_id: string
          verified?: boolean | null
          verified_by?: string | null
        }
        Update: {
          age?: number | null
          created_at?: string
          fitness_level?: string | null
          gender?: string | null
          id?: string
          notes?: string | null
          test_date?: string
          test_phase?: string | null
          total_minutes?: number | null
          total_seconds?: number | null
          total_time?: number | null
          user_id?: string
          verified?: boolean | null
          verified_by?: string | null
        }
        Relationships: []
      }
      crash_tests: {
        Row: {
          created_at: string
          id: string
          notes: string | null
          passed: boolean | null
          points_earned: number
          test_date: string
          test_type: string
          user_id: string
          verified: boolean | null
          verified_by: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string | null
          passed?: boolean | null
          points_earned?: number
          test_date?: string
          test_type: string
          user_id: string
          verified?: boolean | null
          verified_by?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string | null
          passed?: boolean | null
          points_earned?: number
          test_date?: string
          test_type?: string
          user_id?: string
          verified?: boolean | null
          verified_by?: string | null
        }
        Relationships: []
      }
      habit_progress: {
        Row: {
          completed: boolean | null
          created_at: string
          habit_id: string
          id: string
          notes: string | null
          progress_date: string
          user_id: string
        }
        Insert: {
          completed?: boolean | null
          created_at?: string
          habit_id: string
          id?: string
          notes?: string | null
          progress_date?: string
          user_id: string
        }
        Update: {
          completed?: boolean | null
          created_at?: string
          habit_id?: string
          id?: string
          notes?: string | null
          progress_date?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "habit_progress_habit_id_fkey"
            columns: ["habit_id"]
            isOneToOne: false
            referencedRelation: "participant_habits"
            referencedColumns: ["id"]
          },
        ]
      }
      hero_races: {
        Row: {
          created_at: string
          finished: boolean | null
          id: string
          notes: string | null
          points_earned: number
          race_date: string
          time_minutes: number | null
          user_id: string
          verified: boolean | null
          verified_by: string | null
        }
        Insert: {
          created_at?: string
          finished?: boolean | null
          id?: string
          notes?: string | null
          points_earned?: number
          race_date?: string
          time_minutes?: number | null
          user_id: string
          verified?: boolean | null
          verified_by?: string | null
        }
        Update: {
          created_at?: string
          finished?: boolean | null
          id?: string
          notes?: string | null
          points_earned?: number
          race_date?: string
          time_minutes?: number | null
          user_id?: string
          verified?: boolean | null
          verified_by?: string | null
        }
        Relationships: []
      }
      homework_assignments: {
        Row: {
          content: string
          created_at: string
          created_by: string | null
          deadline: string | null
          id: string
          is_active: boolean
          points_reward: number
          stream_id: string | null
          target_user_id: string | null
          theme: string | null
          title: string
          updated_at: string
        }
        Insert: {
          content: string
          created_at?: string
          created_by?: string | null
          deadline?: string | null
          id?: string
          is_active?: boolean
          points_reward?: number
          stream_id?: string | null
          target_user_id?: string | null
          theme?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          created_by?: string | null
          deadline?: string | null
          id?: string
          is_active?: boolean
          points_reward?: number
          stream_id?: string | null
          target_user_id?: string | null
          theme?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "homework_assignments_stream_id_fkey"
            columns: ["stream_id"]
            isOneToOne: false
            referencedRelation: "streams"
            referencedColumns: ["id"]
          },
        ]
      }
      homework_submissions: {
        Row: {
          admin_comment: string | null
          assignment_id: string | null
          content: string | null
          created_at: string
          homework_type: string
          id: string
          notes: string | null
          points_earned: number
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          submitted_at: string
          user_id: string
          verified: boolean | null
          verified_by: string | null
        }
        Insert: {
          admin_comment?: string | null
          assignment_id?: string | null
          content?: string | null
          created_at?: string
          homework_type: string
          id?: string
          notes?: string | null
          points_earned?: number
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          submitted_at?: string
          user_id: string
          verified?: boolean | null
          verified_by?: string | null
        }
        Update: {
          admin_comment?: string | null
          assignment_id?: string | null
          content?: string | null
          created_at?: string
          homework_type?: string
          id?: string
          notes?: string | null
          points_earned?: number
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          submitted_at?: string
          user_id?: string
          verified?: boolean | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "homework_submissions_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "homework_assignments"
            referencedColumns: ["id"]
          },
        ]
      }
      intensive_streams: {
        Row: {
          created_at: string
          description: string | null
          end_date: string
          id: string
          is_active: boolean
          is_current: boolean
          name: string
          start_date: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          end_date: string
          id?: string
          is_active?: boolean
          is_current?: boolean
          name: string
          start_date: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          end_date?: string
          id?: string
          is_active?: boolean
          is_current?: boolean
          name?: string
          start_date?: string
          updated_at?: string
        }
        Relationships: []
      }
      leaderboard: {
        Row: {
          bjj_points: number | null
          challenges_points: number | null
          id: string
          kamp_pyramid_points: number | null
          kickboxing_points: number | null
          last_updated: string | null
          monthly_points: number | null
          nutrition_points: number | null
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
          kamp_pyramid_points?: number | null
          kickboxing_points?: number | null
          last_updated?: string | null
          monthly_points?: number | null
          nutrition_points?: number | null
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
          kamp_pyramid_points?: number | null
          kickboxing_points?: number | null
          last_updated?: string | null
          monthly_points?: number | null
          nutrition_points?: number | null
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
      lectures: {
        Row: {
          attendance_type: string
          created_at: string
          id: string
          lecture_date: string
          lecture_type: string
          notes: string | null
          points_earned: number
          user_id: string
          verified: boolean | null
          verified_by: string | null
        }
        Insert: {
          attendance_type?: string
          created_at?: string
          id?: string
          lecture_date?: string
          lecture_type: string
          notes?: string | null
          points_earned?: number
          user_id: string
          verified?: boolean | null
          verified_by?: string | null
        }
        Update: {
          attendance_type?: string
          created_at?: string
          id?: string
          lecture_date?: string
          lecture_type?: string
          notes?: string | null
          points_earned?: number
          user_id?: string
          verified?: boolean | null
          verified_by?: string | null
        }
        Relationships: []
      }
      materials: {
        Row: {
          available_to: string
          block_type: string
          content: string | null
          created_at: string
          created_by: string | null
          file_url: string | null
          id: string
          is_active: boolean
          link_url: string | null
          open_date: string | null
          sort_order: number
          status: string
          stream_id: string | null
          theme: string | null
          title: string
          updated_at: string
        }
        Insert: {
          available_to?: string
          block_type?: string
          content?: string | null
          created_at?: string
          created_by?: string | null
          file_url?: string | null
          id?: string
          is_active?: boolean
          link_url?: string | null
          open_date?: string | null
          sort_order?: number
          status?: string
          stream_id?: string | null
          theme?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          available_to?: string
          block_type?: string
          content?: string | null
          created_at?: string
          created_by?: string | null
          file_url?: string | null
          id?: string
          is_active?: boolean
          link_url?: string | null
          open_date?: string | null
          sort_order?: number
          status?: string
          stream_id?: string | null
          theme?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      moments: {
        Row: {
          created_at: string
          description: string | null
          id: string
          image_url: string
          is_active: boolean | null
          sort_order: number | null
          title: string | null
          updated_at: string
          video_url: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          image_url: string
          is_active?: boolean | null
          sort_order?: number | null
          title?: string | null
          updated_at?: string
          video_url?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string
          is_active?: boolean | null
          sort_order?: number | null
          title?: string | null
          updated_at?: string
          video_url?: string | null
        }
        Relationships: []
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
      participant_habits: {
        Row: {
          completed_days: number | null
          created_at: string
          description: string | null
          end_date: string | null
          habit_name: string
          habit_type: string
          id: string
          is_active: boolean | null
          is_completed: boolean | null
          notes: string | null
          start_date: string
          target_days: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_days?: number | null
          created_at?: string
          description?: string | null
          end_date?: string | null
          habit_name: string
          habit_type?: string
          id?: string
          is_active?: boolean | null
          is_completed?: boolean | null
          notes?: string | null
          start_date: string
          target_days?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_days?: number | null
          created_at?: string
          description?: string | null
          end_date?: string | null
          habit_name?: string
          habit_type?: string
          id?: string
          is_active?: boolean | null
          is_completed?: boolean | null
          notes?: string | null
          start_date?: string
          target_days?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          approved: boolean | null
          approved_at: string | null
          approved_by: string | null
          avatar_url: string | null
          club_joined_at: string | null
          created_at: string
          current_stream_id: string | null
          date_of_birth: string | null
          display_name: string | null
          email: string | null
          first_name: string | null
          height_cm: number | null
          id: string
          intensive_completed_at: string | null
          join_date: string | null
          last_name: string | null
          leaderboard_visible: boolean | null
          middle_name: string | null
          participant_status:
            | Database["public"]["Enums"]["participant_status_type"]
            | null
          personal_data_consent: boolean | null
          personal_data_consent_date: string | null
          phone: string | null
          profile_private: boolean | null
          rank_position: number | null
          referral_code: string | null
          referral_coins: number
          stream_end_date: string | null
          stream_start_date: string | null
          telegram: string | null
          telegram_first_name: string | null
          telegram_id: string | null
          telegram_last_name: string | null
          telegram_link_code: string | null
          telegram_link_code_expires_at: string | null
          telegram_linked_at: string | null
          telegram_photo_url: string | null
          telegram_username: string | null
          total_points: number | null
          updated_at: string
          user_id: string
          weight_after_stream: number | null
          weight_before_stream: number | null
          weight_kg: number | null
        }
        Insert: {
          approved?: boolean | null
          approved_at?: string | null
          approved_by?: string | null
          avatar_url?: string | null
          club_joined_at?: string | null
          created_at?: string
          current_stream_id?: string | null
          date_of_birth?: string | null
          display_name?: string | null
          email?: string | null
          first_name?: string | null
          height_cm?: number | null
          id?: string
          intensive_completed_at?: string | null
          join_date?: string | null
          last_name?: string | null
          leaderboard_visible?: boolean | null
          middle_name?: string | null
          participant_status?:
            | Database["public"]["Enums"]["participant_status_type"]
            | null
          personal_data_consent?: boolean | null
          personal_data_consent_date?: string | null
          phone?: string | null
          profile_private?: boolean | null
          rank_position?: number | null
          referral_code?: string | null
          referral_coins?: number
          stream_end_date?: string | null
          stream_start_date?: string | null
          telegram?: string | null
          telegram_first_name?: string | null
          telegram_id?: string | null
          telegram_last_name?: string | null
          telegram_link_code?: string | null
          telegram_link_code_expires_at?: string | null
          telegram_linked_at?: string | null
          telegram_photo_url?: string | null
          telegram_username?: string | null
          total_points?: number | null
          updated_at?: string
          user_id: string
          weight_after_stream?: number | null
          weight_before_stream?: number | null
          weight_kg?: number | null
        }
        Update: {
          approved?: boolean | null
          approved_at?: string | null
          approved_by?: string | null
          avatar_url?: string | null
          club_joined_at?: string | null
          created_at?: string
          current_stream_id?: string | null
          date_of_birth?: string | null
          display_name?: string | null
          email?: string | null
          first_name?: string | null
          height_cm?: number | null
          id?: string
          intensive_completed_at?: string | null
          join_date?: string | null
          last_name?: string | null
          leaderboard_visible?: boolean | null
          middle_name?: string | null
          participant_status?:
            | Database["public"]["Enums"]["participant_status_type"]
            | null
          personal_data_consent?: boolean | null
          personal_data_consent_date?: string | null
          phone?: string | null
          profile_private?: boolean | null
          rank_position?: number | null
          referral_code?: string | null
          referral_coins?: number
          stream_end_date?: string | null
          stream_start_date?: string | null
          telegram?: string | null
          telegram_first_name?: string | null
          telegram_id?: string | null
          telegram_last_name?: string | null
          telegram_link_code?: string | null
          telegram_link_code_expires_at?: string | null
          telegram_linked_at?: string | null
          telegram_photo_url?: string | null
          telegram_username?: string | null
          total_points?: number | null
          updated_at?: string
          user_id?: string
          weight_after_stream?: number | null
          weight_before_stream?: number | null
          weight_kg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_current_stream_id_fkey"
            columns: ["current_stream_id"]
            isOneToOne: false
            referencedRelation: "streams"
            referencedColumns: ["id"]
          },
        ]
      }
      public_profiles: {
        Row: {
          created_at: string
          current_stream_id: string | null
          display_name: string | null
          first_name: string | null
          id: string
          last_name: string | null
          participant_status:
            | Database["public"]["Enums"]["participant_status_type"]
            | null
          rank_position: number | null
          total_points: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_stream_id?: string | null
          display_name?: string | null
          first_name?: string | null
          id: string
          last_name?: string | null
          participant_status?:
            | Database["public"]["Enums"]["participant_status_type"]
            | null
          rank_position?: number | null
          total_points?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_stream_id?: string | null
          display_name?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          participant_status?:
            | Database["public"]["Enums"]["participant_status_type"]
            | null
          rank_position?: number | null
          total_points?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "public_profiles_current_stream_id_fkey"
            columns: ["current_stream_id"]
            isOneToOne: false
            referencedRelation: "streams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "public_profiles_profiles_fk"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      public_testimonials: {
        Row: {
          content: string | null
          created_at: string | null
          display_name: string | null
          id: string
          image_url: string | null
          is_active: boolean | null
          participant_title: string | null
          sort_order: number | null
          updated_at: string | null
          video_url: string | null
        }
        Insert: {
          content?: string | null
          created_at?: string | null
          display_name?: string | null
          id: string
          image_url?: string | null
          is_active?: boolean | null
          participant_title?: string | null
          sort_order?: number | null
          updated_at?: string | null
          video_url?: string | null
        }
        Update: {
          content?: string | null
          created_at?: string | null
          display_name?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          participant_title?: string | null
          sort_order?: number | null
          updated_at?: string | null
          video_url?: string | null
        }
        Relationships: []
      }
      referral_leads: {
        Row: {
          bitrix_deal_id: string | null
          bitrix_lead_id: string | null
          bitrix_status: string | null
          bitrix_synced_at: string | null
          bonus_amount: number | null
          bonus_awarded: boolean
          comment: string | null
          confirmed_at: string | null
          created_at: string
          email: string | null
          id: string
          name: string
          phone: string | null
          processed_by: string | null
          referral_code: string
          referrer_user_id: string
          reward_issued: boolean
          status: string
          telegram: string | null
        }
        Insert: {
          bitrix_deal_id?: string | null
          bitrix_lead_id?: string | null
          bitrix_status?: string | null
          bitrix_synced_at?: string | null
          bonus_amount?: number | null
          bonus_awarded?: boolean
          comment?: string | null
          confirmed_at?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name: string
          phone?: string | null
          processed_by?: string | null
          referral_code: string
          referrer_user_id: string
          reward_issued?: boolean
          status?: string
          telegram?: string | null
        }
        Update: {
          bitrix_deal_id?: string | null
          bitrix_lead_id?: string | null
          bitrix_status?: string | null
          bitrix_synced_at?: string | null
          bonus_amount?: number | null
          bonus_awarded?: boolean
          comment?: string | null
          confirmed_at?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          phone?: string | null
          processed_by?: string | null
          referral_code?: string
          referrer_user_id?: string
          reward_issued?: boolean
          status?: string
          telegram?: string | null
        }
        Relationships: []
      }
      referral_settings: {
        Row: {
          bonus_amount: number
          default_invite_text: string
          enabled: boolean
          id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          bonus_amount?: number
          default_invite_text?: string
          enabled?: boolean
          id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          bonus_amount?: number
          default_invite_text?: string
          enabled?: boolean
          id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      reward_requests: {
        Row: {
          admin_comment: string | null
          cost_coins: number
          created_at: string
          fulfilled_at: string | null
          id: string
          reviewed_at: string | null
          reviewed_by: string | null
          reward_id: string
          status: string
          updated_at: string
          user_comment: string | null
          user_id: string
        }
        Insert: {
          admin_comment?: string | null
          cost_coins: number
          created_at?: string
          fulfilled_at?: string | null
          id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          reward_id: string
          status?: string
          updated_at?: string
          user_comment?: string | null
          user_id: string
        }
        Update: {
          admin_comment?: string | null
          cost_coins?: number
          created_at?: string
          fulfilled_at?: string | null
          id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          reward_id?: string
          status?: string
          updated_at?: string
          user_comment?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reward_requests_reward_id_fkey"
            columns: ["reward_id"]
            isOneToOne: false
            referencedRelation: "rewards"
            referencedColumns: ["id"]
          },
        ]
      }
      rewards: {
        Row: {
          cost_coins: number
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          image_url: string | null
          is_active: boolean
          sort_order: number
          stock: number | null
          title: string
          updated_at: string
        }
        Insert: {
          cost_coins: number
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          sort_order?: number
          stock?: number | null
          title: string
          updated_at?: string
        }
        Update: {
          cost_coins?: number
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          sort_order?: number
          stock?: number | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      role_audit_log: {
        Row: {
          action: string
          assigned_at: string
          assigned_by: string
          id: string
          notes: string | null
          role_assigned: Database["public"]["Enums"]["user_role"]
          user_id: string
        }
        Insert: {
          action: string
          assigned_at?: string
          assigned_by: string
          id?: string
          notes?: string | null
          role_assigned: Database["public"]["Enums"]["user_role"]
          user_id: string
        }
        Update: {
          action?: string
          assigned_at?: string
          assigned_by?: string
          id?: string
          notes?: string | null
          role_assigned?: Database["public"]["Enums"]["user_role"]
          user_id?: string
        }
        Relationships: []
      }
      schedule_participants: {
        Row: {
          attended: boolean | null
          id: string
          registered_at: string
          schedule_id: string
          user_id: string
        }
        Insert: {
          attended?: boolean | null
          id?: string
          registered_at?: string
          schedule_id: string
          user_id: string
        }
        Update: {
          attended?: boolean | null
          id?: string
          registered_at?: string
          schedule_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "schedule_participants_schedule_id_fkey"
            columns: ["schedule_id"]
            isOneToOne: false
            referencedRelation: "schedules"
            referencedColumns: ["id"]
          },
        ]
      }
      schedules: {
        Row: {
          activity_type: string
          color: string | null
          created_at: string
          description: string | null
          end_time: string
          id: string
          instructor_id: string | null
          is_active: boolean | null
          location: string | null
          max_participants: number | null
          schedule_type: Database["public"]["Enums"]["schedule_type"]
          start_time: string
          stream_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          activity_type: string
          color?: string | null
          created_at?: string
          description?: string | null
          end_time: string
          id?: string
          instructor_id?: string | null
          is_active?: boolean | null
          location?: string | null
          max_participants?: number | null
          schedule_type?: Database["public"]["Enums"]["schedule_type"]
          start_time: string
          stream_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          activity_type?: string
          color?: string | null
          created_at?: string
          description?: string | null
          end_time?: string
          id?: string
          instructor_id?: string | null
          is_active?: boolean | null
          location?: string | null
          max_participants?: number | null
          schedule_type?: Database["public"]["Enums"]["schedule_type"]
          start_time?: string
          stream_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "schedules_instructor_id_fkey"
            columns: ["instructor_id"]
            isOneToOne: false
            referencedRelation: "trainers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedules_stream_id_fkey"
            columns: ["stream_id"]
            isOneToOne: false
            referencedRelation: "streams"
            referencedColumns: ["id"]
          },
        ]
      }
      streams: {
        Row: {
          created_at: string
          description: string | null
          end_date: string | null
          id: string
          is_active: boolean | null
          max_participants: number | null
          name: string
          start_date: string
          stream_type: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          end_date?: string | null
          id?: string
          is_active?: boolean | null
          max_participants?: number | null
          name: string
          start_date: string
          stream_type?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          end_date?: string | null
          id?: string
          is_active?: boolean | null
          max_participants?: number | null
          name?: string
          start_date?: string
          stream_type?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      tactical_sessions: {
        Row: {
          created_at: string
          id: string
          location: string | null
          notes: string | null
          passed: boolean | null
          points_earned: number
          session_date: string
          user_id: string
          verified: boolean | null
          verified_by: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          location?: string | null
          notes?: string | null
          passed?: boolean | null
          points_earned?: number
          session_date?: string
          user_id: string
          verified?: boolean | null
          verified_by?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          location?: string | null
          notes?: string | null
          passed?: boolean | null
          points_earned?: number
          session_date?: string
          user_id?: string
          verified?: boolean | null
          verified_by?: string | null
        }
        Relationships: []
      }
      telegram_bot_logs: {
        Row: {
          created_at: string
          event_type: string
          id: string
          payload: Json | null
          telegram_id: string | null
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          payload?: Json | null
          telegram_id?: string | null
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          payload?: Json | null
          telegram_id?: string | null
        }
        Relationships: []
      }
      telegram_bot_sessions: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          referral_code: string | null
          telegram_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string
          id?: string
          referral_code?: string | null
          telegram_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          referral_code?: string | null
          telegram_id?: string
        }
        Relationships: []
      }
      telegram_leads: {
        Row: {
          created_at: string
          id: string
          normalized_phone: string | null
          phone: string | null
          processed_at: string | null
          processed_by: string | null
          raw: Json | null
          referral_code: string | null
          status: string
          telegram_first_name: string | null
          telegram_id: string
          telegram_last_name: string | null
          telegram_username: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          normalized_phone?: string | null
          phone?: string | null
          processed_at?: string | null
          processed_by?: string | null
          raw?: Json | null
          referral_code?: string | null
          status?: string
          telegram_first_name?: string | null
          telegram_id: string
          telegram_last_name?: string | null
          telegram_username?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          normalized_phone?: string | null
          phone?: string | null
          processed_at?: string | null
          processed_by?: string | null
          raw?: Json | null
          referral_code?: string | null
          status?: string
          telegram_first_name?: string | null
          telegram_id?: string
          telegram_last_name?: string | null
          telegram_username?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      testimonials: {
        Row: {
          consent_date: string | null
          consent_given: boolean | null
          content: string | null
          created_at: string
          data_retention_until: string | null
          display_name: string | null
          id: string
          image_url: string | null
          is_active: boolean | null
          participant_name: string
          participant_title: string | null
          sort_order: number | null
          updated_at: string
          video_url: string | null
        }
        Insert: {
          consent_date?: string | null
          consent_given?: boolean | null
          content?: string | null
          created_at?: string
          data_retention_until?: string | null
          display_name?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          participant_name: string
          participant_title?: string | null
          sort_order?: number | null
          updated_at?: string
          video_url?: string | null
        }
        Update: {
          consent_date?: string | null
          consent_given?: boolean | null
          content?: string | null
          created_at?: string
          data_retention_until?: string | null
          display_name?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          participant_name?: string
          participant_title?: string | null
          sort_order?: number | null
          updated_at?: string
          video_url?: string | null
        }
        Relationships: []
      }
      totems: {
        Row: {
          created_at: string
          description: string | null
          discipline: string
          icon_color: string | null
          icon_name: string | null
          id: string
          is_active: boolean | null
          name: string
          required_attendance_percentage: number | null
          required_points: number | null
          special_requirements: Json | null
          totem_type: Database["public"]["Enums"]["totem_type"]
        }
        Insert: {
          created_at?: string
          description?: string | null
          discipline: string
          icon_color?: string | null
          icon_name?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          required_attendance_percentage?: number | null
          required_points?: number | null
          special_requirements?: Json | null
          totem_type: Database["public"]["Enums"]["totem_type"]
        }
        Update: {
          created_at?: string
          description?: string | null
          discipline?: string
          icon_color?: string | null
          icon_name?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          required_attendance_percentage?: number | null
          required_points?: number | null
          special_requirements?: Json | null
          totem_type?: Database["public"]["Enums"]["totem_type"]
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
          activity_type: string | null
          created_at: string
          id: string
          multiplier: number | null
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
          activity_type?: string | null
          created_at?: string
          id?: string
          multiplier?: number | null
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
          activity_type?: string | null
          created_at?: string
          id?: string
          multiplier?: number | null
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
      user_activities: {
        Row: {
          activity_id: string
          completed_at: string
          created_at: string
          id: string
          notes: string | null
          points_earned: number | null
          user_id: string
          verified: boolean | null
          verified_by: string | null
        }
        Insert: {
          activity_id: string
          completed_at?: string
          created_at?: string
          id?: string
          notes?: string | null
          points_earned?: number | null
          user_id: string
          verified?: boolean | null
          verified_by?: string | null
        }
        Update: {
          activity_id?: string
          completed_at?: string
          created_at?: string
          id?: string
          notes?: string | null
          points_earned?: number | null
          user_id?: string
          verified?: boolean | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_activities_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "activities"
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
      user_points: {
        Row: {
          bjj_points: number | null
          bjj_sessions_attended: number | null
          bjj_sessions_total: number | null
          created_at: string
          id: string
          kick_points: number | null
          kick_sessions_attended: number | null
          kick_sessions_total: number | null
          last_updated: string | null
          nutrition_points: number | null
          ofp_points: number | null
          ofp_sessions_attended: number | null
          ofp_sessions_total: number | null
          pyramid_kemp_points: number | null
          tactics_points: number | null
          total_points: number | null
          user_id: string
        }
        Insert: {
          bjj_points?: number | null
          bjj_sessions_attended?: number | null
          bjj_sessions_total?: number | null
          created_at?: string
          id?: string
          kick_points?: number | null
          kick_sessions_attended?: number | null
          kick_sessions_total?: number | null
          last_updated?: string | null
          nutrition_points?: number | null
          ofp_points?: number | null
          ofp_sessions_attended?: number | null
          ofp_sessions_total?: number | null
          pyramid_kemp_points?: number | null
          tactics_points?: number | null
          total_points?: number | null
          user_id: string
        }
        Update: {
          bjj_points?: number | null
          bjj_sessions_attended?: number | null
          bjj_sessions_total?: number | null
          created_at?: string
          id?: string
          kick_points?: number | null
          kick_sessions_attended?: number | null
          kick_sessions_total?: number | null
          last_updated?: string | null
          nutrition_points?: number | null
          ofp_points?: number | null
          ofp_sessions_attended?: number | null
          ofp_sessions_total?: number | null
          pyramid_kemp_points?: number | null
          tactics_points?: number | null
          total_points?: number | null
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          assigned_at: string
          assigned_by: string | null
          id: string
          role: Database["public"]["Enums"]["user_role"]
          user_id: string
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          user_id: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_totems: {
        Row: {
          assigned_at: string
          assigned_by: string | null
          created_at: string
          id: string
          is_manual: boolean | null
          notes: string | null
          totem_id: string
          user_id: string
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          created_at?: string
          id?: string
          is_manual?: boolean | null
          notes?: string | null
          totem_id: string
          user_id: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
          created_at?: string
          id?: string
          is_manual?: boolean | null
          notes?: string | null
          totem_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_user_totems_totem"
            columns: ["totem_id"]
            isOneToOne: false
            referencedRelation: "totems"
            referencedColumns: ["id"]
          },
        ]
      }
      аскезы_участников: {
        Row: {
          completion_percentage: number | null
          created_at: string
          description: string | null
          duration_days: number
          end_date: string
          id: string
          is_completed: boolean | null
          name: string
          participant_id: string
          start_date: string
        }
        Insert: {
          completion_percentage?: number | null
          created_at?: string
          description?: string | null
          duration_days?: number
          end_date: string
          id?: string
          is_completed?: boolean | null
          name: string
          participant_id: string
          start_date: string
        }
        Update: {
          completion_percentage?: number | null
          created_at?: string
          description?: string | null
          duration_days?: number
          end_date?: string
          id?: string
          is_completed?: boolean | null
          name?: string
          participant_id?: string
          start_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "аскезы_участников_participant_id_fkey"
            columns: ["participant_id"]
            isOneToOne: false
            referencedRelation: "участники"
            referencedColumns: ["id"]
          },
        ]
      }
      кэмп_активности: {
        Row: {
          activity_date: string
          activity_type_new:
            | Database["public"]["Enums"]["activity_type_new"]
            | null
          attendance_counted: boolean | null
          auto_points: number | null
          created_at: string
          description: string | null
          id: string
          lecture_subtype: Database["public"]["Enums"]["lecture_subtype"] | null
          multiplier: number | null
          participant_id: string
          points: number
          reward_type: Database["public"]["Enums"]["reward_type"]
          shram_subtype: Database["public"]["Enums"]["shram_subtype"] | null
          training_subtype:
            | Database["public"]["Enums"]["training_subtype"]
            | null
          verified_by: string | null
          zakal_subtype: Database["public"]["Enums"]["zakal_subtype"] | null
        }
        Insert: {
          activity_date?: string
          activity_type_new?:
            | Database["public"]["Enums"]["activity_type_new"]
            | null
          attendance_counted?: boolean | null
          auto_points?: number | null
          created_at?: string
          description?: string | null
          id?: string
          lecture_subtype?:
            | Database["public"]["Enums"]["lecture_subtype"]
            | null
          multiplier?: number | null
          participant_id: string
          points?: number
          reward_type: Database["public"]["Enums"]["reward_type"]
          shram_subtype?: Database["public"]["Enums"]["shram_subtype"] | null
          training_subtype?:
            | Database["public"]["Enums"]["training_subtype"]
            | null
          verified_by?: string | null
          zakal_subtype?: Database["public"]["Enums"]["zakal_subtype"] | null
        }
        Update: {
          activity_date?: string
          activity_type_new?:
            | Database["public"]["Enums"]["activity_type_new"]
            | null
          attendance_counted?: boolean | null
          auto_points?: number | null
          created_at?: string
          description?: string | null
          id?: string
          lecture_subtype?:
            | Database["public"]["Enums"]["lecture_subtype"]
            | null
          multiplier?: number | null
          participant_id?: string
          points?: number
          reward_type?: Database["public"]["Enums"]["reward_type"]
          shram_subtype?: Database["public"]["Enums"]["shram_subtype"] | null
          training_subtype?:
            | Database["public"]["Enums"]["training_subtype"]
            | null
          verified_by?: string | null
          zakal_subtype?: Database["public"]["Enums"]["zakal_subtype"] | null
        }
        Relationships: [
          {
            foreignKeyName: "кэмп_активности_participant_id_fkey"
            columns: ["participant_id"]
            isOneToOne: false
            referencedRelation: "участники"
            referencedColumns: ["id"]
          },
        ]
      }
      тотемы_участников: {
        Row: {
          earned_at: string
          id: string
          participant_id: string
          requirements_met: Json | null
          totem_type: Database["public"]["Enums"]["totem_type"]
        }
        Insert: {
          earned_at?: string
          id?: string
          participant_id: string
          requirements_met?: Json | null
          totem_type: Database["public"]["Enums"]["totem_type"]
        }
        Update: {
          earned_at?: string
          id?: string
          participant_id?: string
          requirements_met?: Json | null
          totem_type?: Database["public"]["Enums"]["totem_type"]
        }
        Relationships: [
          {
            foreignKeyName: "тотемы_участников_participant_id_fkey"
            columns: ["participant_id"]
            isOneToOne: false
            referencedRelation: "участники"
            referencedColumns: ["id"]
          },
        ]
      }
      участники: {
        Row: {
          birth_date: string | null
          created_at: string
          email: string | null
          height_cm: number | null
          id: string
          last_name: string | null
          name: string
          points: number
          stream_id: string | null
          user_id: string | null
          weight_kg: number | null
        }
        Insert: {
          birth_date?: string | null
          created_at?: string
          email?: string | null
          height_cm?: number | null
          id?: string
          last_name?: string | null
          name: string
          points?: number
          stream_id?: string | null
          user_id?: string | null
          weight_kg?: number | null
        }
        Update: {
          birth_date?: string | null
          created_at?: string
          email?: string | null
          height_cm?: number | null
          id?: string
          last_name?: string | null
          name?: string
          points?: number
          stream_id?: string | null
          user_id?: string | null
          weight_kg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "участники_stream_id_fkey"
            columns: ["stream_id"]
            isOneToOne: false
            referencedRelation: "intensive_streams"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_adjust_coins: {
        Args: { p_amount: number; p_reason: string; p_user_id: string }
        Returns: number
      }
      admin_confirm_referral: { Args: { p_lead_id: string }; Returns: Json }
      admin_list_coin_balances: {
        Args: never
        Returns: {
          balance: number
          display_name: string
          email: string
          first_name: string
          last_name: string
          last_tx_at: string
          participant_status: string
          stream_name: string
          tx_count: number
          user_id: string
        }[]
      }
      admin_set_approval: {
        Args: { p_approved: boolean; p_user_id: string }
        Returns: undefined
      }
      auto_cleanup_contact_submissions: { Args: never; Returns: undefined }
      award_coins_by_rule: {
        Args: {
          p_amount_override?: number
          p_reason?: string
          p_rule_code: string
          p_source_id?: string
          p_source_type?: string
          p_user_id: string
        }
        Returns: Json
      }
      calculate_cooper_fitness_level: {
        Args: { total_seconds: number }
        Returns: string
      }
      calculate_cooper_fitness_level_minutes: {
        Args: { total_minutes: number }
        Returns: string
      }
      cleanup_expired_sessions: { Args: never; Returns: undefined }
      cleanup_old_audit_logs: { Args: never; Returns: undefined }
      confirm_referral_lead: { Args: { _lead_id: string }; Returns: undefined }
      create_reward_request: {
        Args: { p_reward_id: string; p_user_comment?: string }
        Returns: string
      }
      decrypt_phone: { Args: { encrypted_phone: string }; Returns: string }
      encrypt_phone: { Args: { phone_text: string }; Returns: string }
      enhanced_contact_rate_limit: {
        Args: { p_ip_address?: unknown }
        Returns: boolean
      }
      enhanced_rate_limit_check: {
        Args: { p_action?: string; p_ip_address?: unknown }
        Returns: boolean
      }
      ensure_referral_code: { Args: { _user_id: string }; Returns: string }
      generate_referral_code: { Args: never; Returns: string }
      generate_telegram_link_code: {
        Args: { p_user_id: string }
        Returns: Json
      }
      get_participant_full_state: { Args: { p_user_id: string }; Returns: Json }
      get_participant_full_state_by_telegram: {
        Args: { p_telegram_id: string }
        Returns: Json
      }
      get_user_coin_balance: { Args: { p_user_id: string }; Returns: number }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["user_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      is_club_resident: { Args: { _user_id: string }; Returns: boolean }
      is_public_participant: { Args: { _user_id: string }; Returns: boolean }
      is_super_admin: { Args: { _user_id: string }; Returns: boolean }
      link_or_create_telegram_profile: {
        Args: {
          p_phone?: string
          p_referral_code?: string
          p_telegram_first_name?: string
          p_telegram_id: string
          p_telegram_last_name?: string
          p_telegram_username?: string
        }
        Returns: Json
      }
      link_telegram_profile: {
        Args: {
          p_link_code: string
          p_telegram_first_name?: string
          p_telegram_id: string
          p_telegram_last_name?: string
          p_telegram_photo_url?: string
          p_telegram_username?: string
        }
        Returns: Json
      }
      log_security_access: {
        Args: { p_action: string; p_record_id?: string; p_table_name?: string }
        Returns: undefined
      }
      log_security_event: {
        Args: { details?: Json; event_type: string; user_id_param?: string }
        Returns: undefined
      }
      mask_email_secure: { Args: { email_address: string }; Returns: string }
      mask_participant_name: { Args: { full_name: string }; Returns: string }
      mask_phone_number: { Args: { phone_number: string }; Returns: string }
      mask_phone_secure: { Args: { phone_number: string }; Returns: string }
      normalize_phone: { Args: { p_phone: string }; Returns: string }
      recalculate_all_ranks: { Args: never; Returns: undefined }
      review_homework_submission: {
        Args: {
          p_admin_comment?: string
          p_status: string
          p_submission_id: string
        }
        Returns: undefined
      }
      review_reward_request: {
        Args: {
          p_admin_comment?: string
          p_new_status: string
          p_request_id: string
        }
        Returns: undefined
      }
      unlink_telegram_profile: {
        Args: { p_user_id: string }
        Returns: undefined
      }
      update_participant_status: {
        Args: {
          p_new_status: Database["public"]["Enums"]["participant_status_type"]
          p_user_id: string
        }
        Returns: undefined
      }
      update_user_leaderboard: {
        Args: { user_uuid: string }
        Returns: undefined
      }
      validate_audit_log_entry: {
        Args: { p_action: string; p_table_name: string; p_user_id?: string }
        Returns: boolean
      }
      validate_contact_submission: {
        Args: {
          p_course: string
          p_name: string
          p_phone: string
          p_social?: string
        }
        Returns: boolean
      }
    }
    Enums: {
      activity_type:
        | "training_bjj"
        | "training_kick"
        | "training_ofp"
        | "lecture"
        | "homework"
        | "crash_test_bjj"
        | "crash_test_kick"
        | "hero_race"
        | "tactics"
        | "ascetic_challenge"
      activity_type_new:
        | "training"
        | "lecture"
        | "homework"
        | "crash_test_bjj"
        | "crash_test_kick"
        | "heroes_race"
        | "tactics"
        | "ascetic"
      app_role: "admin" | "user"
      lecture_subtype:
        | "kemp"
        | "nutrition"
        | "psychology"
        | "philosophy"
        | "leadership"
        | "tactics"
      participant_status_type:
        | "intensive_active"
        | "intensive_completed"
        | "club_resident"
        | "alumni"
      reward_type: "zakal" | "gran" | "shram"
      schedule_type: "intensive" | "club"
      shram_subtype: "bjj" | "kick" | "ofp" | "tactics"
      totem_type:
        | "snake"
        | "paw"
        | "hammer"
        | "star"
        | "sprout"
        | "compass"
        | "monk"
        | "blade"
        | "lighthouse"
        | "bear"
      training_subtype: "bjj" | "kick" | "ofp"
      user_role: "user" | "admin" | "super_admin" | "trainer"
      zakal_subtype: "bjj" | "kick" | "ofp"
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
      activity_type: [
        "training_bjj",
        "training_kick",
        "training_ofp",
        "lecture",
        "homework",
        "crash_test_bjj",
        "crash_test_kick",
        "hero_race",
        "tactics",
        "ascetic_challenge",
      ],
      activity_type_new: [
        "training",
        "lecture",
        "homework",
        "crash_test_bjj",
        "crash_test_kick",
        "heroes_race",
        "tactics",
        "ascetic",
      ],
      app_role: ["admin", "user"],
      lecture_subtype: [
        "kemp",
        "nutrition",
        "psychology",
        "philosophy",
        "leadership",
        "tactics",
      ],
      participant_status_type: [
        "intensive_active",
        "intensive_completed",
        "club_resident",
        "alumni",
      ],
      reward_type: ["zakal", "gran", "shram"],
      schedule_type: ["intensive", "club"],
      shram_subtype: ["bjj", "kick", "ofp", "tactics"],
      totem_type: [
        "snake",
        "paw",
        "hammer",
        "star",
        "sprout",
        "compass",
        "monk",
        "blade",
        "lighthouse",
        "bear",
      ],
      training_subtype: ["bjj", "kick", "ofp"],
      user_role: ["user", "admin", "super_admin", "trainer"],
      zakal_subtype: ["bjj", "kick", "ofp"],
    },
  },
} as const
