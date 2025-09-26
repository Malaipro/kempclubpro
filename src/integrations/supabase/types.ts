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
      admin_sessions: {
        Row: {
          created_at: string | null
          expires_at: string | null
          id: string
          ip_address: unknown | null
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
          ip_address?: unknown | null
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
          ip_address?: unknown | null
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
      audit_log: {
        Row: {
          action: string
          id: string
          ip_address: unknown | null
          record_id: string | null
          table_name: string | null
          timestamp: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          id?: string
          ip_address?: unknown | null
          record_id?: string | null
          table_name?: string | null
          timestamp?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          id?: string
          ip_address?: unknown | null
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
      cooper_test_results: {
        Row: {
          age: number | null
          created_at: string
          exercise_1_time: number | null
          exercise_2_time: number | null
          exercise_3_time: number | null
          exercise_4_time: number | null
          fitness_level: string | null
          gender: string | null
          id: string
          notes: string | null
          test_date: string
          test_phase: string | null
          total_time: number | null
          user_id: string
          verified: boolean | null
          verified_by: string | null
        }
        Insert: {
          age?: number | null
          created_at?: string
          exercise_1_time?: number | null
          exercise_2_time?: number | null
          exercise_3_time?: number | null
          exercise_4_time?: number | null
          fitness_level?: string | null
          gender?: string | null
          id?: string
          notes?: string | null
          test_date?: string
          test_phase?: string | null
          total_time?: number | null
          user_id: string
          verified?: boolean | null
          verified_by?: string | null
        }
        Update: {
          age?: number | null
          created_at?: string
          exercise_1_time?: number | null
          exercise_2_time?: number | null
          exercise_3_time?: number | null
          exercise_4_time?: number | null
          fitness_level?: string | null
          gender?: string | null
          id?: string
          notes?: string | null
          test_date?: string
          test_phase?: string | null
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
      homework_submissions: {
        Row: {
          content: string | null
          created_at: string
          homework_type: string
          id: string
          notes: string | null
          points_earned: number
          submitted_at: string
          user_id: string
          verified: boolean | null
          verified_by: string | null
        }
        Insert: {
          content?: string | null
          created_at?: string
          homework_type: string
          id?: string
          notes?: string | null
          points_earned?: number
          submitted_at?: string
          user_id: string
          verified?: boolean | null
          verified_by?: string | null
        }
        Update: {
          content?: string | null
          created_at?: string
          homework_type?: string
          id?: string
          notes?: string | null
          points_earned?: number
          submitted_at?: string
          user_id?: string
          verified?: boolean | null
          verified_by?: string | null
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
          created_at: string
          date_of_birth: string | null
          display_name: string | null
          first_name: string | null
          height_cm: number | null
          id: string
          join_date: string | null
          last_name: string | null
          leaderboard_visible: boolean | null
          phone: string | null
          profile_private: boolean | null
          rank_position: number | null
          stream_end_date: string | null
          stream_start_date: string | null
          telegram: string | null
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
          created_at?: string
          date_of_birth?: string | null
          display_name?: string | null
          first_name?: string | null
          height_cm?: number | null
          id?: string
          join_date?: string | null
          last_name?: string | null
          leaderboard_visible?: boolean | null
          phone?: string | null
          profile_private?: boolean | null
          rank_position?: number | null
          stream_end_date?: string | null
          stream_start_date?: string | null
          telegram?: string | null
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
          created_at?: string
          date_of_birth?: string | null
          display_name?: string | null
          first_name?: string | null
          height_cm?: number | null
          id?: string
          join_date?: string | null
          last_name?: string | null
          leaderboard_visible?: boolean | null
          phone?: string | null
          profile_private?: boolean | null
          rank_position?: number | null
          stream_end_date?: string | null
          stream_start_date?: string | null
          telegram?: string | null
          total_points?: number | null
          updated_at?: string
          user_id?: string
          weight_after_stream?: number | null
          weight_before_stream?: number | null
          weight_kg?: number | null
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
          created_at: string
          description: string | null
          end_time: string
          id: string
          instructor_id: string | null
          is_active: boolean | null
          location: string | null
          max_participants: number | null
          start_time: string
          title: string
          updated_at: string
        }
        Insert: {
          activity_type: string
          created_at?: string
          description?: string | null
          end_time: string
          id?: string
          instructor_id?: string | null
          is_active?: boolean | null
          location?: string | null
          max_participants?: number | null
          start_time: string
          title: string
          updated_at?: string
        }
        Update: {
          activity_type?: string
          created_at?: string
          description?: string | null
          end_time?: string
          id?: string
          instructor_id?: string | null
          is_active?: boolean | null
          location?: string | null
          max_participants?: number | null
          start_time?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "schedules_instructor_id_fkey"
            columns: ["instructor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
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
      testimonials: {
        Row: {
          content: string | null
          created_at: string
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
          content?: string | null
          created_at?: string
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
          content?: string | null
          created_at?: string
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
          created_at: string
          earned_at: string
          id: string
          notes: string | null
          totem_type: Database["public"]["Enums"]["totem_type"]
          user_id: string
          verified: boolean | null
          verified_by: string | null
        }
        Insert: {
          created_at?: string
          earned_at?: string
          id?: string
          notes?: string | null
          totem_type: Database["public"]["Enums"]["totem_type"]
          user_id: string
          verified?: boolean | null
          verified_by?: string | null
        }
        Update: {
          created_at?: string
          earned_at?: string
          id?: string
          notes?: string | null
          totem_type?: Database["public"]["Enums"]["totem_type"]
          user_id?: string
          verified?: boolean | null
          verified_by?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      auto_cleanup_contact_submissions: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      calculate_cooper_fitness_level: {
        Args: { total_seconds: number }
        Returns: string
      }
      cleanup_expired_sessions: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      enhanced_contact_rate_limit: {
        Args: { p_ip_address?: unknown }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["user_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: {
        Args: { _user_id: string }
        Returns: boolean
      }
      is_super_admin: {
        Args: { _user_id: string }
        Returns: boolean
      }
      log_security_access: {
        Args: { p_action: string; p_record_id?: string; p_table_name?: string }
        Returns: undefined
      }
      log_security_event: {
        Args: { details?: Json; event_type: string; user_id_param?: string }
        Returns: undefined
      }
      mask_email_secure: {
        Args: { email_address: string }
        Returns: string
      }
      mask_phone_number: {
        Args: { phone_number: string }
        Returns: string
      }
      mask_phone_secure: {
        Args: { phone_number: string }
        Returns: string
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
      user_role: "user" | "admin" | "super_admin" | "trainer"
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
      user_role: ["user", "admin", "super_admin", "trainer"],
    },
  },
} as const
