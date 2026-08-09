-- =====================================================================
-- schema-structure-only.sql — сводный структурный дамп базы КЭМП
-- Сгенерировано 09.08.2026 из фактического состояния БД (только чтение).
-- СОДЕРЖИТ: расширения, 13 enum, 80 таблиц, 204 ограничения, 63 индекса,
--           92 функции, 53 триггера, GRANT'ы, 194 RLS-политики, 38 политик storage.
-- НЕ СОДЕРЖИТ: данных, пользователей Auth, PII, секретов, бакетов, cron.
-- Порядок = migrations/01..10 без 09_reference_data.sql.
-- =====================================================================


-- ################ 01_extensions_and_types.sql ################

-- =====================================================================
-- 01_extensions_and_types.sql
-- Проект: МИРА (структурный перенос схемы КЭМП)
-- Содержит: расширения, схемы, enum-типы. Данных нет.
-- =====================================================================

-- ---------- EXTENSIONS ----------
CREATE SCHEMA IF NOT EXISTS extensions;

CREATE EXTENSION IF NOT EXISTS "uuid-ossp"        WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pgcrypto           WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_stat_statements WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net             WITH SCHEMA extensions;
-- pg_cron ставится в pg_catalog, создаётся Supabase-платформой:
CREATE EXTENSION IF NOT EXISTS pg_cron;
-- supabase_vault (схема vault) и plpgsql уже присутствуют в чистом проекте Supabase.

-- ---------- ENUM TYPES (13) ----------
CREATE TYPE public.activity_type AS ENUM ('training_bjj', 'training_kick', 'training_ofp', 'lecture', 'homework', 'crash_test_bjj', 'crash_test_kick', 'hero_race', 'tactics', 'ascetic_challenge');
CREATE TYPE public.activity_type_new AS ENUM ('training', 'lecture', 'homework', 'crash_test_bjj', 'crash_test_kick', 'heroes_race', 'tactics', 'ascetic');
CREATE TYPE public.app_role AS ENUM ('admin', 'user');
CREATE TYPE public.journal_day_type AS ENUM ('weekday', 'saturday', 'sunday');
CREATE TYPE public.lecture_subtype AS ENUM ('kemp', 'nutrition', 'psychology', 'philosophy', 'leadership', 'tactics');
CREATE TYPE public.participant_status_type AS ENUM ('intensive_active', 'intensive_completed', 'club_resident', 'alumni', 'inactive', 'intensive_failed', 'trial_visit', 'intensive_dropped');
CREATE TYPE public.reward_type AS ENUM ('zakal', 'gran', 'shram');
CREATE TYPE public.schedule_type AS ENUM ('intensive', 'club');
CREATE TYPE public.shram_subtype AS ENUM ('bjj', 'kick', 'ofp', 'tactics');
CREATE TYPE public.totem_type AS ENUM ('snake', 'paw', 'hammer', 'star', 'sprout', 'compass', 'monk', 'blade', 'lighthouse', 'bear');
CREATE TYPE public.training_subtype AS ENUM ('bjj', 'kick', 'ofp');
CREATE TYPE public.user_role AS ENUM ('user', 'admin', 'super_admin', 'trainer');
CREATE TYPE public.zakal_subtype AS ENUM ('bjj', 'kick', 'ofp');

-- ################ 02_tables_and_constraints.sql ################

-- =====================================================================
-- 02_tables_and_constraints.sql — таблицы (80) и ограничения (204)
-- Только структура. Данных нет.
-- ВНИМАНИЕ: FK на auth.users(id) — таблица auth.users существует
-- в чистом проекте Supabase, пользователей переносить НЕ нужно.
-- =====================================================================

-- ---------------- TABLES ----------------
CREATE TABLE public.achievement_types (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  name text NOT NULL,
  color text NOT NULL,
  icon text NOT NULL,
  shape text NOT NULL,
  description text,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.achievements (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  name text NOT NULL,
  description text NOT NULL,
  category text NOT NULL,
  badge_type text NOT NULL,
  criteria jsonb NOT NULL,
  points_reward integer DEFAULT 0,
  icon_name text,
  icon_color text DEFAULT '#e60000'::text,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.activities (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  name text NOT NULL,
  category text NOT NULL,
  description text,
  points integer DEFAULT 1,
  difficulty_level integer DEFAULT 1,
  duration_minutes integer,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.activity_checkins (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  user_id uuid NOT NULL,
  activity_type text NOT NULL,
  checked_at date DEFAULT CURRENT_DATE NOT NULL,
  stream_id uuid,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.admin_access_log (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  admin_user_id uuid,
  table_name text NOT NULL,
  action text NOT NULL,
  ip_address inet,
  user_agent text,
  accessed_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.admin_sessions (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  user_id uuid NOT NULL,
  session_token text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  last_activity timestamp with time zone DEFAULT now(),
  expires_at timestamp with time zone DEFAULT (now() + '02:00:00'::interval),
  ip_address inet,
  user_agent text,
  is_active boolean DEFAULT true
);

CREATE TABLE public.application_notes (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  submission_id uuid NOT NULL,
  author_id uuid,
  note text NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.application_reminders (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  submission_id uuid NOT NULL,
  author_id uuid,
  remind_at timestamp with time zone NOT NULL,
  comment text,
  sent boolean DEFAULT false NOT NULL,
  sent_at timestamp with time zone,
  done boolean DEFAULT false NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.ascetic_activities (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  user_id uuid NOT NULL,
  activity_type text NOT NULL,
  duration_minutes integer,
  notes text,
  completed_at timestamp with time zone DEFAULT now() NOT NULL,
  points_earned integer DEFAULT 0,
  verified boolean DEFAULT false,
  verified_by uuid,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  challenge_name text,
  challenge_duration integer DEFAULT 14,
  completion_percentage numeric(5,2) DEFAULT 0,
  ascetic_type_id uuid,
  streak integer DEFAULT 0 NOT NULL,
  last_checkin_date date
);

CREATE TABLE public.ascetic_types (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  name text NOT NULL,
  description text,
  default_points integer DEFAULT 1,
  default_duration_minutes integer,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.audit_log (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  user_id uuid,
  action text NOT NULL,
  table_name text,
  record_id uuid,
  "timestamp" timestamp with time zone DEFAULT now(),
  ip_address inet,
  user_agent text
);

CREATE TABLE public.broadcast_messages (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  text text NOT NULL,
  audience text DEFAULT 'all'::text NOT NULL,
  buttons jsonb DEFAULT '[]'::jsonb NOT NULL,
  file_url text,
  status text DEFAULT 'draft'::text NOT NULL,
  recipients_count integer DEFAULT 0 NOT NULL,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  sent_at timestamp with time zone,
  target_user_ids uuid[],
  filter_snapshot jsonb
);

CREATE TABLE public.broadcast_responses (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  broadcast_id uuid NOT NULL,
  user_id uuid NOT NULL,
  display_name text,
  phone text,
  telegram_id text,
  button_id text NOT NULL,
  button_label text NOT NULL,
  action_type text DEFAULT 'response'::text NOT NULL,
  action_target_id uuid,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.broadcasts (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  created_by uuid NOT NULL,
  message_text text NOT NULL,
  filter_json jsonb,
  audience_cnt integer NOT NULL,
  sent_cnt integer,
  status text DEFAULT 'pending'::text NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.challenge_entries (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  challenge_id uuid NOT NULL,
  user_id uuid NOT NULL,
  entry_date date DEFAULT CURRENT_DATE NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.challenges (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  name text NOT NULL,
  description text,
  challenge_type text NOT NULL,
  start_date timestamp with time zone,
  end_date timestamp with time zone,
  points_reward integer DEFAULT 0,
  max_participants integer,
  requirements jsonb,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  prize_description text,
  max_per_day integer DEFAULT 1,
  target_statuses jsonb,
  target_tag_ids jsonb
);

CREATE TABLE public.coin_rules (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  code text NOT NULL,
  name text NOT NULL,
  description text,
  coin_amount integer DEFAULT 1 NOT NULL,
  is_active boolean DEFAULT true NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.coin_transactions (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  user_id uuid NOT NULL,
  amount integer NOT NULL,
  reason text NOT NULL,
  source_type text,
  source_id uuid,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  created_by uuid,
  rule_id uuid
);

CREATE TABLE public.contact_rate_limit (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  ip_address inet NOT NULL,
  submission_count integer DEFAULT 1,
  window_start timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.contact_submissions (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  name text NOT NULL,
  phone text NOT NULL,
  course text,
  social text,
  message text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  processed boolean DEFAULT false,
  processed_by uuid,
  processed_at timestamp with time zone,
  referral_code text,
  status text DEFAULT 'new'::text NOT NULL,
  stream_id uuid,
  enrolled_user_id uuid,
  ref_code text,
  referrer_user_id uuid,
  utm_data jsonb,
  notify_failed boolean DEFAULT false NOT NULL,
  notify_error text,
  referrer text,
  landing_page text
);

CREATE TABLE public.content_blocks (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  block_key character varying(100) NOT NULL,
  title character varying(200),
  content text,
  image_url text,
  metadata jsonb DEFAULT '{}'::jsonb,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.contract_data (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  user_id uuid NOT NULL,
  passport_series character varying(4),
  passport_number character varying(6),
  passport_issued_by text,
  passport_issued_date date,
  passport_department_code character varying(7),
  registration_address text,
  inn character varying(12),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.contracts (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  user_id uuid NOT NULL,
  stream_id uuid,
  podpislon_document_id text,
  status character varying(20) DEFAULT 'draft'::character varying NOT NULL,
  pdf_url text,
  signed_pdf_url text,
  sent_at timestamp with time zone,
  viewed_at timestamp with time zone,
  signed_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.cooper_test_results (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  user_id uuid NOT NULL,
  test_date timestamp with time zone DEFAULT now() NOT NULL,
  age integer,
  gender text,
  fitness_level text,
  notes text,
  verified boolean DEFAULT false,
  verified_by uuid,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  test_phase text DEFAULT 'during_stream'::text,
  total_minutes integer,
  total_seconds integer,
  total_time integer
);

CREATE TABLE public.crash_tests (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  user_id uuid NOT NULL,
  test_type text NOT NULL,
  points_earned integer DEFAULT 6 NOT NULL,
  passed boolean DEFAULT false,
  verified boolean DEFAULT false,
  verified_by uuid,
  test_date timestamp with time zone DEFAULT now() NOT NULL,
  notes text,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.habit_progress (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  habit_id uuid NOT NULL,
  user_id uuid NOT NULL,
  progress_date date DEFAULT CURRENT_DATE NOT NULL,
  completed boolean DEFAULT false,
  notes text,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.hero_races (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  user_id uuid NOT NULL,
  points_earned integer DEFAULT 8 NOT NULL,
  finished boolean DEFAULT false,
  verified boolean DEFAULT false,
  verified_by uuid,
  race_date timestamp with time zone DEFAULT now() NOT NULL,
  time_minutes integer,
  notes text,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.homework_assignments (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  title text NOT NULL,
  theme text,
  content text NOT NULL,
  deadline timestamp with time zone,
  stream_id uuid,
  target_user_id uuid,
  points_reward integer DEFAULT 10 NOT NULL,
  is_active boolean DEFAULT true NOT NULL,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  file_url text
);

CREATE TABLE public.homework_submissions (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  user_id uuid NOT NULL,
  homework_type text NOT NULL,
  points_earned integer DEFAULT 1 NOT NULL,
  verified boolean DEFAULT false,
  verified_by uuid,
  submitted_at timestamp with time zone DEFAULT now() NOT NULL,
  content text,
  notes text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  assignment_id uuid,
  status text DEFAULT 'submitted'::text NOT NULL,
  admin_comment text,
  reviewed_at timestamp with time zone,
  reviewed_by uuid,
  file_url text
);

CREATE TABLE public.intensive_streams (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  name text NOT NULL,
  description text,
  start_date date NOT NULL,
  end_date date NOT NULL,
  is_active boolean DEFAULT true NOT NULL,
  is_current boolean DEFAULT false NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE public.journal_answers (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  entry_id uuid NOT NULL,
  prompt_id uuid NOT NULL,
  answer_text text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.journal_emotions (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  entry_id uuid NOT NULL,
  emotion_name text NOT NULL,
  intensity integer DEFAULT 3 NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.journal_entries (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  user_id uuid NOT NULL,
  entry_date date NOT NULL,
  day_type text NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.journal_prompts (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  day_type text NOT NULL,
  question_text text NOT NULL,
  sort_order integer DEFAULT 0 NOT NULL,
  is_active boolean DEFAULT true NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.leaderboard (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  user_id uuid NOT NULL,
  total_points integer DEFAULT 0,
  bjj_points integer DEFAULT 0,
  kickboxing_points integer DEFAULT 0,
  ofp_points integer DEFAULT 0,
  theory_points integer DEFAULT 0,
  challenges_points integer DEFAULT 0,
  tactical_points integer DEFAULT 0,
  monthly_points integer DEFAULT 0,
  rank_position integer DEFAULT 0,
  last_updated timestamp with time zone DEFAULT now(),
  kamp_pyramid_points integer DEFAULT 0,
  nutrition_points integer DEFAULT 0
);

CREATE TABLE public.lectures (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  user_id uuid NOT NULL,
  lecture_type text NOT NULL,
  points_earned integer DEFAULT 1 NOT NULL,
  attendance_type text DEFAULT 'in_person'::text NOT NULL,
  verified boolean DEFAULT false,
  verified_by uuid,
  lecture_date timestamp with time zone DEFAULT now() NOT NULL,
  notes text,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.mastermind_entries (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  member_id uuid NOT NULL,
  entry_date date DEFAULT CURRENT_DATE NOT NULL,
  summary text NOT NULL,
  my_tasks text,
  status text DEFAULT 'pending'::text,
  admin_comment text,
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.mastermind_groups (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  name text NOT NULL,
  description text,
  start_date date,
  end_date date,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.mastermind_members (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  user_id uuid NOT NULL,
  request text,
  plan text,
  start_date date,
  end_date date,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  group_id uuid
);

CREATE TABLE public.mastermind_tasks (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  member_id uuid NOT NULL,
  title text NOT NULL,
  description text,
  is_completed boolean DEFAULT false,
  completed_at timestamp with time zone,
  participant_comment text,
  file_url text,
  created_at timestamp with time zone DEFAULT now(),
  sort_order integer DEFAULT 0,
  deadline date,
  created_by uuid,
  approval_status text,
  admin_comment text
);

CREATE TABLE public.materials (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  title text NOT NULL,
  block_type text DEFAULT 'lecture'::text NOT NULL,
  theme text,
  content text,
  file_url text,
  link_url text,
  status text DEFAULT 'open'::text NOT NULL,
  stream_id uuid,
  available_to text DEFAULT 'all'::text NOT NULL,
  open_date timestamp with time zone,
  sort_order integer DEFAULT 0 NOT NULL,
  is_active boolean DEFAULT true NOT NULL,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.moments (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  title character varying(200),
  description text,
  image_url text NOT NULL,
  video_url text,
  is_active boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.notifications (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  user_id uuid NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  notification_type text DEFAULT 'info'::text,
  is_read boolean DEFAULT false,
  action_url text,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.participant_habits (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  user_id uuid NOT NULL,
  habit_name text NOT NULL,
  habit_type text DEFAULT 'ascetic'::text NOT NULL,
  description text,
  start_date date NOT NULL,
  end_date date,
  target_days integer DEFAULT 21,
  completed_days integer DEFAULT 0,
  is_active boolean DEFAULT true,
  is_completed boolean DEFAULT false,
  notes text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.participant_notes (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  profile_user_id uuid NOT NULL,
  author_id uuid NOT NULL,
  note text NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.participant_status_history (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  profile_user_id uuid NOT NULL,
  old_status participant_status_type,
  new_status participant_status_type NOT NULL,
  stream_id uuid,
  changed_by uuid,
  changed_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.participant_tags (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  name text NOT NULL,
  color text,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.profile_tags (
  profile_user_id uuid NOT NULL,
  tag_id uuid NOT NULL,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.profiles (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  user_id uuid NOT NULL,
  display_name text,
  first_name text,
  last_name text,
  avatar_url text,
  phone text,
  telegram text,
  total_points integer DEFAULT 0,
  rank_position integer DEFAULT 0,
  join_date timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  height_cm integer,
  weight_kg integer,
  date_of_birth date,
  weight_before_stream integer,
  weight_after_stream integer,
  stream_start_date date,
  stream_end_date date,
  approved boolean DEFAULT false,
  approved_at timestamp with time zone,
  approved_by uuid,
  leaderboard_visible boolean DEFAULT true,
  profile_private boolean DEFAULT false,
  email text,
  current_stream_id uuid,
  participant_status participant_status_type DEFAULT 'intensive_active'::participant_status_type,
  intensive_completed_at timestamp with time zone,
  club_joined_at timestamp with time zone,
  middle_name text,
  personal_data_consent boolean DEFAULT false,
  personal_data_consent_date timestamp with time zone,
  referral_code text,
  referral_coins integer DEFAULT 0 NOT NULL,
  telegram_id text,
  telegram_username text,
  telegram_first_name text,
  telegram_last_name text,
  telegram_photo_url text,
  telegram_linked_at timestamp with time zone,
  telegram_link_code text,
  telegram_link_code_expires_at timestamp with time zone,
  coaching_type text DEFAULT 'standard'::text NOT NULL
);

CREATE TABLE public.public_profiles (
  id uuid NOT NULL,
  user_id uuid NOT NULL,
  display_name text,
  first_name text,
  last_name text,
  total_points integer DEFAULT 0,
  rank_position integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  participant_status participant_status_type,
  current_stream_id uuid
);

CREATE TABLE public.public_testimonials (
  id uuid NOT NULL,
  display_name text,
  participant_title text,
  content text,
  video_url text,
  image_url text,
  is_active boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.pyramid_levels (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  level_number integer NOT NULL,
  title text NOT NULL,
  description text,
  presentation_url text,
  is_unlocked boolean DEFAULT false NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.referral_leads (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  referrer_user_id uuid NOT NULL,
  referral_code text NOT NULL,
  name text NOT NULL,
  phone text,
  telegram text,
  comment text,
  status text DEFAULT 'new'::text NOT NULL,
  bonus_awarded boolean DEFAULT false NOT NULL,
  bonus_amount integer,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  confirmed_at timestamp with time zone,
  processed_by uuid,
  email text,
  reward_issued boolean DEFAULT false NOT NULL,
  bitrix_lead_id text,
  bitrix_deal_id text,
  bitrix_status text,
  bitrix_synced_at timestamp with time zone
);

CREATE TABLE public.referral_settings (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  enabled boolean DEFAULT true NOT NULL,
  bonus_amount integer DEFAULT 10 NOT NULL,
  default_invite_text text DEFAULT 'Приглашаю тебя в КЭМП — клуб для тех, кто хочет расти. Регистрируйся по моей ссылке:'::text NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_by uuid
);

CREATE TABLE public.reward_requests (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  user_id uuid NOT NULL,
  reward_id uuid NOT NULL,
  cost_coins integer NOT NULL,
  status text DEFAULT 'pending'::text NOT NULL,
  user_comment text,
  admin_comment text,
  reviewed_by uuid,
  reviewed_at timestamp with time zone,
  fulfilled_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.rewards (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  title text NOT NULL,
  description text,
  image_url text,
  cost_coins integer NOT NULL,
  stock integer,
  is_active boolean DEFAULT true NOT NULL,
  sort_order integer DEFAULT 0 NOT NULL,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.role_audit_log (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  user_id uuid NOT NULL,
  role_assigned user_role NOT NULL,
  assigned_by uuid NOT NULL,
  assigned_at timestamp with time zone DEFAULT now() NOT NULL,
  action text NOT NULL,
  notes text
);

CREATE TABLE public.schedule_participants (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  schedule_id uuid NOT NULL,
  user_id uuid NOT NULL,
  registered_at timestamp with time zone DEFAULT now() NOT NULL,
  attended boolean DEFAULT false
);

CREATE TABLE public.schedules (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  title text NOT NULL,
  description text,
  activity_type text NOT NULL,
  start_time timestamp with time zone NOT NULL,
  end_time timestamp with time zone NOT NULL,
  instructor_id uuid,
  max_participants integer,
  location text,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  color text DEFAULT '#6366f1'::text,
  schedule_type schedule_type DEFAULT 'intensive'::schedule_type NOT NULL,
  stream_id uuid
);

CREATE TABLE public.streams (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  name text NOT NULL,
  description text,
  start_date date NOT NULL,
  end_date date,
  max_participants integer,
  is_active boolean DEFAULT true,
  stream_type text DEFAULT 'intensive'::text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.tactical_sessions (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  user_id uuid NOT NULL,
  points_earned integer DEFAULT 3 NOT NULL,
  passed boolean DEFAULT false,
  verified boolean DEFAULT false,
  verified_by uuid,
  session_date timestamp with time zone DEFAULT now() NOT NULL,
  location text,
  notes text,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.telegram_bot_logs (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  telegram_id text,
  event_type text NOT NULL,
  payload jsonb,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.telegram_bot_sessions (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  telegram_id text NOT NULL,
  referral_code text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  expires_at timestamp with time zone DEFAULT (now() + '01:00:00'::interval) NOT NULL
);

CREATE TABLE public.telegram_leads (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  telegram_id text NOT NULL,
  telegram_username text,
  telegram_first_name text,
  telegram_last_name text,
  phone text,
  normalized_phone text,
  referral_code text,
  status text DEFAULT 'new'::text NOT NULL,
  raw jsonb,
  processed_by uuid,
  processed_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.testimonials (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  participant_name character varying(100) NOT NULL,
  participant_title character varying(200),
  content text,
  video_url text,
  image_url text,
  is_active boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  consent_given boolean DEFAULT false,
  consent_date timestamp with time zone,
  data_retention_until timestamp with time zone,
  display_name text
);

CREATE TABLE public.totems (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  totem_type totem_type NOT NULL,
  name text NOT NULL,
  description text,
  discipline text NOT NULL,
  required_points integer,
  required_attendance_percentage integer DEFAULT 80,
  special_requirements jsonb,
  icon_name text,
  icon_color text DEFAULT '#e60000'::text,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.trainers (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  name text NOT NULL,
  role text NOT NULL,
  quote text,
  bio text,
  image_url text,
  experience integer,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  sort_order integer DEFAULT 1,
  updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.training_programs (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  name text NOT NULL,
  description text,
  category text NOT NULL,
  difficulty_level integer DEFAULT 1,
  duration_minutes integer,
  points_reward integer DEFAULT 1,
  image_url text,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.training_sessions (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  user_id uuid NOT NULL,
  program_id uuid,
  trainer_id uuid,
  session_type text NOT NULL,
  points_earned integer DEFAULT 1,
  session_date timestamp with time zone DEFAULT now(),
  notes text,
  verified boolean DEFAULT false,
  verified_by uuid,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  activity_type text,
  multiplier numeric(3,1) DEFAULT 1.0
);

CREATE TABLE public.user_achievements (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  user_id uuid NOT NULL,
  achievement_id uuid NOT NULL,
  earned_at timestamp with time zone DEFAULT now(),
  progress integer DEFAULT 100,
  is_completed boolean DEFAULT true,
  verified_by uuid,
  notes text
);

CREATE TABLE public.user_activities (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  user_id uuid NOT NULL,
  activity_id uuid NOT NULL,
  completed_at timestamp with time zone DEFAULT now() NOT NULL,
  points_earned integer DEFAULT 0,
  notes text,
  verified boolean DEFAULT false,
  verified_by uuid,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.user_challenges (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  user_id uuid NOT NULL,
  challenge_id uuid NOT NULL,
  joined_at timestamp with time zone DEFAULT now(),
  completed_at timestamp with time zone,
  progress integer DEFAULT 0,
  points_earned integer DEFAULT 0,
  is_completed boolean DEFAULT false,
  result_data jsonb
);

CREATE TABLE public.user_points (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  user_id uuid NOT NULL,
  bjj_points integer DEFAULT 0,
  kick_points integer DEFAULT 0,
  ofp_points integer DEFAULT 0,
  pyramid_kemp_points integer DEFAULT 0,
  nutrition_points integer DEFAULT 0,
  tactics_points integer DEFAULT 0,
  total_points integer DEFAULT 0,
  bjj_sessions_total integer DEFAULT 0,
  bjj_sessions_attended integer DEFAULT 0,
  kick_sessions_total integer DEFAULT 0,
  kick_sessions_attended integer DEFAULT 0,
  ofp_sessions_total integer DEFAULT 0,
  ofp_sessions_attended integer DEFAULT 0,
  last_updated timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.user_roles (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  user_id uuid NOT NULL,
  role user_role DEFAULT 'user'::user_role NOT NULL,
  assigned_by uuid,
  assigned_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.user_totems (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  user_id uuid NOT NULL,
  totem_id uuid NOT NULL,
  assigned_by uuid,
  assigned_at timestamp with time zone DEFAULT now() NOT NULL,
  notes text,
  is_manual boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.weekly_summaries (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  user_id uuid NOT NULL,
  week_start date NOT NULL,
  summary_text text NOT NULL,
  status text DEFAULT 'draft'::text NOT NULL,
  edited_text text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  sent_at timestamp with time zone,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public."аскезы_участников" (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  participant_id uuid NOT NULL,
  name text NOT NULL,
  description text,
  duration_days integer DEFAULT 14 NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  is_completed boolean DEFAULT false,
  completion_percentage integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public."кэмп_активности" (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  participant_id uuid NOT NULL,
  activity_type_new activity_type_new,
  reward_type reward_type NOT NULL,
  zakal_subtype zakal_subtype,
  shram_subtype shram_subtype,
  training_subtype training_subtype,
  lecture_subtype lecture_subtype,
  points integer DEFAULT 1 NOT NULL,
  multiplier numeric DEFAULT 1.0,
  auto_points integer DEFAULT 1,
  activity_date date DEFAULT CURRENT_DATE NOT NULL,
  description text,
  verified_by text,
  attendance_counted boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public."тотемы_участников" (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  participant_id uuid NOT NULL,
  totem_type totem_type NOT NULL,
  requirements_met jsonb,
  earned_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public."участники" (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  user_id uuid,
  name text NOT NULL,
  last_name text,
  email text,
  birth_date date,
  height_cm integer,
  weight_kg integer,
  points integer DEFAULT 0 NOT NULL,
  stream_id uuid,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- ---------------- CONSTRAINTS (PK / UNIQUE / CHECK / FK) ----------------
ALTER TABLE public.achievement_types ADD CONSTRAINT achievement_types_pkey PRIMARY KEY (id);
ALTER TABLE public.achievements ADD CONSTRAINT achievements_pkey PRIMARY KEY (id);
ALTER TABLE public.activities ADD CONSTRAINT activities_pkey PRIMARY KEY (id);
ALTER TABLE public.activity_checkins ADD CONSTRAINT activity_checkins_pkey PRIMARY KEY (id);
ALTER TABLE public.admin_access_log ADD CONSTRAINT admin_access_log_pkey PRIMARY KEY (id);
ALTER TABLE public.admin_sessions ADD CONSTRAINT admin_sessions_pkey PRIMARY KEY (id);
ALTER TABLE public.application_notes ADD CONSTRAINT application_notes_pkey PRIMARY KEY (id);
ALTER TABLE public.application_reminders ADD CONSTRAINT application_reminders_pkey PRIMARY KEY (id);
ALTER TABLE public.ascetic_activities ADD CONSTRAINT ascetic_activities_pkey PRIMARY KEY (id);
ALTER TABLE public.ascetic_types ADD CONSTRAINT ascetic_types_pkey PRIMARY KEY (id);
ALTER TABLE public.audit_log ADD CONSTRAINT audit_log_pkey PRIMARY KEY (id);
ALTER TABLE public.broadcast_messages ADD CONSTRAINT broadcast_messages_pkey PRIMARY KEY (id);
ALTER TABLE public.broadcast_responses ADD CONSTRAINT broadcast_responses_pkey PRIMARY KEY (id);
ALTER TABLE public.broadcasts ADD CONSTRAINT broadcasts_pkey PRIMARY KEY (id);
ALTER TABLE public.challenge_entries ADD CONSTRAINT challenge_entries_pkey PRIMARY KEY (id);
ALTER TABLE public.challenges ADD CONSTRAINT challenges_pkey PRIMARY KEY (id);
ALTER TABLE public.coin_rules ADD CONSTRAINT coin_rules_pkey PRIMARY KEY (id);
ALTER TABLE public.coin_transactions ADD CONSTRAINT coin_transactions_pkey PRIMARY KEY (id);
ALTER TABLE public.contact_rate_limit ADD CONSTRAINT contact_rate_limit_pkey PRIMARY KEY (id);
ALTER TABLE public.contact_submissions ADD CONSTRAINT contact_submissions_pkey PRIMARY KEY (id);
ALTER TABLE public.content_blocks ADD CONSTRAINT content_blocks_pkey PRIMARY KEY (id);
ALTER TABLE public.contract_data ADD CONSTRAINT contract_data_pkey PRIMARY KEY (id);
ALTER TABLE public.contracts ADD CONSTRAINT contracts_pkey PRIMARY KEY (id);
ALTER TABLE public.cooper_test_results ADD CONSTRAINT cooper_test_results_pkey PRIMARY KEY (id);
ALTER TABLE public.crash_tests ADD CONSTRAINT crash_tests_pkey PRIMARY KEY (id);
ALTER TABLE public.habit_progress ADD CONSTRAINT habit_progress_pkey PRIMARY KEY (id);
ALTER TABLE public.hero_races ADD CONSTRAINT hero_races_pkey PRIMARY KEY (id);
ALTER TABLE public.homework_assignments ADD CONSTRAINT homework_assignments_pkey PRIMARY KEY (id);
ALTER TABLE public.homework_submissions ADD CONSTRAINT homework_submissions_pkey PRIMARY KEY (id);
ALTER TABLE public.intensive_streams ADD CONSTRAINT intensive_streams_pkey PRIMARY KEY (id);
ALTER TABLE public.journal_answers ADD CONSTRAINT journal_answers_pkey PRIMARY KEY (id);
ALTER TABLE public.journal_emotions ADD CONSTRAINT journal_emotions_pkey PRIMARY KEY (id);
ALTER TABLE public.journal_entries ADD CONSTRAINT journal_entries_pkey PRIMARY KEY (id);
ALTER TABLE public.journal_prompts ADD CONSTRAINT journal_prompts_pkey PRIMARY KEY (id);
ALTER TABLE public.leaderboard ADD CONSTRAINT leaderboard_pkey PRIMARY KEY (id);
ALTER TABLE public.lectures ADD CONSTRAINT lectures_pkey PRIMARY KEY (id);
ALTER TABLE public.mastermind_entries ADD CONSTRAINT mastermind_entries_pkey PRIMARY KEY (id);
ALTER TABLE public.mastermind_groups ADD CONSTRAINT mastermind_groups_pkey PRIMARY KEY (id);
ALTER TABLE public.mastermind_members ADD CONSTRAINT mastermind_members_pkey PRIMARY KEY (id);
ALTER TABLE public.mastermind_tasks ADD CONSTRAINT mastermind_tasks_pkey PRIMARY KEY (id);
ALTER TABLE public.materials ADD CONSTRAINT materials_pkey PRIMARY KEY (id);
ALTER TABLE public.moments ADD CONSTRAINT moments_pkey PRIMARY KEY (id);
ALTER TABLE public.notifications ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);
ALTER TABLE public.participant_habits ADD CONSTRAINT participant_habits_pkey PRIMARY KEY (id);
ALTER TABLE public.participant_notes ADD CONSTRAINT participant_notes_pkey PRIMARY KEY (id);
ALTER TABLE public.participant_status_history ADD CONSTRAINT participant_status_history_pkey PRIMARY KEY (id);
ALTER TABLE public.participant_tags ADD CONSTRAINT participant_tags_pkey PRIMARY KEY (id);
ALTER TABLE public.profile_tags ADD CONSTRAINT profile_tags_pkey PRIMARY KEY (profile_user_id, tag_id);
ALTER TABLE public.profiles ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);
ALTER TABLE public.public_profiles ADD CONSTRAINT public_profiles_pkey PRIMARY KEY (id);
ALTER TABLE public.public_testimonials ADD CONSTRAINT public_testimonials_pkey PRIMARY KEY (id);
ALTER TABLE public.pyramid_levels ADD CONSTRAINT pyramid_levels_pkey PRIMARY KEY (id);
ALTER TABLE public.referral_leads ADD CONSTRAINT referral_leads_pkey PRIMARY KEY (id);
ALTER TABLE public.referral_settings ADD CONSTRAINT referral_settings_pkey PRIMARY KEY (id);
ALTER TABLE public.reward_requests ADD CONSTRAINT reward_requests_pkey PRIMARY KEY (id);
ALTER TABLE public.rewards ADD CONSTRAINT rewards_pkey PRIMARY KEY (id);
ALTER TABLE public.role_audit_log ADD CONSTRAINT role_audit_log_pkey PRIMARY KEY (id);
ALTER TABLE public.schedule_participants ADD CONSTRAINT schedule_participants_pkey PRIMARY KEY (id);
ALTER TABLE public.schedules ADD CONSTRAINT schedules_pkey PRIMARY KEY (id);
ALTER TABLE public.streams ADD CONSTRAINT streams_pkey PRIMARY KEY (id);
ALTER TABLE public.tactical_sessions ADD CONSTRAINT tactical_sessions_pkey PRIMARY KEY (id);
ALTER TABLE public.telegram_bot_logs ADD CONSTRAINT telegram_bot_logs_pkey PRIMARY KEY (id);
ALTER TABLE public.telegram_bot_sessions ADD CONSTRAINT telegram_bot_sessions_pkey PRIMARY KEY (id);
ALTER TABLE public.telegram_leads ADD CONSTRAINT telegram_leads_pkey PRIMARY KEY (id);
ALTER TABLE public.testimonials ADD CONSTRAINT testimonials_pkey PRIMARY KEY (id);
ALTER TABLE public.totems ADD CONSTRAINT totems_pkey PRIMARY KEY (id);
ALTER TABLE public.trainers ADD CONSTRAINT trainers_pkey PRIMARY KEY (id);
ALTER TABLE public.training_programs ADD CONSTRAINT training_programs_pkey PRIMARY KEY (id);
ALTER TABLE public.training_sessions ADD CONSTRAINT training_sessions_pkey PRIMARY KEY (id);
ALTER TABLE public.user_achievements ADD CONSTRAINT user_achievements_pkey PRIMARY KEY (id);
ALTER TABLE public.user_activities ADD CONSTRAINT user_activities_pkey PRIMARY KEY (id);
ALTER TABLE public.user_challenges ADD CONSTRAINT user_challenges_pkey PRIMARY KEY (id);
ALTER TABLE public.user_points ADD CONSTRAINT user_points_pkey PRIMARY KEY (id);
ALTER TABLE public.user_roles ADD CONSTRAINT user_roles_pkey PRIMARY KEY (id);
ALTER TABLE public.user_totems ADD CONSTRAINT user_totems_pkey PRIMARY KEY (id);
ALTER TABLE public.weekly_summaries ADD CONSTRAINT weekly_summaries_pkey PRIMARY KEY (id);
ALTER TABLE public."аскезы_участников" ADD CONSTRAINT "аскезы_участников_pkey" PRIMARY KEY (id);
ALTER TABLE public."кэмп_активности" ADD CONSTRAINT "кэмп_активности_pkey" PRIMARY KEY (id);
ALTER TABLE public."тотемы_участников" ADD CONSTRAINT "тотемы_участников_pkey" PRIMARY KEY (id);
ALTER TABLE public."участники" ADD CONSTRAINT "участники_pkey" PRIMARY KEY (id);
ALTER TABLE public.activity_checkins ADD CONSTRAINT activity_checkins_user_id_activity_type_checked_at_key UNIQUE (user_id, activity_type, checked_at);
ALTER TABLE public.ascetic_types ADD CONSTRAINT ascetic_types_name_key UNIQUE (name);
ALTER TABLE public.broadcast_responses ADD CONSTRAINT broadcast_responses_broadcast_id_user_id_button_id_key UNIQUE (broadcast_id, user_id, button_id);
ALTER TABLE public.challenge_entries ADD CONSTRAINT challenge_entries_challenge_id_user_id_entry_date_key UNIQUE (challenge_id, user_id, entry_date);
ALTER TABLE public.coin_rules ADD CONSTRAINT coin_rules_code_key UNIQUE (code);
ALTER TABLE public.content_blocks ADD CONSTRAINT content_blocks_block_key_key UNIQUE (block_key);
ALTER TABLE public.contract_data ADD CONSTRAINT contract_data_user_id_key UNIQUE (user_id);
ALTER TABLE public.habit_progress ADD CONSTRAINT habit_progress_habit_id_progress_date_key UNIQUE (habit_id, progress_date);
ALTER TABLE public.journal_answers ADD CONSTRAINT journal_answers_entry_id_prompt_id_key UNIQUE (entry_id, prompt_id);
ALTER TABLE public.journal_entries ADD CONSTRAINT journal_entries_user_id_entry_date_key UNIQUE (user_id, entry_date);
ALTER TABLE public.leaderboard ADD CONSTRAINT leaderboard_user_id_key UNIQUE (user_id);
ALTER TABLE public.mastermind_members ADD CONSTRAINT mastermind_members_user_group_unique UNIQUE (user_id, group_id);
ALTER TABLE public.participant_tags ADD CONSTRAINT participant_tags_name_key UNIQUE (name);
ALTER TABLE public.profiles ADD CONSTRAINT profiles_referral_code_key UNIQUE (referral_code);
ALTER TABLE public.profiles ADD CONSTRAINT profiles_user_id_key UNIQUE (user_id);
ALTER TABLE public.pyramid_levels ADD CONSTRAINT pyramid_levels_level_number_key UNIQUE (level_number);
ALTER TABLE public.schedule_participants ADD CONSTRAINT schedule_participants_schedule_id_user_id_key UNIQUE (schedule_id, user_id);
ALTER TABLE public.telegram_bot_sessions ADD CONSTRAINT telegram_bot_sessions_telegram_id_key UNIQUE (telegram_id);
ALTER TABLE public.totems ADD CONSTRAINT totems_totem_type_key UNIQUE (totem_type);
ALTER TABLE public.user_achievements ADD CONSTRAINT user_achievements_user_id_achievement_id_key UNIQUE (user_id, achievement_id);
ALTER TABLE public.user_challenges ADD CONSTRAINT user_challenges_user_id_challenge_id_key UNIQUE (user_id, challenge_id);
ALTER TABLE public.user_points ADD CONSTRAINT user_points_user_id_key UNIQUE (user_id);
ALTER TABLE public.user_roles ADD CONSTRAINT user_roles_user_id_role_key UNIQUE (user_id, role);
ALTER TABLE public.user_totems ADD CONSTRAINT unique_user_totem UNIQUE (user_id, totem_id);
ALTER TABLE public.weekly_summaries ADD CONSTRAINT weekly_summaries_user_id_week_start_key UNIQUE (user_id, week_start);
ALTER TABLE public.activities ADD CONSTRAINT activities_difficulty_level_check CHECK (((difficulty_level >= 1) AND (difficulty_level <= 5)));
ALTER TABLE public.broadcast_messages ADD CONSTRAINT broadcast_messages_audience_check CHECK ((audience = ANY (ARRAY['intensive'::text, 'resident'::text, 'all'::text])));
ALTER TABLE public.broadcast_messages ADD CONSTRAINT broadcast_messages_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'sent'::text])));
ALTER TABLE public.contact_submissions ADD CONSTRAINT contact_submissions_status_check CHECK ((status = ANY (ARRAY['new'::text, 'contacted'::text, 'enrolled'::text, 'rejected'::text])));
ALTER TABLE public.cooper_test_results ADD CONSTRAINT cooper_test_results_gender_check CHECK ((gender = ANY (ARRAY['male'::text, 'female'::text])));
ALTER TABLE public.cooper_test_results ADD CONSTRAINT cooper_test_results_test_phase_check CHECK ((test_phase = ANY (ARRAY['before_stream'::text, 'during_stream'::text, 'after_stream'::text])));
ALTER TABLE public.homework_assignments ADD CONSTRAINT hw_target_check CHECK (((stream_id IS NOT NULL) OR (target_user_id IS NOT NULL)));
ALTER TABLE public.homework_submissions ADD CONSTRAINT hw_status_check CHECK ((status = ANY (ARRAY['submitted'::text, 'accepted'::text, 'rework'::text])));
ALTER TABLE public.journal_emotions ADD CONSTRAINT journal_emotions_intensity_check CHECK (((intensity >= 1) AND (intensity <= 5)));
ALTER TABLE public.journal_entries ADD CONSTRAINT journal_entries_day_type_check CHECK ((day_type = ANY (ARRAY['monday'::text, 'wednesday'::text, 'friday'::text, 'saturday'::text, 'sunday'::text, 'weekday'::text])));
ALTER TABLE public.journal_prompts ADD CONSTRAINT journal_prompts_day_type_check CHECK ((day_type = ANY (ARRAY['monday'::text, 'wednesday'::text, 'friday'::text, 'saturday'::text, 'sunday'::text, 'weekday'::text])));
ALTER TABLE public.mastermind_entries ADD CONSTRAINT mastermind_entries_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'reviewed'::text, 'commented'::text])));
ALTER TABLE public.mastermind_tasks ADD CONSTRAINT mastermind_tasks_approval_status_check CHECK ((approval_status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text, NULL::text])));
ALTER TABLE public.materials ADD CONSTRAINT materials_available_to_check CHECK ((available_to = ANY (ARRAY['all'::text, 'intensive'::text, 'club'::text])));
ALTER TABLE public.materials ADD CONSTRAINT materials_status_check CHECK ((status = ANY (ARRAY['open'::text, 'closed'::text])));
ALTER TABLE public.profiles ADD CONSTRAINT profiles_coaching_type_check CHECK ((coaching_type = ANY (ARRAY['standard'::text, 'personal'::text])));
ALTER TABLE public.pyramid_levels ADD CONSTRAINT pyramid_levels_level_number_check CHECK (((level_number >= 1) AND (level_number <= 7)));
ALTER TABLE public.referral_leads ADD CONSTRAINT referral_leads_status_check CHECK ((status = ANY (ARRAY['new'::text, 'in_progress'::text, 'contacted'::text, 'paid'::text, 'confirmed'::text, 'rejected'::text, 'rewarded'::text])));
ALTER TABLE public.rewards ADD CONSTRAINT rewards_cost_coins_check CHECK ((cost_coins >= 0));
ALTER TABLE public.weekly_summaries ADD CONSTRAINT weekly_summaries_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'sent'::text, 'edited'::text])));
ALTER TABLE public.activity_checkins ADD CONSTRAINT activity_checkins_stream_id_fkey FOREIGN KEY (stream_id) REFERENCES streams(id);
ALTER TABLE public.activity_checkins ADD CONSTRAINT activity_checkins_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(user_id) ON DELETE CASCADE;
ALTER TABLE public.application_notes ADD CONSTRAINT application_notes_submission_id_fkey FOREIGN KEY (submission_id) REFERENCES contact_submissions(id) ON DELETE CASCADE;
ALTER TABLE public.application_reminders ADD CONSTRAINT application_reminders_submission_id_fkey FOREIGN KEY (submission_id) REFERENCES contact_submissions(id) ON DELETE CASCADE;
ALTER TABLE public.ascetic_activities ADD CONSTRAINT ascetic_activities_ascetic_type_id_fkey FOREIGN KEY (ascetic_type_id) REFERENCES ascetic_types(id);
ALTER TABLE public.ascetic_activities ADD CONSTRAINT ascetic_activities_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.ascetic_activities ADD CONSTRAINT ascetic_activities_verified_by_fkey FOREIGN KEY (verified_by) REFERENCES auth.users(id);
ALTER TABLE public.broadcast_responses ADD CONSTRAINT broadcast_responses_broadcast_id_fkey FOREIGN KEY (broadcast_id) REFERENCES broadcast_messages(id) ON DELETE CASCADE;
ALTER TABLE public.challenge_entries ADD CONSTRAINT challenge_entries_challenge_id_fkey FOREIGN KEY (challenge_id) REFERENCES challenges(id);
ALTER TABLE public.challenge_entries ADD CONSTRAINT challenge_entries_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(user_id);
ALTER TABLE public.coin_transactions ADD CONSTRAINT coin_transactions_rule_id_fkey FOREIGN KEY (rule_id) REFERENCES coin_rules(id);
ALTER TABLE public.contact_submissions ADD CONSTRAINT contact_submissions_processed_by_fkey FOREIGN KEY (processed_by) REFERENCES auth.users(id);
ALTER TABLE public.contact_submissions ADD CONSTRAINT contact_submissions_referrer_user_id_fkey FOREIGN KEY (referrer_user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.contact_submissions ADD CONSTRAINT contact_submissions_stream_id_fkey FOREIGN KEY (stream_id) REFERENCES streams(id);
ALTER TABLE public.contract_data ADD CONSTRAINT contract_data_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.contracts ADD CONSTRAINT contracts_stream_id_fkey FOREIGN KEY (stream_id) REFERENCES streams(id);
ALTER TABLE public.contracts ADD CONSTRAINT contracts_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.cooper_test_results ADD CONSTRAINT cooper_test_results_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.cooper_test_results ADD CONSTRAINT cooper_test_results_verified_by_fkey FOREIGN KEY (verified_by) REFERENCES auth.users(id);
ALTER TABLE public.crash_tests ADD CONSTRAINT crash_tests_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.crash_tests ADD CONSTRAINT crash_tests_verified_by_fkey FOREIGN KEY (verified_by) REFERENCES auth.users(id);
ALTER TABLE public.habit_progress ADD CONSTRAINT habit_progress_habit_id_fkey FOREIGN KEY (habit_id) REFERENCES participant_habits(id) ON DELETE CASCADE;
ALTER TABLE public.hero_races ADD CONSTRAINT hero_races_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.hero_races ADD CONSTRAINT hero_races_verified_by_fkey FOREIGN KEY (verified_by) REFERENCES auth.users(id);
ALTER TABLE public.homework_assignments ADD CONSTRAINT homework_assignments_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.homework_assignments ADD CONSTRAINT homework_assignments_stream_id_fkey FOREIGN KEY (stream_id) REFERENCES streams(id) ON DELETE SET NULL;
ALTER TABLE public.homework_assignments ADD CONSTRAINT homework_assignments_target_user_id_fkey FOREIGN KEY (target_user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.homework_submissions ADD CONSTRAINT homework_submissions_assignment_id_fkey FOREIGN KEY (assignment_id) REFERENCES homework_assignments(id) ON DELETE CASCADE;
ALTER TABLE public.homework_submissions ADD CONSTRAINT homework_submissions_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.homework_submissions ADD CONSTRAINT homework_submissions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.homework_submissions ADD CONSTRAINT homework_submissions_verified_by_fkey FOREIGN KEY (verified_by) REFERENCES auth.users(id);
ALTER TABLE public.journal_answers ADD CONSTRAINT journal_answers_entry_id_fkey FOREIGN KEY (entry_id) REFERENCES journal_entries(id) ON DELETE CASCADE;
ALTER TABLE public.journal_answers ADD CONSTRAINT journal_answers_prompt_id_fkey FOREIGN KEY (prompt_id) REFERENCES journal_prompts(id) ON DELETE CASCADE;
ALTER TABLE public.journal_emotions ADD CONSTRAINT journal_emotions_entry_id_fkey FOREIGN KEY (entry_id) REFERENCES journal_entries(id) ON DELETE CASCADE;
ALTER TABLE public.leaderboard ADD CONSTRAINT leaderboard_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(user_id) ON DELETE CASCADE;
ALTER TABLE public.lectures ADD CONSTRAINT lectures_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.lectures ADD CONSTRAINT lectures_verified_by_fkey FOREIGN KEY (verified_by) REFERENCES auth.users(id);
ALTER TABLE public.mastermind_entries ADD CONSTRAINT mastermind_entries_member_id_fkey FOREIGN KEY (member_id) REFERENCES mastermind_members(id) ON DELETE CASCADE;
ALTER TABLE public.mastermind_members ADD CONSTRAINT mastermind_members_group_id_fkey FOREIGN KEY (group_id) REFERENCES mastermind_groups(id);
ALTER TABLE public.mastermind_members ADD CONSTRAINT mastermind_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(user_id);
ALTER TABLE public.mastermind_tasks ADD CONSTRAINT mastermind_tasks_created_by_fkey FOREIGN KEY (created_by) REFERENCES profiles(user_id);
ALTER TABLE public.mastermind_tasks ADD CONSTRAINT mastermind_tasks_member_id_fkey FOREIGN KEY (member_id) REFERENCES mastermind_members(id) ON DELETE CASCADE;
ALTER TABLE public.notifications ADD CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(user_id) ON DELETE CASCADE;
ALTER TABLE public.profile_tags ADD CONSTRAINT profile_tags_tag_id_fkey FOREIGN KEY (tag_id) REFERENCES participant_tags(id) ON DELETE CASCADE;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES auth.users(id);
ALTER TABLE public.profiles ADD CONSTRAINT profiles_current_stream_id_fkey FOREIGN KEY (current_stream_id) REFERENCES streams(id);
ALTER TABLE public.profiles ADD CONSTRAINT profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.public_profiles ADD CONSTRAINT public_profiles_current_stream_id_fkey FOREIGN KEY (current_stream_id) REFERENCES streams(id);
ALTER TABLE public.public_profiles ADD CONSTRAINT public_profiles_profiles_fk FOREIGN KEY (id) REFERENCES profiles(id) ON DELETE CASCADE;
ALTER TABLE public.reward_requests ADD CONSTRAINT reward_requests_reward_id_fkey FOREIGN KEY (reward_id) REFERENCES rewards(id) ON DELETE RESTRICT;
ALTER TABLE public.schedule_participants ADD CONSTRAINT schedule_participants_schedule_id_fkey FOREIGN KEY (schedule_id) REFERENCES schedules(id) ON DELETE CASCADE;
ALTER TABLE public.schedule_participants ADD CONSTRAINT schedule_participants_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.schedules ADD CONSTRAINT schedules_instructor_id_fkey FOREIGN KEY (instructor_id) REFERENCES trainers(id) ON DELETE SET NULL;
ALTER TABLE public.schedules ADD CONSTRAINT schedules_stream_id_fkey FOREIGN KEY (stream_id) REFERENCES streams(id) ON DELETE SET NULL;
ALTER TABLE public.tactical_sessions ADD CONSTRAINT tactical_sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.tactical_sessions ADD CONSTRAINT tactical_sessions_verified_by_fkey FOREIGN KEY (verified_by) REFERENCES auth.users(id);
ALTER TABLE public.training_sessions ADD CONSTRAINT training_sessions_program_id_fkey FOREIGN KEY (program_id) REFERENCES training_programs(id);
ALTER TABLE public.training_sessions ADD CONSTRAINT training_sessions_trainer_id_fkey FOREIGN KEY (trainer_id) REFERENCES trainers(id);
ALTER TABLE public.training_sessions ADD CONSTRAINT training_sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(user_id) ON DELETE CASCADE;
ALTER TABLE public.training_sessions ADD CONSTRAINT training_sessions_verified_by_fkey FOREIGN KEY (verified_by) REFERENCES trainers(id);
ALTER TABLE public.user_achievements ADD CONSTRAINT user_achievements_achievement_id_fkey FOREIGN KEY (achievement_id) REFERENCES achievements(id) ON DELETE CASCADE;
ALTER TABLE public.user_achievements ADD CONSTRAINT user_achievements_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(user_id) ON DELETE CASCADE;
ALTER TABLE public.user_achievements ADD CONSTRAINT user_achievements_verified_by_fkey FOREIGN KEY (verified_by) REFERENCES trainers(id);
ALTER TABLE public.user_activities ADD CONSTRAINT user_activities_activity_id_fkey FOREIGN KEY (activity_id) REFERENCES activities(id);
ALTER TABLE public.user_activities ADD CONSTRAINT user_activities_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.user_activities ADD CONSTRAINT user_activities_verified_by_fkey FOREIGN KEY (verified_by) REFERENCES auth.users(id);
ALTER TABLE public.user_challenges ADD CONSTRAINT user_challenges_challenge_id_fkey FOREIGN KEY (challenge_id) REFERENCES challenges(id) ON DELETE CASCADE;
ALTER TABLE public.user_challenges ADD CONSTRAINT user_challenges_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(user_id) ON DELETE CASCADE;
ALTER TABLE public.user_points ADD CONSTRAINT user_points_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.user_roles ADD CONSTRAINT user_roles_assigned_by_fkey FOREIGN KEY (assigned_by) REFERENCES auth.users(id);
ALTER TABLE public.user_roles ADD CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.user_totems ADD CONSTRAINT fk_user_totems_assigned_by FOREIGN KEY (assigned_by) REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.user_totems ADD CONSTRAINT fk_user_totems_totem FOREIGN KEY (totem_id) REFERENCES totems(id) ON DELETE CASCADE;
ALTER TABLE public.user_totems ADD CONSTRAINT fk_user_totems_user FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.weekly_summaries ADD CONSTRAINT weekly_summaries_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(user_id) ON DELETE CASCADE;
ALTER TABLE public."аскезы_участников" ADD CONSTRAINT "аскезы_участников_participant_id_fkey" FOREIGN KEY (participant_id) REFERENCES "участники"(id);
ALTER TABLE public."кэмп_активности" ADD CONSTRAINT "кэмп_активности_participant_id_fkey" FOREIGN KEY (participant_id) REFERENCES "участники"(id);
ALTER TABLE public."тотемы_участников" ADD CONSTRAINT "тотемы_участников_participant_id_fkey" FOREIGN KEY (participant_id) REFERENCES "участники"(id);
ALTER TABLE public."участники" ADD CONSTRAINT "участники_stream_id_fkey" FOREIGN KEY (stream_id) REFERENCES intensive_streams(id);

-- ################ 03_indexes.sql ################

-- 03_indexes.sql — неуникальные и частичные индексы (63). PK/UNIQUE созданы в 02.

CREATE INDEX idx_activity_checkins_user_id ON public.activity_checkins USING btree (user_id);
CREATE INDEX idx_application_notes_submission ON public.application_notes USING btree (submission_id, created_at DESC);
CREATE INDEX idx_application_reminders_pending ON public.application_reminders USING btree (remind_at) WHERE ((sent = false) AND (done = false));
CREATE INDEX idx_broadcast_responses_broadcast ON public.broadcast_responses USING btree (broadcast_id);
CREATE INDEX idx_broadcast_responses_user ON public.broadcast_responses USING btree (user_id);
CREATE INDEX idx_broadcasts_created_at ON public.broadcasts USING btree (created_at DESC);
CREATE INDEX idx_challenge_entries_user ON public.challenge_entries USING btree (challenge_id, user_id);
CREATE INDEX idx_coin_tx_source ON public.coin_transactions USING btree (source_type, source_id);
CREATE INDEX idx_coin_tx_user ON public.coin_transactions USING btree (user_id);
CREATE UNIQUE INDEX uniq_coin_tx_source_rule ON public.coin_transactions USING btree (user_id, source_type, source_id, rule_id) WHERE ((source_type IS NOT NULL) AND (source_id IS NOT NULL) AND (rule_id IS NOT NULL));
CREATE UNIQUE INDEX uq_coin_tx_referral_lead ON public.coin_transactions USING btree (source_id) WHERE (source_type = 'referral_lead'::text);
CREATE UNIQUE INDEX uq_coin_tx_telegram_lead ON public.coin_transactions USING btree (source_id) WHERE (source_type = 'telegram_lead'::text);
CREATE INDEX idx_contact_rate_limit_ip_window ON public.contact_rate_limit USING btree (ip_address, window_start DESC);
CREATE INDEX contact_submissions_utm_campaign_idx ON public.contact_submissions USING btree (((utm_data ->> 'utm_campaign'::text)));
CREATE INDEX contact_submissions_utm_source_idx ON public.contact_submissions USING btree (((utm_data ->> 'utm_source'::text)));
CREATE INDEX idx_contact_submissions_created ON public.contact_submissions USING btree (created_at DESC);
CREATE INDEX idx_contact_submissions_created_at ON public.contact_submissions USING btree (created_at);
CREATE INDEX idx_contact_submissions_status ON public.contact_submissions USING btree (status);
CREATE INDEX idx_contract_data_user_id ON public.contract_data USING btree (user_id);
CREATE INDEX idx_contracts_status ON public.contracts USING btree (status);
CREATE INDEX idx_contracts_stream_id ON public.contracts USING btree (stream_id);
CREATE INDEX idx_contracts_user_id ON public.contracts USING btree (user_id);
CREATE INDEX idx_cooper_test_user_phase ON public.cooper_test_results USING btree (user_id, test_phase);
CREATE INDEX idx_hw_assignments_active ON public.homework_assignments USING btree (is_active);
CREATE INDEX idx_hw_assignments_stream ON public.homework_assignments USING btree (stream_id) WHERE (stream_id IS NOT NULL);
CREATE INDEX idx_hw_assignments_user ON public.homework_assignments USING btree (target_user_id) WHERE (target_user_id IS NOT NULL);
CREATE INDEX idx_hw_submissions_assignment ON public.homework_submissions USING btree (assignment_id);
CREATE INDEX idx_hw_submissions_status ON public.homework_submissions USING btree (status);
CREATE INDEX idx_journal_entries_user_date ON public.journal_entries USING btree (user_id, entry_date DESC);
CREATE INDEX idx_mm_entries_member ON public.mastermind_entries USING btree (member_id);
CREATE INDEX idx_mm_members_user ON public.mastermind_members USING btree (user_id);
CREATE INDEX idx_mm_tasks_member ON public.mastermind_tasks USING btree (member_id);
CREATE INDEX idx_materials_active ON public.materials USING btree (is_active);
CREATE INDEX idx_materials_stream ON public.materials USING btree (stream_id);
CREATE INDEX idx_participant_notes_profile ON public.participant_notes USING btree (profile_user_id, created_at DESC);
CREATE INDEX idx_status_history_profile ON public.participant_status_history USING btree (profile_user_id, changed_at DESC);
CREATE INDEX idx_profile_tags_tag ON public.profile_tags USING btree (tag_id);
CREATE INDEX idx_profiles_current_stream ON public.profiles USING btree (current_stream_id);
CREATE INDEX idx_profiles_participant_status ON public.profiles USING btree (participant_status);
CREATE INDEX idx_profiles_referral_code ON public.profiles USING btree (referral_code);
CREATE UNIQUE INDEX profiles_telegram_id_unique ON public.profiles USING btree (telegram_id) WHERE (telegram_id IS NOT NULL);
CREATE UNIQUE INDEX profiles_telegram_link_code_unique ON public.profiles USING btree (telegram_link_code) WHERE (telegram_link_code IS NOT NULL);
CREATE UNIQUE INDEX public_profiles_user_id_uk ON public.public_profiles USING btree (user_id);
CREATE INDEX idx_referral_leads_code ON public.referral_leads USING btree (referral_code);
CREATE INDEX idx_referral_leads_referrer ON public.referral_leads USING btree (referrer_user_id);
CREATE INDEX idx_referral_leads_status ON public.referral_leads USING btree (status);
CREATE INDEX idx_reward_requests_status ON public.reward_requests USING btree (status);
CREATE INDEX idx_reward_requests_user ON public.reward_requests USING btree (user_id);
CREATE UNIQUE INDEX uq_schedule_participants_user ON public.schedule_participants USING btree (schedule_id, user_id);
CREATE INDEX idx_schedules_stream_id ON public.schedules USING btree (stream_id);
CREATE INDEX idx_schedules_type ON public.schedules USING btree (schedule_type);
CREATE INDEX idx_telegram_bot_logs_created_at ON public.telegram_bot_logs USING btree (created_at DESC);
CREATE INDEX idx_telegram_bot_logs_event_type ON public.telegram_bot_logs USING btree (event_type);
CREATE INDEX idx_telegram_bot_logs_telegram_id ON public.telegram_bot_logs USING btree (telegram_id);
CREATE INDEX idx_bot_sessions_expires_at ON public.telegram_bot_sessions USING btree (expires_at);
CREATE INDEX idx_bot_sessions_telegram_id ON public.telegram_bot_sessions USING btree (telegram_id);
CREATE UNIQUE INDEX telegram_leads_active_tg_uniq ON public.telegram_leads USING btree (telegram_id) WHERE (status = ANY (ARRAY['new'::text, 'waiting_admin_approval'::text]));
CREATE INDEX telegram_leads_normalized_phone_idx ON public.telegram_leads USING btree (normalized_phone);
CREATE INDEX telegram_leads_status_idx ON public.telegram_leads USING btree (status);
CREATE INDEX idx_user_totems_totem_id ON public.user_totems USING btree (totem_id);
CREATE INDEX idx_user_totems_user_id ON public.user_totems USING btree (user_id);
CREATE INDEX weekly_summaries_status_idx ON public.weekly_summaries USING btree (status);
CREATE INDEX weekly_summaries_user_id_idx ON public.weekly_summaries USING btree (user_id);

-- ################ 04_functions.sql ################

-- 04_functions.sql — 92 функции схемы public (90 SECURITY DEFINER).
-- Секретов и персональных данных не содержит.

CREATE OR REPLACE FUNCTION public.admin_adjust_coins(p_user_id uuid, p_amount integer, p_reason text)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_new_balance integer;
BEGIN
  -- Только администраторы / суперадмины
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Недостаточно прав для изменения баланса коинов';
  END IF;

  -- Причина обязательна
  IF p_reason IS NULL OR length(trim(p_reason)) = 0 THEN
    RAISE EXCEPTION 'Причина операции обязательна';
  END IF;

  -- Сумма не может быть нулевой
  IF p_amount IS NULL OR p_amount = 0 THEN
    RAISE EXCEPTION 'Сумма операции должна быть отличной от нуля';
  END IF;

  -- Запись в журнал транзакций (баланс никогда не меняется напрямую)
  INSERT INTO public.coin_transactions (user_id, amount, reason, source_type, created_by)
  VALUES (p_user_id, p_amount, trim(p_reason), 'admin_manual', auth.uid());

  -- Пересчёт баланса через существующую логику
  v_new_balance := public.get_user_coin_balance(p_user_id);

  RETURN v_new_balance;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.admin_confirm_referral(p_lead_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_lead public.referral_leads%ROWTYPE;
  v_award jsonb;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Только администратор может подтверждать рефералов';
  END IF;

  SELECT * INTO v_lead FROM public.referral_leads WHERE id = p_lead_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Заявка не найдена';
  END IF;

  -- Award coins by rule; award_coins_by_rule guards against duplicates
  v_award := public.award_coins_by_rule(
    p_user_id      => v_lead.referrer_user_id,
    p_rule_code    => 'referral_confirmed',
    p_source_type  => 'referral_lead',
    p_source_id    => v_lead.id,
    p_reason       => 'Подтверждённый реферал'
  );

  -- Update lead state
  UPDATE public.referral_leads
  SET status = 'rewarded',
      reward_issued = true,
      bonus_awarded = true,
      bonus_amount = COALESCE((v_award->>'amount')::int, bonus_amount),
      confirmed_at = COALESCE(confirmed_at, now()),
      processed_by = auth.uid()
  WHERE id = p_lead_id;

  RETURN jsonb_build_object(
    'lead_id', p_lead_id,
    'award', v_award
  );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.admin_list_coin_balances()
 RETURNS TABLE(user_id uuid, display_name text, first_name text, last_name text, email text, participant_status text, stream_name text, balance integer, tx_count bigint, last_tx_at timestamp with time zone)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Только администратор может просматривать балансы';
  END IF;

  RETURN QUERY
  SELECT
    p.user_id,
    p.display_name,
    p.first_name,
    p.last_name,
    p.email,
    p.participant_status::text,
    s.name AS stream_name,
    COALESCE(ct.balance, 0)::integer AS balance,
    COALESCE(ct.tx_count, 0) AS tx_count,
    ct.last_tx_at
  FROM public.profiles p
  LEFT JOIN public.intensive_streams s ON s.id = p.current_stream_id
  LEFT JOIN (
    SELECT user_id,
           SUM(amount) AS balance,
           COUNT(*) AS tx_count,
           MAX(created_at) AS last_tx_at
    FROM public.coin_transactions
    GROUP BY user_id
  ) ct ON ct.user_id = p.user_id
  ORDER BY COALESCE(ct.balance, 0) DESC, p.display_name ASC;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.admin_set_approval(p_user_id uuid, p_approved boolean)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_rows_updated integer := 0;
begin
  -- Only admins can approve/unapprove participants
  if not public.is_admin(auth.uid()) then
    raise exception 'Only admins can approve/unapprove participants';
  end if;

  -- Update approval fields
  update public.profiles
  set 
    approved = p_approved,
    approved_at = case when p_approved then now() else null end,
    approved_by = case when p_approved then auth.uid() else null end,
    updated_at = now()
  where user_id = p_user_id;

  get diagnostics v_rows_updated = row_count;
  if v_rows_updated = 0 then
    raise exception 'Profile for user % not found', p_user_id;
  end if;

  -- Recalculate leaderboard/ranks for visibility changes
  perform public.update_user_leaderboard(p_user_id);
  perform public.recalculate_all_ranks();

  -- Audit
  insert into public.audit_log(action, table_name, record_id, user_id)
  values ('ADMIN_ACTION', 'profiles', p_user_id, auth.uid());
end;
$function$
;

CREATE OR REPLACE FUNCTION public.auto_cleanup_contact_submissions()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Delete contact submissions older than 90 days
  DELETE FROM contact_submissions 
  WHERE created_at < NOW() - INTERVAL '90 days';
  
  -- Log cleanup action
  INSERT INTO audit_log (action, table_name, user_id)
  VALUES ('DATA_CLEANUP', 'contact_submissions', NULL);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.auto_delete_old_contact_submissions()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Delete contact submissions older than 90 days
  DELETE FROM public.contact_submissions 
  WHERE created_at < NOW() - INTERVAL '90 days';
  RETURN NULL;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.award_coins_by_rule(p_user_id uuid, p_rule_code text, p_source_type text DEFAULT NULL::text, p_source_id uuid DEFAULT NULL::uuid, p_reason text DEFAULT NULL::text, p_amount_override integer DEFAULT NULL::integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_rule       public.coin_rules%ROWTYPE;
  v_amount     INTEGER;
  v_existing   UUID;
  v_tx_id      UUID;
  v_balance    INTEGER;
  v_is_service BOOLEAN;
BEGIN
  v_is_service := (current_setting('role', true) = 'service_role')
                  OR (auth.role() = 'service_role');

  IF NOT (v_is_service OR public.is_admin(auth.uid())) THEN
    RAISE EXCEPTION 'Недостаточно прав для начисления монет';
  END IF;

  SELECT * INTO v_rule FROM public.coin_rules WHERE code = p_rule_code;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Правило начисления не найдено: %', p_rule_code;
  END IF;

  IF NOT v_rule.is_active THEN
    RAISE EXCEPTION 'Правило начисления неактивно: %', p_rule_code;
  END IF;

  v_amount := COALESCE(p_amount_override, v_rule.coin_amount);

  -- Проверка суммы
  IF v_amount IS NULL OR v_amount = 0 THEN
    RAISE EXCEPTION 'Сумма начисления должна быть отличной от нуля';
  END IF;

  -- Дубль-защита только когда заданы source_type И source_id (и есть rule_id)
  IF p_source_type IS NOT NULL AND p_source_id IS NOT NULL THEN
    SELECT id INTO v_existing
    FROM public.coin_transactions
    WHERE user_id = p_user_id
      AND source_type = p_source_type
      AND source_id = p_source_id
      AND rule_id = v_rule.id
    LIMIT 1;

    IF v_existing IS NOT NULL THEN
      v_balance := public.get_user_coin_balance(p_user_id);
      RETURN jsonb_build_object(
        'awarded', false,
        'duplicate', true,
        'transaction_id', v_existing,
        'balance', v_balance,
        'rule_id', v_rule.id,
        'amount', 0
      );
    END IF;
  END IF;

  -- Только запись в журнал. Баланс напрямую не меняем.
  INSERT INTO public.coin_transactions (user_id, amount, reason, source_type, source_id, rule_id, created_by)
  VALUES (
    p_user_id,
    v_amount,
    COALESCE(p_reason, v_rule.name),
    p_source_type,
    p_source_id,
    v_rule.id,
    auth.uid()
  )
  RETURNING id INTO v_tx_id;

  v_balance := public.get_user_coin_balance(p_user_id);

  RETURN jsonb_build_object(
    'awarded', true,
    'duplicate', false,
    'transaction_id', v_tx_id,
    'balance', v_balance,
    'rule_id', v_rule.id,
    'amount', v_amount
  );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.book_schedule_session(p_telegram_id text, p_schedule_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id       UUID;
  v_max_part      INT;
  v_current_count BIGINT;
  v_rows_inserted INT;
BEGIN
  SELECT user_id INTO v_user_id
  FROM   profiles
  WHERE  telegram_id = p_telegram_id
  LIMIT  1;

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('booked', false, 'reason', 'not_linked');
  END IF;

  SELECT max_participants INTO v_max_part
  FROM   schedules
  WHERE  id = p_schedule_id
    AND  is_active = true
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('booked', false, 'reason', 'schedule_not_found');
  END IF;

  IF v_max_part IS NOT NULL THEN
    SELECT COUNT(*) INTO v_current_count
    FROM   schedule_participants
    WHERE  schedule_id = p_schedule_id;

    IF v_current_count >= v_max_part THEN
      RETURN jsonb_build_object(
        'booked',           false,
        'reason',           'session_full',
        'current_count',    v_current_count,
        'max_participants', v_max_part
      );
    END IF;
  END IF;

  INSERT INTO schedule_participants (schedule_id, user_id)
  VALUES (p_schedule_id, v_user_id)
  ON CONFLICT (schedule_id, user_id) DO NOTHING;

  GET DIAGNOSTICS v_rows_inserted = ROW_COUNT;

  IF v_rows_inserted = 0 THEN
    RETURN jsonb_build_object('booked', false, 'reason', 'already_booked');
  END IF;

  RETURN jsonb_build_object('booked', true);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.calculate_cooper_fitness_level(total_seconds integer)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Fitness levels based on total time for 4 exercises
  IF total_seconds IS NULL THEN
    RETURN 'unknown';
  ELSIF total_seconds <= 600 THEN -- 10 minutes or less
    RETURN 'excellent';
  ELSIF total_seconds <= 900 THEN -- 15 minutes or less
    RETURN 'good';
  ELSIF total_seconds <= 1200 THEN -- 20 minutes or less
    RETURN 'satisfactory';
  ELSE
    RETURN 'poor';
  END IF;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.calculate_cooper_fitness_level_minutes(total_minutes integer)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF total_minutes IS NULL THEN
    RETURN 'unknown';
  ELSIF total_minutes <= 3 THEN -- 3 minutes or less
    RETURN 'excellent';
  ELSIF total_minutes <= 4 THEN -- 4 minutes or less
    RETURN 'good';
  ELSIF total_minutes <= 5 THEN -- 5 minutes or less
    RETURN 'satisfactory';
  ELSE
    RETURN 'poor';
  END IF;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.check_in_activity(p_telegram_id text, p_activity_type text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id       UUID;
  v_stream_id     UUID;
  v_rows_inserted INT;
BEGIN
  SELECT p.user_id, p.current_stream_id
  INTO   v_user_id, v_stream_id
  FROM   profiles p
  WHERE  p.telegram_id = p_telegram_id
  LIMIT  1;

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'checked_in',      false,
      'already_checked', false,
      'date',            NULL,
      'reason',          'not_linked'
    );
  END IF;

  INSERT INTO activity_checkins (user_id, activity_type, stream_id)
  VALUES (v_user_id, p_activity_type, v_stream_id)
  ON CONFLICT (user_id, activity_type, checked_at) DO NOTHING;

  GET DIAGNOSTICS v_rows_inserted = ROW_COUNT;

  RETURN jsonb_build_object(
    'checked_in',      v_rows_inserted > 0,
    'already_checked', v_rows_inserted = 0,
    'date',            CURRENT_DATE
  );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.checkin_ascetic(p_telegram_id text, p_ascetic_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id UUID;
  v_row     RECORD;
  v_streak  INT;
BEGIN
  SELECT p.user_id INTO v_user_id
  FROM   profiles p
  WHERE  p.telegram_id = p_telegram_id
  LIMIT  1;

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_linked');
  END IF;

  -- FOR UPDATE — блокируем строку на время подсчёта стрика (та же защита от
  -- гонки, что и в book_schedule_session)
  SELECT streak, last_checkin_date
  INTO   v_row
  FROM   public.ascetic_activities
  WHERE  id = p_ascetic_id
    AND  user_id = v_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_found');
  END IF;

  IF v_row.last_checkin_date = CURRENT_DATE THEN
    RETURN jsonb_build_object(
      'ok',              true,
      'checked_in',      false,
      'already_checked', true,
      'streak',          v_row.streak
    );
  END IF;

  -- Стрик продолжается только если вчера уже был чекин, иначе стартует заново
  IF v_row.last_checkin_date = CURRENT_DATE - 1 THEN
    v_streak := v_row.streak + 1;
  ELSE
    v_streak := 1;
  END IF;

  UPDATE public.ascetic_activities
  SET streak = v_streak,
      last_checkin_date = CURRENT_DATE
  WHERE id = p_ascetic_id;

  RETURN jsonb_build_object(
    'ok',              true,
    'checked_in',      true,
    'already_checked', false,
    'streak',          v_streak
  );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.cleanup_expired_bot_sessions()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  DELETE FROM public.telegram_bot_sessions
  WHERE expires_at < now();

  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.cleanup_expired_sessions()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE admin_sessions 
  SET is_active = false 
  WHERE expires_at < now() AND is_active = true;
  
  DELETE FROM admin_sessions 
  WHERE expires_at < now() - interval '7 days';
END;
$function$
;

CREATE OR REPLACE FUNCTION public.cleanup_old_audit_logs()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Delete audit logs older than 1 year
  DELETE FROM public.audit_log 
  WHERE timestamp < NOW() - INTERVAL '1 year';
  
  -- Log the cleanup action
  INSERT INTO public.audit_log (action, table_name, user_id)
  VALUES ('AUDIT_LOG_CLEANUP', 'audit_log', NULL);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.confirm_referral_lead(_lead_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_lead public.referral_leads%ROWTYPE;
  v_bonus integer;
  v_enabled boolean;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Only admins can confirm referral leads';
  END IF;

  SELECT * INTO v_lead FROM public.referral_leads WHERE id = _lead_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Lead not found';
  END IF;

  IF v_lead.bonus_awarded THEN
    RAISE EXCEPTION 'Bonus already awarded for this lead';
  END IF;

  SELECT enabled, bonus_amount INTO v_enabled, v_bonus
  FROM public.referral_settings
  ORDER BY updated_at DESC
  LIMIT 1;

  IF NOT COALESCE(v_enabled, false) THEN
    RAISE EXCEPTION 'Referral program is disabled';
  END IF;

  -- Обновляем заявку
  UPDATE public.referral_leads
  SET status = 'confirmed',
      bonus_awarded = true,
      bonus_amount = v_bonus,
      confirmed_at = now(),
      processed_by = auth.uid()
  WHERE id = _lead_id;

  -- Обновляем баланс приглашающего
  UPDATE public.profiles
  SET referral_coins = COALESCE(referral_coins, 0) + v_bonus
  WHERE user_id = v_lead.referrer_user_id;

  -- Журнал транзакций (UNIQUE по source_id защитит от дубля)
  INSERT INTO public.coin_transactions (user_id, amount, reason, source_type, source_id, created_by)
  VALUES (v_lead.referrer_user_id, v_bonus, 'Реферальный бонус за приглашение', 'referral_lead', _lead_id, auth.uid());
END;
$function$
;

CREATE OR REPLACE FUNCTION public.create_reward_request(p_reward_id uuid, p_user_comment text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id UUID := auth.uid();
  v_status participant_status_type;
  v_cost INTEGER;
  v_active BOOLEAN;
  v_stock INTEGER;
  v_balance INTEGER;
  v_request_id UUID;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT participant_status INTO v_status
  FROM public.profiles WHERE user_id = v_user_id;

  -- Магазин доступен участникам интенсива и резидентам клуба
  IF v_status NOT IN ('intensive_active'::participant_status_type,
                      'club_resident'::participant_status_type) THEN
    RAISE EXCEPTION 'Магазин доступен участникам интенсива и резидентам клуба';
  END IF;

  SELECT cost_coins, is_active, stock
    INTO v_cost, v_active, v_stock
  FROM public.rewards WHERE id = p_reward_id FOR UPDATE;

  IF NOT FOUND OR NOT v_active THEN
    RAISE EXCEPTION 'Награда недоступна';
  END IF;

  IF v_stock IS NOT NULL AND v_stock <= 0 THEN
    RAISE EXCEPTION 'Награда закончилась';
  END IF;

  v_balance := public.get_user_coin_balance(v_user_id);
  IF v_balance < v_cost THEN
    RAISE EXCEPTION 'Недостаточно коинов (баланс: %, требуется: %)', v_balance, v_cost;
  END IF;

  INSERT INTO public.reward_requests (user_id, reward_id, cost_coins, user_comment)
  VALUES (v_user_id, p_reward_id, v_cost, p_user_comment)
  RETURNING id INTO v_request_id;

  INSERT INTO public.coin_transactions (user_id, amount, reason, source_type, source_id, created_by)
  VALUES (v_user_id, -v_cost, 'Заказ награды (резерв)', 'reward_request', v_request_id, v_user_id);

  IF v_stock IS NOT NULL THEN
    UPDATE public.rewards SET stock = stock - 1 WHERE id = p_reward_id;
  END IF;

  RETURN v_request_id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.decrypt_phone(encrypted_phone text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF encrypted_phone IS NULL OR length(trim(encrypted_phone)) = 0 THEN
    RETURN encrypted_phone;
  END IF;
  
  -- Decode base64 encryption
  BEGIN
    RETURN convert_from(
      decode(encrypted_phone, 'base64'), 
      'UTF8'
    );
  EXCEPTION WHEN OTHERS THEN
    -- Return original if decryption fails (for backward compatibility)
    RETURN encrypted_phone;
  END;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.encrypt_phone(phone_text text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF phone_text IS NULL OR length(trim(phone_text)) = 0 THEN
    RETURN phone_text;
  END IF;
  
  -- Simple XOR encryption with a fixed key for demo
  -- In production, use proper encryption with Supabase Vault
  RETURN encode(
    convert_to(phone_text, 'UTF8'), 
    'base64'
  );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.enhanced_contact_rate_limit(p_ip_address inet DEFAULT NULL::inet)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  current_ip inet;
  window_len interval := INTERVAL '15 minutes';
  max_per_window integer := 3;
  rec public.contact_rate_limit%ROWTYPE;
BEGIN
  current_ip := COALESCE(p_ip_address, inet_client_addr());

  -- Без определяемого IP не блокируем (иначе теряем реальные заявки)
  IF current_ip IS NULL THEN
    RETURN true;
  END IF;

  DELETE FROM public.contact_rate_limit
  WHERE window_start < NOW() - (window_len * 4);

  SELECT * INTO rec
  FROM public.contact_rate_limit
  WHERE ip_address = current_ip
    AND window_start > NOW() - window_len
  ORDER BY window_start DESC
  LIMIT 1;

  IF rec.id IS NULL THEN
    INSERT INTO public.contact_rate_limit (ip_address, submission_count, window_start)
    VALUES (current_ip, 1, NOW());
    RETURN true;
  END IF;

  IF rec.submission_count >= max_per_window THEN
    PERFORM public.log_security_event('RATE_LIMIT_EXCEEDED', NULL,
      jsonb_build_object(
        'ip', current_ip,
        'count', rec.submission_count,
        'window_minutes', 15,
        'limit', max_per_window
      ));
    RETURN false;
  END IF;

  UPDATE public.contact_rate_limit
  SET submission_count = submission_count + 1
  WHERE id = rec.id;

  RETURN true;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.enhanced_rate_limit_check(p_ip_address inet DEFAULT NULL::inet, p_action text DEFAULT 'contact_form'::text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  submission_count integer;
  current_ip inet;
  rate_limit integer;
  time_window interval;
BEGIN
  current_ip := COALESCE(p_ip_address, inet_client_addr());
  
  -- Set limits based on action type
  CASE p_action
    WHEN 'contact_form' THEN
      rate_limit := 3;
      time_window := INTERVAL '15 minutes';
    WHEN 'login_attempt' THEN
      rate_limit := 5;
      time_window := INTERVAL '5 minutes';
    ELSE
      rate_limit := 10;
      time_window := INTERVAL '10 minutes';
  END CASE;
  
  -- Count recent submissions from this IP
  SELECT COUNT(*) INTO submission_count
  FROM public.contact_submissions
  WHERE created_at > NOW() - time_window;
  
  -- Log if limit exceeded
  IF submission_count >= rate_limit THEN
    PERFORM public.log_security_event('RATE_LIMIT_EXCEEDED', NULL, 
      jsonb_build_object(
        'ip', current_ip, 
        'action', p_action,
        'count', submission_count,
        'limit', rate_limit
      ));
    RETURN false;
  END IF;
  
  RETURN true;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.enroll_application(p_submission_id uuid, p_stream_id uuid, p_user_id uuid DEFAULT NULL::uuid, p_new_status participant_status_type DEFAULT 'intensive_active'::participant_status_type)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_sub        contact_submissions%rowtype;
  v_lead       referral_leads%rowtype;
  v_referrer   uuid;
  v_award      json;
  v_ref_award  boolean := false;
  v_user_id    uuid := p_user_id;
  v_norm_phone text;
  v_link_code  text;
  v_created    boolean := false;
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'forbidden: admin only';
  end if;
  select * into v_sub
    from contact_submissions
   where id = p_submission_id
   for update;
  if not found then
    raise exception 'submission_not_found';
  end if;
  if v_sub.status = 'enrolled' then
    return json_build_object('ok', true, 'duplicate', true,
                             'message', 'Заявка уже зачислена',
                             'user_id', v_sub.enrolled_user_id);
  end if;
  v_norm_phone := public.normalize_phone(v_sub.phone);
  if v_user_id is null and v_norm_phone is not null then
    select user_id into v_user_id
      from profiles
     where public.normalize_phone(phone) = v_norm_phone
       and (telegram_id is null or telegram_id = '')
     order by updated_at desc nulls last
     limit 1;
  end if;
  if v_user_id is null then
    v_user_id := gen_random_uuid();
    insert into profiles (
      user_id, first_name, display_name, phone,
      participant_status, current_stream_id, stream_start_date
    ) values (
      v_user_id,
      coalesce(nullif(trim(v_sub.name), ''), 'Участник'),
      coalesce(nullif(trim(v_sub.name), ''), 'Участник'),
      v_sub.phone,
      p_new_status,
      p_stream_id,
      current_date
    );
    v_created := true;
    begin
      v_link_code := public.generate_telegram_link_code(v_user_id);
    exception when others then
      v_link_code := null;
    end;
  else
    update profiles
       set participant_status = p_new_status,
           current_stream_id  = p_stream_id,
           stream_start_date  = coalesce(stream_start_date, current_date)
     where user_id = v_user_id;
    if not found then
      raise exception 'profile_not_found';
    end if;
  end if;
  update contact_submissions
     set status           = 'enrolled',
         stream_id        = p_stream_id,
         enrolled_user_id = v_user_id,
         processed        = true,
         processed_at     = now(),
         processed_by     = auth.uid()
   where id = p_submission_id;
  if v_sub.referral_code is not null and length(trim(v_sub.referral_code)) > 0 then
    select * into v_lead
      from referral_leads
     where referral_code = v_sub.referral_code
       and reward_issued = false
       and (phone = v_sub.phone or name = v_sub.name)
     order by created_at desc
     limit 1
     for update;
    if not found then
      select user_id into v_referrer
        from profiles
       where referral_code = v_sub.referral_code
       limit 1;
      if v_referrer is not null then
        insert into referral_leads
               (name, phone, referral_code, referrer_user_id, status)
        values (v_sub.name, v_sub.phone, v_sub.referral_code,
                v_referrer, 'confirmed')
        returning * into v_lead;
      end if;
    end if;
    if v_lead.id is not null then
      v_award := award_coins_by_rule(
        p_user_id     => v_lead.referrer_user_id,
        p_rule_code   => 'referral_confirmed',
        p_source_type => 'referral_lead',
        p_source_id   => v_lead.id,
        p_reason      => 'Подтверждённый реферал (зачисление в интенсив)'
      );
      update referral_leads
         set status        = 'rewarded',
             reward_issued = true,
             bonus_awarded = true,
             confirmed_at  = coalesce(confirmed_at, now()),
             processed_by  = auth.uid()::text
       where id = v_lead.id;
      v_ref_award := true;
    end if;
  end if;
  return json_build_object(
    'ok', true,
    'user_id', v_user_id,
    'profile_created', v_created,
    'link_code', v_link_code,
    'referral_awarded', v_ref_award,
    'award', v_award
  );
end;
$function$
;

CREATE OR REPLACE FUNCTION public.ensure_referral_code(_user_id uuid)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_code text;
BEGIN
  IF auth.uid() <> _user_id AND NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  SELECT referral_code INTO v_code FROM public.profiles WHERE user_id = _user_id;

  IF v_code IS NULL OR length(v_code) = 0 THEN
    v_code := public.generate_referral_code();
    UPDATE public.profiles SET referral_code = v_code WHERE user_id = _user_id;
  END IF;

  RETURN v_code;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.generate_display_name()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Auto-generate display_name if not provided
  IF NEW.display_name IS NULL OR NEW.display_name = '' THEN
    NEW.display_name := public.mask_participant_name(NEW.participant_name);
  END IF;
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.generate_referral_code()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  IF NEW.referral_code IS NULL THEN
    NEW.referral_code := upper(substring(md5(random()::text), 1, 8));
  END IF;
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.generate_telegram_link_code(p_user_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_code text;
  v_exists boolean;
  v_attempts int := 0;
  v_max_attempts int := 30;
  v_found boolean := false;
  v_expires_at timestamptz := now() + interval '15 minutes';
BEGIN
  IF auth.uid() <> p_user_id AND NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Недостаточно прав для генерации кода привязки Telegram';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE user_id = p_user_id) THEN
    RAISE EXCEPTION 'Профиль не найден';
  END IF;

  WHILE v_attempts < v_max_attempts LOOP
    v_code := upper(
      substring(
        md5(random()::text || clock_timestamp()::text || p_user_id::text)
        FROM 1 FOR 8
      )
    );

    SELECT EXISTS(
      SELECT 1 FROM public.profiles
      WHERE telegram_link_code = v_code
        AND COALESCE(telegram_link_code_expires_at, now()) > now()
    ) INTO v_exists;

    IF NOT v_exists THEN
      v_found := true;
      EXIT;
    END IF;

    v_attempts := v_attempts + 1;
  END LOOP;

  IF NOT v_found THEN
    RAISE EXCEPTION 'Не удалось сгенерировать уникальный код привязки Telegram, попробуйте ещё раз';
  END IF;

  UPDATE public.profiles
  SET telegram_link_code = v_code,
      telegram_link_code_expires_at = v_expires_at,
      updated_at = now()
  WHERE user_id = p_user_id;

  RETURN jsonb_build_object('code', v_code, 'expires_at', v_expires_at);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_ascetic_for_user(p_telegram_id text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id UUID;
  v_row     RECORD;
BEGIN
  SELECT p.user_id INTO v_user_id
  FROM   profiles p
  WHERE  p.telegram_id = p_telegram_id
  LIMIT  1;

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('found', false, 'error', 'not_linked');
  END IF;

  -- Текущая аскеза — последняя по completed_at запись пользователя
  SELECT a.id, a.notes, a.streak, a.last_checkin_date
  INTO   v_row
  FROM   public.ascetic_activities a
  WHERE  a.user_id = v_user_id
  ORDER BY a.completed_at DESC
  LIMIT  1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('found', true, 'has_ascetic', false);
  END IF;

  RETURN jsonb_build_object(
    'found',           true,
    'has_ascetic',     true,
    'id',              v_row.id,
    'text',            v_row.notes,
    'streak',          v_row.streak,
    'checked_in_today', v_row.last_checkin_date = CURRENT_DATE
  );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_broadcast_audience(filter_json jsonb)
 RETURNS TABLE(total_count bigint, user_ids uuid[])
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_statuses   text[];
  v_stream_ids uuid[];
  v_tag_ids    uuid[];
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied: admin only';
  END IF;

  v_statuses   := array(SELECT jsonb_array_elements_text(COALESCE(filter_json->'statuses',   '[]'::jsonb)));
  v_stream_ids := array(SELECT jsonb_array_elements_text(COALESCE(filter_json->'stream_ids', '[]'::jsonb)));
  v_tag_ids    := array(SELECT jsonb_array_elements_text(COALESCE(filter_json->'tag_ids',    '[]'::jsonb)));

  RETURN QUERY
  WITH filtered_profiles AS (
    SELECT DISTINCT p.user_id
    FROM profiles p
    LEFT JOIN profile_tags pt ON pt.profile_user_id = p.user_id
    WHERE p.telegram_id IS NOT NULL
      AND p.approved = true
      AND (array_length(v_statuses, 1) IS NULL
           OR p.participant_status::text = ANY(v_statuses))
      AND (array_length(v_stream_ids, 1) IS NULL
           OR p.current_stream_id = ANY(v_stream_ids::uuid[]))
      AND (array_length(v_tag_ids, 1) IS NULL
           OR pt.tag_id = ANY(v_tag_ids::uuid[]))
  )
  SELECT COUNT(*)::bigint, array_agg(user_id)
  FROM filtered_profiles;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_homework_for_user(p_telegram_id text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id   UUID;
  v_stream_id UUID;
  v_homework  JSONB;
BEGIN
  SELECT p.user_id, p.current_stream_id
  INTO   v_user_id, v_stream_id
  FROM   profiles p
  WHERE  p.telegram_id = p_telegram_id
  LIMIT  1;

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('found', false, 'error', 'not_linked');
  END IF;

  SELECT jsonb_agg(
    jsonb_build_object(
      'id', a.id,
      'title', a.title,
      'theme', a.theme,
      'content', a.content,
      'deadline', a.deadline,
      'points_reward', a.points_reward,
      'file_url', a.file_url,
      'status', s.status,
      'submission_content', s.content,
      'admin_comment', s.admin_comment
    )
    ORDER BY a.created_at DESC
  )
  INTO v_homework
  FROM   public.homework_assignments a
  LEFT JOIN LATERAL (
    SELECT hs.status, hs.content, hs.admin_comment
    FROM   public.homework_submissions hs
    WHERE  hs.assignment_id = a.id
      AND  hs.user_id = v_user_id
    ORDER BY hs.created_at DESC
    LIMIT  1
  ) s ON true
  WHERE  a.is_active = true
    AND  (
      a.target_user_id = v_user_id
      OR (v_stream_id IS NOT NULL AND a.stream_id = v_stream_id)
    );

  RETURN jsonb_build_object('found', true, 'homework', COALESCE(v_homework, '[]'::jsonb));
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_journal_for_user(p_telegram_id text, p_date date DEFAULT CURRENT_DATE)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id  UUID;
  v_day_type TEXT;
  v_prompts  JSONB;
  v_entry_id UUID;
  v_entry    JSONB;
BEGIN
  SELECT p.user_id INTO v_user_id
  FROM   profiles p
  WHERE  p.telegram_id = p_telegram_id
  LIMIT  1;

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('found', false, 'error', 'not_linked');
  END IF;

  -- EXTRACT(DOW): 0=вс, 1=пн, 2=вт, 3=ср, 4=чт, 5=пт, 6=сб
  v_day_type := CASE EXTRACT(DOW FROM p_date)
                  WHEN 1 THEN 'monday'
                  WHEN 3 THEN 'wednesday'
                  WHEN 5 THEN 'friday'
                  WHEN 6 THEN 'saturday'
                  WHEN 0 THEN 'sunday'
                  ELSE 'monday'
                END;

  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id',            jp.id,
      'question_text', jp.question_text,
      'sort_order',    jp.sort_order
    )
    ORDER BY jp.sort_order
  ), '[]'::jsonb)
  INTO v_prompts
  FROM   public.journal_prompts jp
  WHERE  jp.day_type = v_day_type
    AND  jp.is_active = true;

  SELECT je.id INTO v_entry_id
  FROM   public.journal_entries je
  WHERE  je.user_id = v_user_id
    AND  je.entry_date = p_date
  LIMIT  1;

  IF v_entry_id IS NOT NULL THEN
    SELECT jsonb_build_object(
      'id',         je.id,
      'entry_date', je.entry_date,
      'day_type',   je.day_type,
      'emotions', (
        SELECT COALESCE(jsonb_agg(
          jsonb_build_object('emotion_name', em.emotion_name, 'intensity', em.intensity)
        ), '[]'::jsonb)
        FROM public.journal_emotions em
        WHERE em.entry_id = je.id
      ),
      'answers', (
        SELECT COALESCE(jsonb_agg(
          jsonb_build_object('prompt_id', a.prompt_id, 'answer_text', a.answer_text)
        ), '[]'::jsonb)
        FROM public.journal_answers a
        WHERE a.entry_id = je.id
      )
    )
    INTO v_entry
    FROM   public.journal_entries je
    WHERE  je.id = v_entry_id;
  END IF;

  RETURN jsonb_build_object(
    'found',    true,
    'date',     p_date,
    'day_type', v_day_type,
    'prompts',  v_prompts,
    'entry',    v_entry
  );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_participant_full_state(p_user_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_profile       public.profiles%ROWTYPE;
  v_result        JSONB;
  v_current_totem JSONB;
BEGIN
  IF NOT (
    auth.uid() = p_user_id
    OR public.is_admin(auth.uid())
    OR auth.role() = 'service_role'
    OR current_setting('role', true) = 'service_role'
  ) THEN
    RAISE EXCEPTION 'Нет доступа к данным участника';
  END IF;

  SELECT * INTO v_profile FROM public.profiles WHERE user_id = p_user_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'profile_not_found', 'user_id', p_user_id);
  END IF;

  -- Текущий тотем — только из актуальных user_totems + totems
  SELECT jsonb_build_object(
    'totem_id', t.id,
    'name', t.name,
    'totem_type', t.totem_type,
    'icon_name', t.icon_name,
    'icon_color', t.icon_color,
    'assigned_at', ut.assigned_at
  )
  INTO v_current_totem
  FROM public.user_totems ut
  JOIN public.totems t ON t.id = ut.totem_id
  WHERE ut.user_id = p_user_id
  ORDER BY ut.assigned_at DESC
  LIMIT 1;

  v_result := jsonb_build_object(
    'profile', jsonb_build_object(
      'user_id', v_profile.user_id,
      'display_name', v_profile.display_name,
      'first_name', v_profile.first_name,
      'last_name', v_profile.last_name,
      'avatar_url', v_profile.avatar_url,
      'telegram', v_profile.telegram,
      'total_points', COALESCE(v_profile.total_points, 0),
      'rank_position', COALESCE(v_profile.rank_position, 0),
      'referral_code', v_profile.referral_code
    ),
    'status', v_profile.participant_status,
    'approved', COALESCE(v_profile.approved, false),
    'stream', (
      SELECT jsonb_build_object('id', s.id, 'name', s.name, 'start_date', s.start_date, 'end_date', s.end_date)
      FROM public.intensive_streams s WHERE s.id = v_profile.current_stream_id
    ),
    'coins_balance', public.get_user_coin_balance(p_user_id),
    'total_points', COALESCE(v_profile.total_points, 0),
    'current_totem', v_current_totem,
    'totems_count', (SELECT COUNT(*) FROM public.user_totems WHERE user_id = p_user_id),
    'upcoming_homework', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('id', ha.id, 'title', ha.title, 'theme', ha.theme, 'deadline', ha.deadline, 'points_reward', ha.points_reward))
      FROM public.homework_assignments ha
      WHERE ha.is_active = true
        AND (ha.stream_id = v_profile.current_stream_id OR ha.target_user_id = p_user_id OR (ha.stream_id IS NULL AND ha.target_user_id IS NULL))
        AND (ha.deadline IS NULL OR ha.deadline >= now())
    ), '[]'::jsonb),
    'referrals_count', (SELECT COUNT(*) FROM public.referral_leads WHERE referrer_user_id = p_user_id),
    'referrals_confirmed', (SELECT COUNT(*) FROM public.referral_leads WHERE referrer_user_id = p_user_id AND status = 'confirmed'),
    'reward_requests', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('id', rr.id, 'reward_id', rr.reward_id, 'cost_coins', rr.cost_coins, 'status', rr.status, 'created_at', rr.created_at))
      FROM public.reward_requests rr WHERE rr.user_id = p_user_id
    ), '[]'::jsonb),
    'available_materials', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('id', m.id, 'title', m.title, 'block_type', m.block_type, 'theme', m.theme))
      FROM public.materials m
      WHERE m.is_active = true
        AND (m.open_date IS NULL OR m.open_date <= now())
        AND (m.stream_id IS NULL OR m.stream_id = v_profile.current_stream_id)
        AND (
          m.available_to = 'all'
          OR (m.available_to = 'intensive' AND v_profile.participant_status = 'intensive_active'::participant_status_type)
          OR (m.available_to = 'club'      AND v_profile.participant_status = 'club_resident'::participant_status_type)
        )
    ), '[]'::jsonb)
  );

  RETURN v_result;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_participant_full_state_by_telegram(p_telegram_id text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id uuid;
  v_is_service boolean;
BEGIN
  v_is_service := (current_setting('role', true) = 'service_role')
                  OR (auth.role() = 'service_role');

  IF NOT v_is_service THEN
    RAISE EXCEPTION 'get_participant_full_state_by_telegram доступна только серверу (service_role)';
  END IF;

  SELECT user_id INTO v_user_id
  FROM public.profiles
  WHERE telegram_id = p_telegram_id
  LIMIT 1;

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('linked', false, 'reason', 'telegram_not_linked');
  END IF;

  RETURN jsonb_build_object(
    'linked', true,
    'state', public.get_participant_full_state(v_user_id)
  );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_participant_timeline(_user_id uuid)
 RETURNS TABLE(event_type text, event_time timestamp with time zone, actor_id uuid, payload jsonb)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _rows int;
  _current_status text;
  _updated_at timestamptz;
BEGIN
  IF NOT (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin') OR public.is_super_admin(auth.uid())) THEN
    RAISE EXCEPTION 'Access denied: admin only';
  END IF;

  RETURN QUERY
  SELECT * FROM (
    SELECT
      'status_change'::text AS event_type,
      h.changed_at AS event_time,
      h.changed_by AS actor_id,
      jsonb_build_object(
        'old_status', h.old_status,
        'new_status', h.new_status,
        'stream_id',  h.stream_id
      ) AS payload
    FROM participant_status_history h
    WHERE h.profile_user_id = _user_id

    UNION ALL
    SELECT 'note'::text, n.created_at, n.author_id,
      jsonb_build_object('note', n.note)
    FROM participant_notes n
    WHERE n.profile_user_id = _user_id

    UNION ALL
    SELECT 'audit'::text, a.timestamp, a.user_id,
      jsonb_build_object('action', a.action, 'table_name', a.table_name, 'record_id', a.record_id)
    FROM audit_log a
    WHERE a.record_id = _user_id

    UNION ALL
    SELECT 'application'::text, cs.created_at, cs.processed_by,
      jsonb_build_object(
        'phone', cs.phone, 'name', cs.name, 'course', cs.course, 'social', cs.social,
        'referral_code', COALESCE(cs.referral_code, cs.ref_code),
        'status', cs.status, 'stream_id', cs.stream_id, 'submission_id', cs.id
      )
    FROM contact_submissions cs
    WHERE cs.enrolled_user_id = _user_id
  ) t
  ORDER BY t.event_time DESC;

  GET DIAGNOSTICS _rows = ROW_COUNT;

  IF _rows = 0 THEN
    SELECT p.participant_status::text, p.updated_at
      INTO _current_status, _updated_at
    FROM profiles p
    WHERE p.user_id = _user_id
    LIMIT 1;

    IF _current_status IS NOT NULL THEN
      RETURN QUERY SELECT
        'current_status'::text,
        COALESCE(_updated_at, now()),
        NULL::uuid,
        jsonb_build_object('status', _current_status);
    END IF;
  END IF;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_profile_for_user(p_telegram_id text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id UUID;
  v_profile JSONB;
  v_cooper  JSONB;
  v_totems  JSONB;
BEGIN
  SELECT p.user_id INTO v_user_id
  FROM   profiles p
  WHERE  p.telegram_id = p_telegram_id
  LIMIT  1;

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('found', false, 'error', 'not_linked');
  END IF;

  SELECT jsonb_build_object(
    'first_name',    p.first_name,
    'last_name',     p.last_name,
    'avatar_url',    p.avatar_url,
    'weight_kg',     p.weight_kg,
    'height_cm',     p.height_cm,
    'date_of_birth', p.date_of_birth
  )
  INTO v_profile
  FROM   profiles p
  WHERE  p.user_id = v_user_id;

  -- Последний тест Купера (текущая схема — время прохождения, не дистанция)
  SELECT jsonb_build_object(
    'test_date',     c.test_date,
    'total_minutes', c.total_minutes,
    'total_seconds', c.total_seconds,
    'fitness_level', c.fitness_level
  )
  INTO v_cooper
  FROM   cooper_test_results c
  WHERE  c.user_id = v_user_id
  ORDER BY c.test_date DESC
  LIMIT  1;

  -- Тотемы участника
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id',          t.id,
      'name',        t.name,
      'discipline',  t.discipline,
      'icon_name',   t.icon_name,
      'icon_color',  t.icon_color,
      'assigned_at', ut.assigned_at
    )
    ORDER BY ut.assigned_at DESC
  ), '[]'::jsonb)
  INTO v_totems
  FROM   user_totems ut
  JOIN   totems t ON t.id = ut.totem_id
  WHERE  ut.user_id = v_user_id;

  RETURN jsonb_build_object(
    'found',       true,
    'profile',     v_profile,
    'cooper_test', v_cooper,
    'totems',      v_totems
  );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_pyramid_for_user(p_telegram_id text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id UUID;
  v_levels  JSONB;
BEGIN
  SELECT p.user_id INTO v_user_id
  FROM   profiles p
  WHERE  p.telegram_id = p_telegram_id
  LIMIT  1;

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('found', false, 'error', 'not_linked');
  END IF;

  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id',               l.id,
      'level_number',     l.level_number,
      'title',            l.title,
      'description',      l.description,
      'presentation_url', l.presentation_url,
      'is_unlocked',      l.is_unlocked
    )
    ORDER BY l.level_number ASC
  ), '[]'::jsonb)
  INTO v_levels
  FROM   public.pyramid_levels l;

  RETURN jsonb_build_object('found', true, 'levels', v_levels);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_rating_for_user(p_telegram_id text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id   UUID;
  v_stream_id UUID;
  v_my        JSONB;
  v_board     JSONB;
BEGIN
  SELECT p.user_id, p.current_stream_id
  INTO   v_user_id, v_stream_id
  FROM   profiles p
  WHERE  p.telegram_id = p_telegram_id
  LIMIT  1;

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('found', false, 'error', 'not_linked');
  END IF;

  -- Моя статистика: очки/разбивка из leaderboard, позиция из profiles
  SELECT jsonb_build_object(
    'rank_position', p.rank_position,
    'total_points',  COALESCE(l.total_points, p.total_points, 0),
    'breakdown', jsonb_build_object(
      'bjj',          COALESCE(l.bjj_points, 0),
      'kickboxing',   COALESCE(l.kickboxing_points, 0),
      'ofp',          COALESCE(l.ofp_points, 0),
      'theory',       COALESCE(l.theory_points, 0),
      'tactical',     COALESCE(l.tactical_points, 0),
      'nutrition',    COALESCE(l.nutrition_points, 0),
      'kamp_pyramid', COALESCE(l.kamp_pyramid_points, 0),
      'challenges',   COALESCE(l.challenges_points, 0)
    ),
    'attendance', (
      SELECT jsonb_build_object(
        'total',   COALESCE(SUM(t.cnt), 0),
        'by_type', COALESCE(jsonb_agg(
                     jsonb_build_object('activity_type', t.activity_type, 'count', t.cnt)
                     ORDER BY t.activity_type
                   ), '[]'::jsonb)
      )
      FROM (
        SELECT activity_type, COUNT(*) AS cnt
        FROM   public.activity_checkins
        WHERE  user_id = v_user_id
        GROUP BY activity_type
      ) t
    )
  )
  INTO v_my
  FROM   profiles p
  LEFT JOIN leaderboard l ON l.user_id = p.user_id
  WHERE  p.user_id = v_user_id;

  -- Топ-10 потока
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'user_id',       x.user_id,
      'display_name',  x.display_name,
      'first_name',    x.first_name,
      'last_name',     x.last_name,
      'avatar_url',    x.avatar_url,
      'rank_position', x.rank_position,
      'total_points',  x.total_points,
      'is_me',         x.user_id = v_user_id
    )
    ORDER BY x.rank_position ASC
  ), '[]'::jsonb)
  INTO v_board
  FROM (
    SELECT p2.user_id, p2.display_name, p2.first_name, p2.last_name, p2.avatar_url,
           p2.rank_position, COALESCE(l2.total_points, p2.total_points, 0) AS total_points
    FROM   profiles p2
    LEFT JOIN leaderboard l2 ON l2.user_id = p2.user_id
    WHERE  p2.current_stream_id = v_stream_id
      AND  p2.approved = true
      AND  COALESCE(p2.leaderboard_visible, true) = true
      AND  COALESCE(p2.profile_private, false) = false
      AND  p2.rank_position IS NOT NULL
      AND  p2.user_id NOT IN (
             SELECT ur.user_id FROM user_roles ur WHERE ur.role IN ('admin', 'super_admin')
           )
    ORDER BY p2.rank_position ASC
    LIMIT 10
  ) x;

  RETURN jsonb_build_object(
    'found',       true,
    'stream_id',   v_stream_id,
    'my',          v_my,
    'leaderboard', v_board
  );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_schedule_for_user(p_telegram_id text, p_from timestamp with time zone DEFAULT now(), p_days integer DEFAULT 7)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id   UUID;
  v_stream_id UUID;
  v_status    TEXT;
BEGIN
  SELECT p.user_id,
         p.current_stream_id,
         p.participant_status::TEXT
  INTO   v_user_id, v_stream_id, v_status
  FROM   profiles p
  WHERE  p.telegram_id = p_telegram_id
  LIMIT  1;

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('found', false, 'error', 'not_linked');
  END IF;

  RETURN jsonb_build_object(
    'found',     true,
    'stream_id', v_stream_id,
    'status',    v_status,
    'schedule',  (
      SELECT COALESCE(
        jsonb_agg(
          jsonb_build_object(
            'id',               s.id,
            'title',            s.title,
            'activity_type',    s.activity_type,
            'description',      s.description,
            'start_time',       s.start_time,
            'end_time',         s.end_time,
            'location',         s.location,
            'color',            s.color,
            'max_participants', s.max_participants,
            'booked_count',     (
              SELECT COUNT(*)
              FROM   schedule_participants sp2
              WHERE  sp2.schedule_id = s.id
            ),
            'instructor', CASE
              WHEN t.id IS NULL THEN NULL
              ELSE jsonb_build_object('id', t.id, 'name', t.name, 'role', t.role)
            END,
            'booked', EXISTS (
              SELECT 1
              FROM   schedule_participants sp
              WHERE  sp.schedule_id = s.id
                AND  sp.user_id     = v_user_id
            ),
            'attended', (
              SELECT sp.attended
              FROM   schedule_participants sp
              WHERE  sp.schedule_id = s.id
                AND  sp.user_id     = v_user_id
              LIMIT  1
            )
          )
          ORDER BY s.start_time
        ),
        '[]'::jsonb
      )
      FROM   schedules s
      LEFT JOIN trainers t ON t.id = s.instructor_id
      WHERE  s.is_active = true
        AND  s.start_time >= p_from
        AND  s.start_time <  p_from + (p_days || ' days')::INTERVAL
        AND  (
          (     v_status IN ('intensive_active', 'intensive_completed')
            AND s.schedule_type = 'intensive'
            AND (s.stream_id = v_stream_id OR s.stream_id IS NULL)
          )
          OR
          (     v_status IN ('club_resident', 'alumni')
            AND s.schedule_type = 'club'
          )
        )
    )
  );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_user_coin_balance(p_user_id uuid)
 RETURNS integer
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT COALESCE(SUM(amount), 0)::INTEGER
  FROM public.coin_transactions
  WHERE user_id = p_user_id;
$function$
;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (user_id, first_name, last_name, display_name, email)
  VALUES (
    NEW.id, 
    NEW.raw_user_meta_data->>'first_name',
    NEW.raw_user_meta_data->>'last_name',
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email),
    NEW.email
  );
  
  -- Initialize leaderboard entry
  INSERT INTO public.leaderboard (user_id)
  VALUES (NEW.id);
  
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.handle_new_user_participant()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public."участники" (user_id, name, last_name, points)
  VALUES (
    NEW.id, 
    COALESCE(NEW.raw_user_meta_data->>'name', 'Новый участник'),
    COALESCE(NEW.raw_user_meta_data->>'lastName', ''),
    0
  );
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role user_role)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  );
$function$
;

CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('admin', 'super_admin')
  );
$function$
;

CREATE OR REPLACE FUNCTION public.is_club_resident(_user_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE user_id = _user_id
      AND participant_status = 'club_resident'
      AND approved = true
  );
$function$
;

CREATE OR REPLACE FUNCTION public.is_public_participant(_user_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE user_id = _user_id
      AND approved = true
      AND leaderboard_visible = true
      AND profile_private = false
  );
$function$
;

CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = 'super_admin'
  );
$function$
;

CREATE OR REPLACE FUNCTION public.link_or_create_telegram_profile(p_telegram_id text, p_telegram_username text DEFAULT NULL::text, p_telegram_first_name text DEFAULT NULL::text, p_telegram_last_name text DEFAULT NULL::text, p_phone text DEFAULT NULL::text, p_referral_code text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_is_service boolean;
  v_norm_phone text;
  v_user_id uuid;
  v_lead_id uuid;
BEGIN
  v_is_service := (current_setting('role', true) = 'service_role')
                  OR (auth.role() = 'service_role');

  IF NOT v_is_service THEN
    RAISE EXCEPTION 'link_or_create_telegram_profile доступна только серверу (service_role)';
  END IF;

  IF p_telegram_id IS NULL OR length(trim(p_telegram_id)) = 0 THEN
    RAISE EXCEPTION 'telegram_id обязателен';
  END IF;

  -- 1) Telegram уже привязан
  SELECT user_id INTO v_user_id
  FROM public.profiles
  WHERE telegram_id = p_telegram_id
  LIMIT 1;

  IF v_user_id IS NOT NULL THEN
    RETURN jsonb_build_object(
      'status', 'linked',
      'linked', true,
      'state', public.get_participant_full_state(v_user_id)
    );
  END IF;

  v_norm_phone := public.normalize_phone(p_phone);

  -- 2) Поиск профиля по телефону
  IF v_norm_phone IS NOT NULL THEN
    SELECT user_id INTO v_user_id
    FROM public.profiles
    WHERE public.normalize_phone(phone) = v_norm_phone
      AND (telegram_id IS NULL OR telegram_id = '')
    ORDER BY updated_at DESC NULLS LAST
    LIMIT 1;
  END IF;

  IF v_user_id IS NOT NULL THEN
    UPDATE public.profiles
    SET telegram_id = p_telegram_id,
        telegram_username = COALESCE(p_telegram_username, telegram_username),
        telegram_first_name = COALESCE(p_telegram_first_name, telegram_first_name),
        telegram_last_name = COALESCE(p_telegram_last_name, telegram_last_name),
        telegram_linked_at = now(),
        updated_at = now()
    WHERE user_id = v_user_id;

    RETURN jsonb_build_object(
      'status', 'linked',
      'linked', true,
      'state', public.get_participant_full_state(v_user_id)
    );
  END IF;

  -- 3) Профиль не найден — заявка
  SELECT id INTO v_lead_id
  FROM public.telegram_leads
  WHERE telegram_id = p_telegram_id
    AND status IN ('new', 'waiting_admin_approval')
  LIMIT 1;

  IF v_lead_id IS NOT NULL THEN
    UPDATE public.telegram_leads
    SET telegram_username = COALESCE(p_telegram_username, telegram_username),
        telegram_first_name = COALESCE(p_telegram_first_name, telegram_first_name),
        telegram_last_name = COALESCE(p_telegram_last_name, telegram_last_name),
        phone = COALESCE(p_phone, phone),
        normalized_phone = COALESCE(v_norm_phone, normalized_phone),
        referral_code = COALESCE(p_referral_code, referral_code),
        updated_at = now()
    WHERE id = v_lead_id;
  ELSE
    INSERT INTO public.telegram_leads (
      telegram_id,
      telegram_username,
      telegram_first_name,
      telegram_last_name,
      phone,
      normalized_phone,
      referral_code,
      status
    ) VALUES (
      p_telegram_id,
      p_telegram_username,
      p_telegram_first_name,
      p_telegram_last_name,
      p_phone,
      v_norm_phone,
      p_referral_code,
      'waiting_admin_approval'
    )
    RETURNING id INTO v_lead_id;
  END IF;

  RETURN jsonb_build_object(
    'status', 'application_created',
    'linked', false,
    'reason', 'waiting_admin_approval',
    'lead_id', v_lead_id
  );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.link_telegram_lead_to_profile(p_lead_id uuid, p_profile_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_lead            public.telegram_leads%ROWTYPE;
  v_referrer_id     uuid;
  v_award           jsonb := NULL;
  v_now             timestamptz := now();
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Only admins can link telegram leads';
  END IF;

  SELECT * INTO v_lead
  FROM public.telegram_leads
  WHERE id = p_lead_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Telegram lead not found: %', p_lead_id;
  END IF;

  IF v_lead.status = 'linked' THEN
    RAISE EXCEPTION 'Telegram lead is already linked';
  END IF;

  UPDATE public.profiles
  SET
    telegram_id         = v_lead.telegram_id,
    telegram_username   = v_lead.telegram_username,
    telegram_first_name = v_lead.telegram_first_name,
    telegram_last_name  = v_lead.telegram_last_name,
    telegram_linked_at  = v_now,
    updated_at          = v_now
  WHERE user_id = p_profile_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profile not found: %', p_profile_id;
  END IF;

  UPDATE public.telegram_leads
  SET
    status       = 'linked',
    processed_by = auth.uid(),
    processed_at = v_now,
    updated_at   = v_now
  WHERE id = p_lead_id;

  IF v_lead.referral_code IS NOT NULL THEN
    SELECT user_id INTO v_referrer_id
    FROM public.profiles
    WHERE referral_code = v_lead.referral_code
    LIMIT 1;

    IF v_referrer_id IS NOT NULL THEN
      v_award := public.award_coins_by_rule(
        p_user_id     => v_referrer_id,
        p_rule_code   => 'referral_telegram_signup',
        p_source_type => 'telegram_lead',
        p_source_id   => p_lead_id,
        p_reason      => 'Реферал через Telegram-бот'
      );
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'linked',          true,
    'lead_id',         p_lead_id,
    'profile_id',      p_profile_id,
    'referral_code',   v_lead.referral_code,
    'referrer_id',     v_referrer_id,
    'referral_award',  v_award
  );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.link_telegram_profile(p_link_code text, p_telegram_id text, p_telegram_username text DEFAULT NULL::text, p_telegram_first_name text DEFAULT NULL::text, p_telegram_last_name text DEFAULT NULL::text, p_telegram_photo_url text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_profile public.profiles%ROWTYPE;
  v_is_service boolean;
BEGIN
  v_is_service := (current_setting('role', true) = 'service_role')
                  OR (auth.role() = 'service_role');

  IF NOT v_is_service THEN
    RAISE EXCEPTION 'link_telegram_profile доступна только серверу (service_role)';
  END IF;

  IF p_link_code IS NULL OR length(trim(p_link_code)) = 0 THEN
    RAISE EXCEPTION 'Не указан код привязки';
  END IF;

  IF p_telegram_id IS NULL OR length(trim(p_telegram_id)) = 0 THEN
    RAISE EXCEPTION 'Не указан telegram_id';
  END IF;

  SELECT * INTO v_profile
  FROM public.profiles
  WHERE telegram_link_code = upper(trim(p_link_code))
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('linked', false, 'reason', 'invalid_code');
  END IF;

  IF v_profile.telegram_link_code_expires_at IS NULL
     OR v_profile.telegram_link_code_expires_at < now() THEN
    RETURN jsonb_build_object('linked', false, 'reason', 'code_expired');
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.profiles
    WHERE telegram_id = p_telegram_id
      AND user_id <> v_profile.user_id
  ) THEN
    RETURN jsonb_build_object('linked', false, 'reason', 'telegram_already_linked');
  END IF;

  UPDATE public.profiles
  SET telegram_id = p_telegram_id,
      telegram_username = p_telegram_username,
      telegram_first_name = p_telegram_first_name,
      telegram_last_name = p_telegram_last_name,
      telegram_photo_url = p_telegram_photo_url,
      telegram_linked_at = now(),
      telegram_link_code = NULL,
      telegram_link_code_expires_at = NULL,
      updated_at = now()
  WHERE user_id = v_profile.user_id;

  RETURN jsonb_build_object(
    'linked', true,
    'user_id', v_profile.user_id,
    'profile', jsonb_build_object(
      'display_name', v_profile.display_name,
      'first_name', v_profile.first_name,
      'last_name', v_profile.last_name,
      'participant_status', v_profile.participant_status
    )
  );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.log_contact_form_access()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Log when contact form data is accessed by admins
  IF TG_OP = 'SELECT' AND auth.uid() IS NOT NULL THEN
    INSERT INTO public.audit_log (
      user_id, 
      action, 
      table_name, 
      record_id, 
      timestamp
    ) VALUES (
      auth.uid(), 
      'CONTACT_FORM_ACCESS', 
      'contact_submissions', 
      NEW.id, 
      NOW()
    );
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.log_participant_status_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.participant_status IS DISTINCT FROM OLD.participant_status THEN
    INSERT INTO public.participant_status_history
      (profile_user_id, old_status, new_status, stream_id, changed_by)
    VALUES
      (NEW.user_id, OLD.participant_status, NEW.participant_status,
       NEW.current_stream_id, auth.uid());
  END IF;
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.log_role_changes()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.role_audit_log (user_id, role_assigned, assigned_by, action, notes)
    VALUES (NEW.user_id, NEW.role, NEW.assigned_by, 'GRANTED', 'Role granted via trigger');
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.role_audit_log (user_id, role_assigned, assigned_by, action, notes)
    VALUES (OLD.user_id, OLD.role, auth.uid(), 'REVOKED', 'Role revoked via trigger');
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.log_security_access(p_action text, p_table_name text DEFAULT NULL::text, p_record_id uuid DEFAULT NULL::uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO audit_log (
    user_id, 
    action, 
    table_name,
    record_id,
    ip_address
  ) VALUES (
    auth.uid(), 
    p_action, 
    p_table_name,
    p_record_id,
    inet_client_addr()
  );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.log_security_event(event_type text, user_id_param uuid DEFAULT NULL::uuid, details jsonb DEFAULT NULL::jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Validate event type before logging
  IF NOT (event_type = ANY(ARRAY[
    'LOGIN', 'LOGOUT', 'CONTACT_FORM_ACCESS', 'RATE_LIMIT_EXCEEDED',
    'ROLE_CHANGE', 'DATA_EXPORT', 'ADMIN_ACTION', 'SECURITY_EVENT',
    'DATA_CLEANUP', 'SESSION_EXPIRED', 'PARTICIPANT_STATUS_CHANGE'
  ])) THEN
    RAISE EXCEPTION 'Invalid security event type: %', event_type;
  END IF;

  INSERT INTO public.audit_log (
    user_id, 
    action, 
    table_name, 
    record_id, 
    ip_address, 
    user_agent
  ) VALUES (
    COALESCE(user_id_param, auth.uid()),
    event_type,
    'security_events',
    NULL,
    inet_client_addr(),
    NULL
  );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.mask_email_secure(email_address text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  at_pos integer;
  local_part text;
  domain_part text;
BEGIN
  IF email_address IS NULL OR email_address !~ '^[^@]+@[^@]+\.[^@]+$' THEN
    RETURN email_address;
  END IF;
  
  at_pos := POSITION('@' IN email_address);
  local_part := LEFT(email_address, at_pos - 1);
  domain_part := SUBSTRING(email_address FROM at_pos);
  
  -- Mask local part: show first 2 chars, mask middle, show last char before @
  IF LENGTH(local_part) <= 3 THEN
    RETURN LEFT(local_part, 1) || '***' || domain_part;
  ELSE
    RETURN LEFT(local_part, 2) || 
           REPEAT('*', GREATEST(1, LENGTH(local_part) - 3)) || 
           RIGHT(local_part, 1) || domain_part;
  END IF;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.mask_participant_name(full_name text)
 RETURNS text
 LANGUAGE plpgsql
 IMMUTABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  name_parts text[];
  first_name text;
  last_initial text;
BEGIN
  IF full_name IS NULL OR LENGTH(TRIM(full_name)) = 0 THEN
    RETURN 'Участник';
  END IF;
  
  -- Split name by spaces
  name_parts := string_to_array(TRIM(full_name), ' ');
  
  -- Get first name
  first_name := name_parts[1];
  
  -- Get last name initial if exists
  IF array_length(name_parts, 1) > 1 THEN
    last_initial := LEFT(name_parts[2], 1) || '.';
    RETURN first_name || ' ' || last_initial;
  ELSE
    RETURN first_name;
  END IF;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.mask_phone_number(phone_number text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF phone_number IS NULL OR LENGTH(phone_number) < 6 THEN
    RETURN phone_number;
  END IF;
  
  -- Mask middle digits, keep first 2 and last 2
  RETURN SUBSTRING(phone_number FROM 1 FOR 2) || 
         REPEAT('*', GREATEST(0, LENGTH(phone_number) - 4)) || 
         RIGHT(phone_number, 2);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.mask_phone_secure(phone_number text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF phone_number IS NULL OR LENGTH(phone_number) < 6 THEN
    RETURN phone_number;
  END IF;
  
  -- Enhanced masking: show country code and last 2 digits only
  IF phone_number LIKE '+%' THEN
    -- For international numbers like +1234567890 -> +12*****90
    RETURN SUBSTRING(phone_number FROM 1 FOR 3) || 
           REPEAT('*', GREATEST(0, LENGTH(phone_number) - 5)) || 
           RIGHT(phone_number, 2);
  ELSE
    -- For local numbers, mask middle section
    RETURN LEFT(phone_number, 2) || 
           REPEAT('*', GREATEST(0, LENGTH(phone_number) - 4)) || 
           RIGHT(phone_number, 2);
  END IF;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.normalize_phone(p_phone text)
 RETURNS text
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO 'public'
AS $function$
DECLARE
  v_digits text;
BEGIN
  IF p_phone IS NULL THEN
    RETURN NULL;
  END IF;

  v_digits := regexp_replace(p_phone, '\D', '', 'g');

  IF v_digits IS NULL OR length(v_digits) = 0 THEN
    RETURN NULL;
  END IF;

  IF length(v_digits) = 11 AND left(v_digits, 1) IN ('7', '8') THEN
    RETURN right(v_digits, 10);
  END IF;

  IF length(v_digits) = 10 THEN
    RETURN v_digits;
  END IF;

  RETURN v_digits;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.recalculate_all_ranks()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Сбрасываем все ранги в 0
  UPDATE leaderboard SET rank_position = 0 WHERE TRUE;
  
  -- Пересчитываем ранги отдельно для каждого потока
  WITH visible_admins AS (
    SELECT user_id FROM user_roles 
    WHERE role IN ('admin', 'super_admin')
  ),
  ranked_users AS (
    SELECT 
      l.user_id,
      ROW_NUMBER() OVER (
        PARTITION BY p.current_stream_id 
        ORDER BY l.total_points DESC, l.last_updated ASC
      ) as new_rank
    FROM leaderboard l
    INNER JOIN profiles p ON p.user_id = l.user_id
    WHERE l.total_points > 0
      AND p.approved = true
      AND COALESCE(p.leaderboard_visible, true) = true
      AND COALESCE(p.profile_private, false) = false
      AND l.user_id NOT IN (SELECT user_id FROM visible_admins)
  )
  UPDATE leaderboard 
  SET rank_position = ranked_users.new_rank
  FROM ranked_users
  WHERE leaderboard.user_id = ranked_users.user_id;
  
  -- Обновляем rank_position в таблице profiles
  UPDATE profiles p
  SET rank_position = COALESCE((SELECT rank_position FROM leaderboard WHERE user_id = p.user_id), 0)
  WHERE TRUE;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.review_homework_submission(p_submission_id uuid, p_status text, p_admin_comment text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_submission public.homework_submissions%ROWTYPE;
  v_points INTEGER := 0;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Only admins can review homework';
  END IF;

  IF p_status NOT IN ('accepted', 'rework') THEN
    RAISE EXCEPTION 'Invalid status: %', p_status;
  END IF;

  SELECT * INTO v_submission FROM public.homework_submissions WHERE id = p_submission_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Submission not found';
  END IF;

  IF p_status = 'accepted' AND v_submission.assignment_id IS NOT NULL THEN
    SELECT points_reward INTO v_points FROM public.homework_assignments WHERE id = v_submission.assignment_id;
    v_points := COALESCE(v_points, 10);
  END IF;

  UPDATE public.homework_submissions
  SET status = p_status,
      admin_comment = p_admin_comment,
      reviewed_at = now(),
      reviewed_by = auth.uid(),
      verified = (p_status = 'accepted'),
      points_earned = CASE WHEN p_status = 'accepted' THEN v_points ELSE 0 END
  WHERE id = p_submission_id;

  PERFORM public.update_user_leaderboard(v_submission.user_id);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.review_reward_request(p_request_id uuid, p_new_status text, p_admin_comment text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_admin UUID := auth.uid();
  v_req RECORD;
BEGIN
  IF NOT is_admin(v_admin) THEN
    RAISE EXCEPTION 'Только админ';
  END IF;

  IF p_new_status NOT IN ('approved','rejected','fulfilled','cancelled') THEN
    RAISE EXCEPTION 'Недопустимый статус';
  END IF;

  SELECT * INTO v_req FROM public.reward_requests WHERE id = p_request_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Заявка не найдена';
  END IF;

  -- Refund on reject/cancel if not already refunded
  IF p_new_status IN ('rejected','cancelled') AND v_req.status NOT IN ('rejected','cancelled') THEN
    INSERT INTO public.coin_transactions (user_id, amount, reason, source_type, source_id, created_by)
    VALUES (v_req.user_id, v_req.cost_coins, 'Возврат коинов (отмена награды)', 'reward_request', v_req.id, v_admin);

    -- Restore stock if tracked
    UPDATE public.rewards SET stock = stock + 1
    WHERE id = v_req.reward_id AND stock IS NOT NULL;
  END IF;

  UPDATE public.reward_requests
  SET status = p_new_status,
      admin_comment = COALESCE(p_admin_comment, admin_comment),
      reviewed_by = v_admin,
      reviewed_at = now(),
      fulfilled_at = CASE WHEN p_new_status = 'fulfilled' THEN now() ELSE fulfilled_at END
  WHERE id = p_request_id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.save_journal_entry(p_telegram_id text, p_entry_date date, p_day_type text, p_emotions jsonb, p_answers jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id  UUID;
  v_entry_id UUID;
BEGIN
  SELECT p.user_id INTO v_user_id
  FROM   profiles p
  WHERE  p.telegram_id = p_telegram_id
  LIMIT  1;

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_linked');
  END IF;

  IF p_day_type NOT IN ('monday', 'wednesday', 'friday', 'saturday', 'sunday', 'weekday') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_day_type');
  END IF;

  INSERT INTO public.journal_entries (user_id, entry_date, day_type)
  VALUES (v_user_id, p_entry_date, p_day_type)
  ON CONFLICT (user_id, entry_date) DO NOTHING
  RETURNING id INTO v_entry_id;

  IF v_entry_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'already_exists');
  END IF;

  INSERT INTO public.journal_emotions (entry_id, emotion_name, intensity)
  SELECT v_entry_id, elem->>'name', (elem->>'intensity')::int
  FROM   jsonb_array_elements(COALESCE(p_emotions, '[]'::jsonb)) elem;

  INSERT INTO public.journal_answers (entry_id, prompt_id, answer_text)
  SELECT v_entry_id, (elem->>'prompt_id')::uuid, elem->>'text'
  FROM   jsonb_array_elements(COALESCE(p_answers, '[]'::jsonb)) elem;

  RETURN jsonb_build_object(
    'ok', true,
    'entry', jsonb_build_object(
      'id',         v_entry_id,
      'entry_date', p_entry_date,
      'day_type',   p_day_type,
      'emotions', (
        SELECT COALESCE(jsonb_agg(
          jsonb_build_object('emotion_name', em.emotion_name, 'intensity', em.intensity)
        ), '[]'::jsonb)
        FROM public.journal_emotions em
        WHERE em.entry_id = v_entry_id
      ),
      'answers', (
        SELECT COALESCE(jsonb_agg(
          jsonb_build_object('prompt_id', a.prompt_id, 'answer_text', a.answer_text)
        ), '[]'::jsonb)
        FROM public.journal_answers a
        WHERE a.entry_id = v_entry_id
      )
    )
  );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.server_challenge_checkin(p_user_id uuid, p_challenge_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_challenge RECORD;
  v_today DATE := CURRENT_DATE;
  v_existing UUID;
  v_entry_id UUID;
  v_total_tickets INT;
BEGIN
  SELECT * INTO v_challenge FROM challenges WHERE id = p_challenge_id AND is_active = true;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Челлендж не найден');
  END IF;

  IF v_today < v_challenge.start_date::date OR v_today > v_challenge.end_date::date THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Челлендж не активен');
  END IF;

  SELECT id INTO v_existing FROM challenge_entries
  WHERE challenge_id = p_challenge_id AND user_id = p_user_id AND entry_date = v_today;

  IF FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Сегодня уже отмечался');
  END IF;

  INSERT INTO challenge_entries (challenge_id, user_id, entry_date)
  VALUES (p_challenge_id, p_user_id, v_today)
  RETURNING id INTO v_entry_id;

  SELECT COUNT(*) INTO v_total_tickets FROM challenge_entries
  WHERE challenge_id = p_challenge_id AND user_id = p_user_id;

  RETURN jsonb_build_object('ok', true, 'entry_id', v_entry_id, 'total_tickets', v_total_tickets);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.server_complete_mastermind_task(p_user_id uuid, p_task_id uuid, p_comment text DEFAULT NULL::text, p_file_url text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_member_id UUID;
BEGIN
  IF p_comment IS NULL OR trim(p_comment) = '' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Напишите результат выполнения задачи');
  END IF;

  SELECT mm.id INTO v_member_id
  FROM mastermind_members mm
  JOIN mastermind_tasks mt ON mt.member_id = mm.id
  WHERE mm.user_id = p_user_id AND mt.id = p_task_id AND mm.is_active = true;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Задача не найдена');
  END IF;

  UPDATE mastermind_tasks
  SET is_completed = true,
      completed_at = now(),
      participant_comment = trim(p_comment),
      file_url = COALESCE(p_file_url, file_url)
  WHERE id = p_task_id;

  RETURN jsonb_build_object('ok', true);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.server_create_mastermind_task(p_user_id uuid, p_title text, p_description text DEFAULT NULL::text, p_deadline date DEFAULT NULL::date)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_member_id UUID;
  v_task_id UUID;
BEGIN
  IF p_title IS NULL OR trim(p_title) = '' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Укажите название задачи');
  END IF;

  SELECT id INTO v_member_id
  FROM mastermind_members
  WHERE user_id = p_user_id AND is_active = true;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Вы не участник мастермайнда');
  END IF;

  INSERT INTO mastermind_tasks (member_id, title, description, deadline, created_by, approval_status)
  VALUES (v_member_id, trim(p_title), trim(p_description), p_deadline, p_user_id, 'pending')
  RETURNING id INTO v_task_id;

  RETURN jsonb_build_object('ok', true, 'task_id', v_task_id);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.server_create_reward_request(p_user_id uuid, p_reward_id uuid, p_user_comment text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_status participant_status_type;
  v_cost INTEGER;
  v_active BOOLEAN;
  v_stock INTEGER;
  v_balance INTEGER;
  v_request_id UUID;
BEGIN
  -- Проверяем статус участника
  SELECT participant_status INTO v_status
  FROM public.profiles WHERE user_id = p_user_id;

  IF v_status NOT IN ('intensive_active'::participant_status_type,
                      'club_resident'::participant_status_type) THEN
    RAISE EXCEPTION 'Магазин доступен участникам интенсива и резидентам клуба';
  END IF;

  -- Получаем награду с блокировкой строки
  SELECT cost_coins, is_active, stock
    INTO v_cost, v_active, v_stock
  FROM public.rewards WHERE id = p_reward_id FOR UPDATE;

  IF NOT FOUND OR NOT v_active THEN
    RAISE EXCEPTION 'Награда недоступна';
  END IF;

  IF v_stock IS NOT NULL AND v_stock <= 0 THEN
    RAISE EXCEPTION 'Награда закончилась';
  END IF;

  -- Проверяем баланс
  v_balance := public.get_user_coin_balance(p_user_id);
  IF v_balance < v_cost THEN
    RAISE EXCEPTION 'Недостаточно коинов (баланс: %, требуется: %)', v_balance, v_cost;
  END IF;

  -- Создаём заявку
  INSERT INTO public.reward_requests (user_id, reward_id, cost_coins, user_comment)
  VALUES (p_user_id, p_reward_id, v_cost, p_user_comment)
  RETURNING id INTO v_request_id;

  -- Резервируем коины
  INSERT INTO public.coin_transactions (user_id, amount, reason, source_type, source_id, created_by)
  VALUES (p_user_id, -v_cost, 'Заказ награды (резерв)', 'reward_request', v_request_id, p_user_id);

  -- Уменьшаем остаток
  IF v_stock IS NOT NULL THEN
    UPDATE public.rewards SET stock = stock - 1 WHERE id = p_reward_id;
  END IF;

  RETURN v_request_id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.server_register_for_event(p_user_id uuid, p_schedule_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_event RECORD;
  v_existing UUID;
  v_current_count INT;
BEGIN
  SELECT * INTO v_event FROM schedules WHERE id = p_schedule_id AND is_active = true;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Событие не найдено');
  END IF;

  SELECT id INTO v_existing FROM schedule_participants
  WHERE schedule_id = p_schedule_id AND user_id = p_user_id;

  IF FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Уже записан');
  END IF;

  IF v_event.max_participants IS NOT NULL THEN
    SELECT COUNT(*) INTO v_current_count FROM schedule_participants WHERE schedule_id = p_schedule_id;
    IF v_current_count >= v_event.max_participants THEN
      RETURN jsonb_build_object('ok', false, 'error', 'Мест нет');
    END IF;
  END IF;

  INSERT INTO schedule_participants (schedule_id, user_id)
  VALUES (p_schedule_id, p_user_id);

  RETURN jsonb_build_object('ok', true);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.server_submit_mastermind_entry(p_user_id uuid, p_summary text, p_my_tasks text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_member_id UUID;
  v_entry_id UUID;
BEGIN
  SELECT id INTO v_member_id
  FROM mastermind_members
  WHERE user_id = p_user_id AND is_active = true;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Вы не участник мастермайнда');
  END IF;

  INSERT INTO mastermind_entries (member_id, summary, my_tasks)
  VALUES (v_member_id, p_summary, p_my_tasks)
  RETURNING id INTO v_entry_id;

  RETURN jsonb_build_object('ok', true, 'entry_id', v_entry_id);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.server_unregister_from_event(p_user_id uuid, p_schedule_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  DELETE FROM schedule_participants
  WHERE schedule_id = p_schedule_id AND user_id = p_user_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Запись не найдена');
  END IF;

  RETURN jsonb_build_object('ok', true);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.submit_homework(p_telegram_id text, p_assignment_id uuid, p_content text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id      UUID;
  v_stream_id    UUID;
  v_assignment   public.homework_assignments%ROWTYPE;
  v_submission   public.homework_submissions%ROWTYPE;
BEGIN
  SELECT p.user_id, p.current_stream_id
  INTO   v_user_id, v_stream_id
  FROM   profiles p
  WHERE  p.telegram_id = p_telegram_id
  LIMIT  1;

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_linked');
  END IF;

  SELECT * INTO v_assignment
  FROM   public.homework_assignments
  WHERE  id = p_assignment_id
    AND  is_active = true
    AND  (
      target_user_id = v_user_id
      OR (v_stream_id IS NOT NULL AND stream_id = v_stream_id)
    );

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_found');
  END IF;

  SELECT * INTO v_submission
  FROM   public.homework_submissions
  WHERE  assignment_id = p_assignment_id
    AND  user_id = v_user_id
  ORDER BY created_at DESC
  LIMIT  1
  FOR UPDATE;

  IF NOT FOUND THEN
    INSERT INTO public.homework_submissions (user_id, assignment_id, homework_type, content, status)
    VALUES (v_user_id, p_assignment_id, 'assignment', p_content, 'submitted');
    RETURN jsonb_build_object('ok', true, 'status', 'submitted');
  END IF;

  IF v_submission.status <> 'rework' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'already_submitted');
  END IF;

  UPDATE public.homework_submissions
  SET content = p_content,
      status = 'submitted',
      admin_comment = NULL,
      reviewed_at = NULL,
      reviewed_by = NULL,
      verified = false,
      points_earned = 0
  WHERE id = v_submission.id;

  RETURN jsonb_build_object('ok', true, 'status', 'submitted');
END;
$function$
;

CREATE OR REPLACE FUNCTION public.submit_homework(p_telegram_id text, p_assignment_id uuid, p_content text, p_file_url text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id       UUID;
  v_stream_id     UUID;
  v_assignment    public.homework_assignments%ROWTYPE;
  v_submission    public.homework_submissions%ROWTYPE;
  v_submission_id UUID;
  v_content       TEXT := NULLIF(BTRIM(COALESCE(p_content, '')), '');
  v_file_url      TEXT := NULLIF(BTRIM(COALESCE(p_file_url, '')), '');
BEGIN
  IF v_content IS NULL AND v_file_url IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'empty_submission');
  END IF;

  SELECT p.user_id, p.current_stream_id
  INTO   v_user_id, v_stream_id
  FROM   profiles p
  WHERE  p.telegram_id = p_telegram_id
  LIMIT  1;

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_linked');
  END IF;

  SELECT * INTO v_assignment
  FROM   public.homework_assignments
  WHERE  id = p_assignment_id
    AND  is_active = true
    AND  (
      target_user_id = v_user_id
      OR (v_stream_id IS NOT NULL AND stream_id = v_stream_id)
    );

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_found');
  END IF;

  SELECT * INTO v_submission
  FROM   public.homework_submissions
  WHERE  assignment_id = p_assignment_id
    AND  user_id = v_user_id
  ORDER BY created_at DESC
  LIMIT  1
  FOR UPDATE;

  IF NOT FOUND THEN
    INSERT INTO public.homework_submissions
      (user_id, assignment_id, homework_type, content, file_url, status)
    VALUES
      (v_user_id, p_assignment_id, 'assignment', v_content, v_file_url, 'submitted')
    RETURNING id INTO v_submission_id;

    RETURN jsonb_build_object(
      'ok',            true,
      'status',        'submitted',
      'submission_id', v_submission_id,
      'user_id',       v_user_id
    );
  END IF;

  IF v_submission.status <> 'rework' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'already_submitted');
  END IF;

  UPDATE public.homework_submissions
  SET content = v_content,
      file_url = v_file_url,
      status = 'submitted',
      admin_comment = NULL,
      reviewed_at = NULL,
      reviewed_by = NULL,
      verified = false,
      points_earned = 0
  WHERE id = v_submission.id;

  RETURN jsonb_build_object(
    'ok',            true,
    'status',        'submitted',
    'submission_id', v_submission.id,
    'user_id',       v_user_id
  );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.sync_public_profiles()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- On DELETE from profiles: remove from public_profiles
  IF TG_OP = 'DELETE' THEN
    DELETE FROM public.public_profiles WHERE id = OLD.id;
    RETURN OLD;
  END IF;

  -- Check visibility conditions on NEW row
  IF COALESCE(NEW.approved, false) = true
     AND COALESCE(NEW.leaderboard_visible, true) = true
     AND COALESCE(NEW.profile_private, false) = false THEN
    -- Upsert with new fields
    INSERT INTO public.public_profiles (
      id, user_id, display_name, first_name, last_name, 
      total_points, rank_position, participant_status, current_stream_id,
      created_at, updated_at
    ) VALUES (
      NEW.id, NEW.user_id, NEW.display_name, NEW.first_name, NEW.last_name,
      COALESCE(NEW.total_points, 0), COALESCE(NEW.rank_position, 0),
      NEW.participant_status, NEW.current_stream_id,
      now(), now()
    )
    ON CONFLICT (id) DO UPDATE SET
      user_id = EXCLUDED.user_id,
      display_name = EXCLUDED.display_name,
      first_name = EXCLUDED.first_name,
      last_name = EXCLUDED.last_name,
      total_points = EXCLUDED.total_points,
      rank_position = EXCLUDED.rank_position,
      participant_status = EXCLUDED.participant_status,
      current_stream_id = EXCLUDED.current_stream_id,
      updated_at = now();
  ELSE
    -- If no longer eligible, remove
    DELETE FROM public.public_profiles WHERE id = NEW.id;
  END IF;

  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.sync_public_profiles_from_leaderboard()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_profile public.profiles%ROWTYPE;
BEGIN
  -- Get profile to check visibility flags
  SELECT * INTO v_profile FROM public.profiles WHERE user_id = COALESCE(NEW.user_id, OLD.user_id);

  IF v_profile IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  IF COALESCE(v_profile.approved, false) = true
     AND COALESCE(v_profile.leaderboard_visible, true) = true
     AND COALESCE(v_profile.profile_private, false) = false THEN
    UPDATE public.public_profiles
    SET total_points = COALESCE(NEW.total_points, 0),
        rank_position = COALESCE(NEW.rank_position, 0),
        updated_at = now()
    WHERE user_id = v_profile.user_id;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.sync_testimonial_display_name()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Копируем полное имя из participant_name в display_name
  IF NEW.participant_name IS NOT NULL THEN
    NEW.display_name := NEW.participant_name;
  END IF;
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.sync_to_public_testimonials()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP = 'DELETE' THEN
    DELETE FROM public.public_testimonials WHERE id = OLD.id;
    RETURN OLD;
  END IF;

  -- Синхронизируем только активные записи
  IF NEW.is_active = true THEN
    INSERT INTO public.public_testimonials (
      id, display_name, participant_title, content, 
      video_url, image_url, is_active, sort_order, 
      created_at, updated_at
    ) VALUES (
      NEW.id, NEW.display_name, NEW.participant_title, NEW.content,
      NEW.video_url, NEW.image_url, NEW.is_active, NEW.sort_order,
      NEW.created_at, NEW.updated_at
    )
    ON CONFLICT (id) DO UPDATE SET
      display_name = EXCLUDED.display_name,
      participant_title = EXCLUDED.participant_title,
      content = EXCLUDED.content,
      video_url = EXCLUDED.video_url,
      image_url = EXCLUDED.image_url,
      is_active = EXCLUDED.is_active,
      sort_order = EXCLUDED.sort_order,
      updated_at = EXCLUDED.updated_at;
  ELSE
    -- Если запись стала неактивной, удаляем из публичной таблицы
    DELETE FROM public.public_testimonials WHERE id = NEW.id;
  END IF;

  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.take_ascetic(p_telegram_id text, p_text text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id UUID;
  v_id      UUID;
BEGIN
  SELECT p.user_id INTO v_user_id
  FROM   profiles p
  WHERE  p.telegram_id = p_telegram_id
  LIMIT  1;

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_linked');
  END IF;

  INSERT INTO public.ascetic_activities (user_id, activity_type, notes, streak, last_checkin_date)
  VALUES (v_user_id, 'ascetic_vow', p_text, 0, NULL)
  RETURNING id INTO v_id;

  RETURN jsonb_build_object(
    'ok',               true,
    'id',               v_id,
    'text',             p_text,
    'streak',           0,
    'checked_in_today', false
  );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.trigger_recalculate_ranks()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Проверяем, изменились ли поля, влияющие на видимость
  IF (TG_OP = 'UPDATE' AND (
    OLD.approved IS DISTINCT FROM NEW.approved OR
    OLD.leaderboard_visible IS DISTINCT FROM NEW.leaderboard_visible OR
    OLD.profile_private IS DISTINCT FROM NEW.profile_private
  )) THEN
    -- Вызываем полный пересчет рангов
    PERFORM recalculate_all_ranks();
  END IF;
  
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.trigger_update_leaderboard()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Обновляем рейтинг для затронутого пользователя
  IF TG_OP = 'DELETE' THEN
    PERFORM update_user_leaderboard(OLD.user_id);
    RETURN OLD;
  ELSE
    PERFORM update_user_leaderboard(NEW.user_id);
    RETURN NEW;
  END IF;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.unlink_telegram_profile(p_user_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Только администратор может отвязать Telegram';
  END IF;

  UPDATE public.profiles
  SET telegram_id = NULL,
      telegram_username = NULL,
      telegram_first_name = NULL,
      telegram_last_name = NULL,
      telegram_photo_url = NULL,
      telegram_linked_at = NULL,
      telegram_link_code = NULL,
      telegram_link_code_expires_at = NULL,
      updated_at = now()
  WHERE user_id = p_user_id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_avatar_for_user(p_telegram_id text, p_avatar_url text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id UUID;
BEGIN
  SELECT p.user_id INTO v_user_id
  FROM   profiles p
  WHERE  p.telegram_id = p_telegram_id
  LIMIT  1;

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_linked');
  END IF;

  UPDATE profiles
  SET    avatar_url = p_avatar_url
  WHERE  user_id = v_user_id;

  RETURN jsonb_build_object('ok', true, 'avatar_url', p_avatar_url);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_habit_completed_days()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Обновляем количество выполненных дней
  UPDATE public.participant_habits 
  SET completed_days = (
    SELECT COUNT(*) 
    FROM public.habit_progress 
    WHERE habit_id = NEW.habit_id AND completed = true
  ),
  is_completed = (
    SELECT COUNT(*) 
    FROM public.habit_progress 
    WHERE habit_id = NEW.habit_id AND completed = true
  ) >= (
    SELECT target_days 
    FROM public.participant_habits 
    WHERE id = NEW.habit_id
  )
  WHERE id = NEW.habit_id;
  
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_leaderboard_on_ascetic()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Only update when verification status changes to true
  IF TG_OP = 'UPDATE' AND NEW.verified = true AND (OLD.verified IS NULL OR OLD.verified = false) THEN
    PERFORM update_user_leaderboard(NEW.user_id);
  ELSIF TG_OP = 'UPDATE' AND NEW.verified = false AND OLD.verified = true THEN
    PERFORM update_user_leaderboard(NEW.user_id);
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_participant_status(p_user_id uuid, p_new_status participant_status_type)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Обновляем статус участника
  UPDATE profiles
  SET 
    participant_status = p_new_status,
    -- Устанавливаем intensive_completed_at если переводим в "intensive_completed" или "club_resident"
    intensive_completed_at = CASE 
      WHEN p_new_status IN ('intensive_completed', 'club_resident', 'alumni') 
           AND intensive_completed_at IS NULL 
      THEN now()
      ELSE intensive_completed_at
    END,
    -- Устанавливаем club_joined_at если переводим в "club_resident"
    club_joined_at = CASE 
      WHEN p_new_status = 'club_resident' AND club_joined_at IS NULL 
      THEN now()
      ELSE club_joined_at
    END,
    updated_at = now()
  WHERE user_id = p_user_id;

  -- Обновляем leaderboard
  PERFORM update_user_leaderboard(p_user_id);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_profile_for_user(p_telegram_id text, p_weight_kg integer, p_height_cm integer, p_date_of_birth date)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id UUID;
BEGIN
  SELECT p.user_id INTO v_user_id
  FROM   profiles p
  WHERE  p.telegram_id = p_telegram_id
  LIMIT  1;

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_linked');
  END IF;

  UPDATE profiles
  SET    weight_kg     = p_weight_kg,
         height_cm     = p_height_cm,
         date_of_birth = p_date_of_birth
  WHERE  user_id = v_user_id;

  RETURN jsonb_build_object(
    'ok',            true,
    'weight_kg',     p_weight_kg,
    'height_cm',     p_height_cm,
    'date_of_birth', p_date_of_birth
  );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_timestamp_public_profiles()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_user_leaderboard(user_uuid uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_training_points INTEGER := 0;
  v_tactical_points INTEGER := 0;
  v_theory_points INTEGER := 0;
  v_challenge_points INTEGER := 0;
  v_bjj_points INTEGER := 0;
  v_kick_points INTEGER := 0;
  v_ofp_points INTEGER := 0;
  v_nutrition_points INTEGER := 0;
  v_kamp_pyramid_points INTEGER := 0;
  v_total_points INTEGER := 0;
  v_other_points INTEGER := 0;
  v_crash_bjj INTEGER := 0;
  v_crash_kick INTEGER := 0;
  v_crash_ofp INTEGER := 0;
  v_stream_id UUID;
BEGIN
  -- Get user's stream_id
  SELECT current_stream_id INTO v_stream_id FROM profiles WHERE user_id = user_uuid;

  -- Баллы из тренировочных сессий (только подтвержденные)
  SELECT COALESCE(SUM(points_earned), 0) INTO v_training_points
  FROM training_sessions 
  WHERE user_id = user_uuid AND verified = true;
  
  -- Разбивка по типам активности в тренировочных сессиях  
  SELECT 
    COALESCE(SUM(CASE WHEN session_type = 'bjj' OR activity_type = 'bjj' THEN points_earned ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN session_type = 'kickboxing' OR activity_type = 'kickboxing' THEN points_earned ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN session_type = 'physical' OR activity_type = 'ofp' THEN points_earned ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN session_type = 'theory' OR activity_type = 'theory' THEN points_earned ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN session_type = 'tactics' OR activity_type = 'tactics' THEN points_earned ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN session_type = 'nutrition' OR activity_type = 'nutrition' THEN points_earned ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN session_type = 'kamp_pyramid' OR activity_type = 'kamp_pyramid' THEN points_earned ELSE 0 END), 0)
  INTO v_bjj_points, v_kick_points, v_ofp_points, v_theory_points, v_tactical_points, v_nutrition_points, v_kamp_pyramid_points
  FROM training_sessions 
  WHERE user_id = user_uuid AND verified = true;

  -- Баллы из краш-тестов по дисциплинам
  SELECT 
    COALESCE(SUM(CASE WHEN LOWER(test_type) = 'bjj' THEN points_earned ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN LOWER(test_type) = 'kickboxing' THEN points_earned ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN LOWER(test_type) = 'ofp' THEN points_earned ELSE 0 END), 0)
  INTO v_crash_bjj, v_crash_kick, v_crash_ofp
  FROM crash_tests 
  WHERE user_id = user_uuid AND verified = true AND passed = true;

  -- Добавляем краш-тесты к соответствующим категориям
  v_bjj_points := v_bjj_points + v_crash_bjj;
  v_kick_points := v_kick_points + v_crash_kick;
  v_ofp_points := v_ofp_points + v_crash_ofp;

  -- Баллы из тактических сессий
  SELECT COALESCE(SUM(points_earned), 0) INTO v_other_points
  FROM tactical_sessions 
  WHERE user_id = user_uuid AND verified = true;
  
  v_tactical_points := v_tactical_points + v_other_points;
  
  -- Баллы из других активностей
  SELECT 
    COALESCE(SUM(points_earned), 0) INTO v_other_points
  FROM (
    SELECT points_earned FROM hero_races WHERE user_id = user_uuid AND verified = true
    UNION ALL
    SELECT points_earned FROM homework_submissions WHERE user_id = user_uuid AND verified = true
    UNION ALL
    SELECT points_earned FROM lectures WHERE user_id = user_uuid AND verified = true
    UNION ALL
    SELECT points_earned FROM ascetic_activities WHERE user_id = user_uuid AND verified = true
  ) all_activities;

  v_tactical_points := v_tactical_points + v_other_points;
  v_total_points := v_training_points + v_tactical_points + v_other_points + v_crash_bjj + v_crash_kick + v_crash_ofp;

  -- Обновляем или вставляем запись в leaderboard
  INSERT INTO leaderboard (
    user_id, 
    total_points, 
    bjj_points, 
    kickboxing_points, 
    ofp_points, 
    theory_points, 
    tactical_points,
    nutrition_points,
    kamp_pyramid_points,
    challenges_points,
    monthly_points,
    last_updated
  ) VALUES (
    user_uuid,
    v_total_points,
    v_bjj_points,
    v_kick_points,
    v_ofp_points, 
    v_theory_points,
    v_tactical_points,
    v_nutrition_points,
    v_kamp_pyramid_points,
    v_challenge_points,
    0,
    now()
  )
  ON CONFLICT (user_id) 
  DO UPDATE SET
    total_points = EXCLUDED.total_points,
    bjj_points = EXCLUDED.bjj_points,
    kickboxing_points = EXCLUDED.kickboxing_points,
    ofp_points = EXCLUDED.ofp_points,
    theory_points = EXCLUDED.theory_points,
    tactical_points = EXCLUDED.tactical_points,
    nutrition_points = EXCLUDED.nutrition_points,
    kamp_pyramid_points = EXCLUDED.kamp_pyramid_points,
    challenges_points = EXCLUDED.challenges_points,
    last_updated = now();

  -- Пересчитываем позиции в рейтинге по потокам
  WITH visible_admins AS (
    SELECT user_id FROM user_roles 
    WHERE role IN ('admin', 'super_admin')
  ),
  ranked_users AS (
    SELECT 
      l.user_id,
      ROW_NUMBER() OVER (
        PARTITION BY p.current_stream_id 
        ORDER BY l.total_points DESC, l.last_updated ASC
      ) as new_rank
    FROM leaderboard l
    INNER JOIN profiles p ON p.user_id = l.user_id
    WHERE l.total_points > 0
      AND p.current_stream_id = v_stream_id
      AND p.approved = true
      AND COALESCE(p.leaderboard_visible, true) = true
      AND COALESCE(p.profile_private, false) = false
      AND l.user_id NOT IN (SELECT user_id FROM visible_admins)
  )
  UPDATE leaderboard 
  SET rank_position = ranked_users.new_rank
  FROM ranked_users
  WHERE leaderboard.user_id = ranked_users.user_id;

  -- Update profiles table with latest points and rank
  UPDATE profiles 
  SET 
    total_points = v_total_points,
    rank_position = COALESCE((SELECT rank_position FROM leaderboard WHERE user_id = user_uuid), 0)
  WHERE user_id = user_uuid;

END;
$function$
;

CREATE OR REPLACE FUNCTION public.validate_audit_entry()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Validate that audit entries have required fields
  IF NEW.action IS NULL OR trim(NEW.action) = '' THEN
    RAISE EXCEPTION 'Audit log action cannot be empty';
  END IF;
  
  -- Validate action types against allowed list
  IF NOT (NEW.action = ANY(ARRAY[
    'LOGIN', 'LOGOUT', 'CONTACT_FORM_ACCESS', 'RATE_LIMIT_EXCEEDED',
    'ROLE_CHANGE', 'DATA_EXPORT', 'ADMIN_ACTION', 'SECURITY_EVENT',
    'DATA_CLEANUP', 'SESSION_EXPIRED', 'AUDIT_LOG_CLEANUP', 
    'PHONE_ENCRYPTION', 'CONSENT_UPDATE', 'PARTICIPANT_STATUS_CHANGE'
  ])) THEN
    RAISE EXCEPTION 'Invalid audit log action type: %', NEW.action;
  END IF;
  
  -- Set timestamp if not provided
  IF NEW.timestamp IS NULL THEN
    NEW.timestamp = now();
  END IF;
  
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.validate_audit_log_entry(p_action text, p_table_name text, p_user_id uuid DEFAULT NULL::uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Validate action type
  IF p_action IS NULL OR length(trim(p_action)) = 0 THEN
    RETURN false;
  END IF;
  
  -- Validate action is from allowed list
  IF NOT (p_action = ANY(ARRAY[
    'LOGIN', 'LOGOUT', 'CONTACT_FORM_ACCESS', 'RATE_LIMIT_EXCEEDED',
    'ROLE_CHANGE', 'DATA_EXPORT', 'ADMIN_ACTION', 'SECURITY_EVENT',
    'DATA_CLEANUP', 'SESSION_EXPIRED', 'PARTICIPANT_STATUS_CHANGE'
  ])) THEN
    RETURN false;
  END IF;
  
  -- Validate table name if provided
  IF p_table_name IS NOT NULL AND length(trim(p_table_name)) = 0 THEN
    RETURN false;
  END IF;
  
  RETURN true;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.validate_contact_submission(p_name text, p_phone text, p_course text, p_social text DEFAULT NULL::text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Validate name (2-100 chars, letters, spaces, hyphens only)
  IF p_name IS NULL OR length(trim(p_name)) < 2 OR length(trim(p_name)) > 100 THEN
    RETURN false;
  END IF;
  
  IF NOT (trim(p_name) ~ '^[А-Яа-яA-Za-z\s\-'']+$') THEN
    RETURN false;
  END IF;
  
  -- Validate phone (10-20 chars, numbers, +, -, spaces, parentheses only)
  IF p_phone IS NULL OR length(trim(p_phone)) < 10 OR length(trim(p_phone)) > 20 THEN
    RETURN false;
  END IF;
  
  IF NOT (trim(p_phone) ~ '^[\+\d\s\-\(\)]+$') THEN
    RETURN false;
  END IF;
  
  -- Validate course (not empty, max 100 chars)
  IF p_course IS NULL OR length(trim(p_course)) = 0 OR length(trim(p_course)) > 100 THEN
    RETURN false;
  END IF;
  
  -- Validate social if provided (max 200 chars)
  IF p_social IS NOT NULL AND length(trim(p_social)) > 200 THEN
    RETURN false;
  END IF;
  
  RETURN true;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.validate_referral_code(p_code text)
 RETURNS TABLE(user_id uuid)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT p.user_id
  FROM public.profiles p
  WHERE p.referral_code = p_code
  LIMIT 1;
$function$
;

CREATE OR REPLACE FUNCTION public.validate_security_event_type()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Validate security event types
  IF NEW.action NOT IN (
    'LOGIN', 'LOGOUT', 'CONTACT_FORM_ACCESS', 'RATE_LIMIT_EXCEEDED',
    'ROLE_CHANGE', 'DATA_EXPORT', 'ADMIN_ACTION', 'SECURITY_EVENT',
    'DATA_CLEANUP', 'SESSION_EXPIRED', 'AUDIT_LOG_CLEANUP', 
    'PHONE_ENCRYPTION', 'CONSENT_UPDATE'
  ) THEN
    RAISE EXCEPTION 'Invalid security event type: %', NEW.action;
  END IF;
  
  RETURN NEW;
END;
$function$
;

-- ################ 05_triggers.sql ################

-- 05_triggers.sql — 53 триггера схемы public. Требует 02 и 04.

CREATE TRIGGER update_activities_updated_at BEFORE UPDATE ON public.activities FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_application_reminders_updated_at BEFORE UPDATE ON public.application_reminders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trigger_ascetic_activities_leaderboard AFTER INSERT OR DELETE OR UPDATE ON public.ascetic_activities FOR EACH ROW EXECUTE FUNCTION trigger_update_leaderboard();
CREATE TRIGGER trigger_update_leaderboard_ascetic AFTER UPDATE ON public.ascetic_activities FOR EACH ROW EXECUTE FUNCTION update_leaderboard_on_ascetic();
CREATE TRIGGER update_leaderboard_on_ascetic AFTER INSERT OR DELETE OR UPDATE ON public.ascetic_activities FOR EACH ROW EXECUTE FUNCTION trigger_update_leaderboard();
CREATE TRIGGER update_ascetic_types_updated_at BEFORE UPDATE ON public.ascetic_types FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER validate_audit_log_entry BEFORE INSERT ON public.audit_log FOR EACH ROW EXECUTE FUNCTION validate_audit_entry();
CREATE TRIGGER validate_security_events BEFORE INSERT ON public.audit_log FOR EACH ROW EXECUTE FUNCTION validate_security_event_type();
CREATE TRIGGER update_coin_rules_updated_at BEFORE UPDATE ON public.coin_rules FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER cleanup_old_contact_submissions AFTER INSERT ON public.contact_submissions FOR EACH STATEMENT EXECUTE FUNCTION auto_delete_old_contact_submissions();
CREATE TRIGGER update_content_blocks_updated_at BEFORE UPDATE ON public.content_blocks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_contract_data_updated_at BEFORE UPDATE ON public.contract_data FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_contracts_updated_at BEFORE UPDATE ON public.contracts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trigger_crash_tests_leaderboard AFTER INSERT OR DELETE OR UPDATE ON public.crash_tests FOR EACH ROW EXECUTE FUNCTION trigger_update_leaderboard();
CREATE TRIGGER update_leaderboard_on_crash_test AFTER INSERT OR DELETE OR UPDATE ON public.crash_tests FOR EACH ROW EXECUTE FUNCTION trigger_update_leaderboard();
CREATE TRIGGER update_habit_progress_trigger AFTER INSERT OR DELETE OR UPDATE ON public.habit_progress FOR EACH ROW EXECUTE FUNCTION update_habit_completed_days();
CREATE TRIGGER trigger_hero_races_leaderboard AFTER INSERT OR DELETE OR UPDATE ON public.hero_races FOR EACH ROW EXECUTE FUNCTION trigger_update_leaderboard();
CREATE TRIGGER update_leaderboard_on_hero_race AFTER INSERT OR DELETE OR UPDATE ON public.hero_races FOR EACH ROW EXECUTE FUNCTION trigger_update_leaderboard();
CREATE TRIGGER update_hw_assignments_updated_at BEFORE UPDATE ON public.homework_assignments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trigger_homework_submissions_leaderboard AFTER INSERT OR DELETE OR UPDATE ON public.homework_submissions FOR EACH ROW EXECUTE FUNCTION trigger_update_leaderboard();
CREATE TRIGGER update_leaderboard_on_homework AFTER INSERT OR DELETE OR UPDATE ON public.homework_submissions FOR EACH ROW EXECUTE FUNCTION trigger_update_leaderboard();
CREATE TRIGGER update_journal_answers_updated_at BEFORE UPDATE ON public.journal_answers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_journal_entries_updated_at BEFORE UPDATE ON public.journal_entries FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_journal_prompts_updated_at BEFORE UPDATE ON public.journal_prompts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_leaderboard_sync_public AFTER INSERT OR DELETE OR UPDATE ON public.leaderboard FOR EACH ROW EXECUTE FUNCTION sync_public_profiles_from_leaderboard();
CREATE TRIGGER trigger_lectures_leaderboard AFTER INSERT OR DELETE OR UPDATE ON public.lectures FOR EACH ROW EXECUTE FUNCTION trigger_update_leaderboard();
CREATE TRIGGER update_leaderboard_on_lecture AFTER INSERT OR DELETE OR UPDATE ON public.lectures FOR EACH ROW EXECUTE FUNCTION trigger_update_leaderboard();
CREATE TRIGGER update_materials_updated_at BEFORE UPDATE ON public.materials FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_moments_updated_at BEFORE UPDATE ON public.moments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_participant_habits_updated_at BEFORE UPDATE ON public.participant_habits FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER auto_referral_code BEFORE INSERT ON public.profiles FOR EACH ROW EXECUTE FUNCTION generate_referral_code();
CREATE TRIGGER on_profile_visibility_change AFTER UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION trigger_recalculate_ranks();
CREATE TRIGGER trg_participant_status_history AFTER UPDATE OF participant_status ON public.profiles FOR EACH ROW EXECUTE FUNCTION log_participant_status_change();
CREATE TRIGGER trg_profiles_sync_public AFTER INSERT OR DELETE OR UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION sync_public_profiles();
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_public_profiles_updated_at BEFORE UPDATE ON public.public_profiles FOR EACH ROW EXECUTE FUNCTION update_timestamp_public_profiles();
CREATE TRIGGER trg_referral_settings_updated_at BEFORE UPDATE ON public.referral_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_reward_requests_updated_at BEFORE UPDATE ON public.reward_requests FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_rewards_updated_at BEFORE UPDATE ON public.rewards FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_schedules_updated_at BEFORE UPDATE ON public.schedules FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_streams_updated_at BEFORE UPDATE ON public.streams FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trigger_tactical_sessions_leaderboard AFTER INSERT OR DELETE OR UPDATE ON public.tactical_sessions FOR EACH ROW EXECUTE FUNCTION trigger_update_leaderboard();
CREATE TRIGGER update_leaderboard_on_tactical_session AFTER INSERT OR DELETE OR UPDATE ON public.tactical_sessions FOR EACH ROW EXECUTE FUNCTION trigger_update_leaderboard();
CREATE TRIGGER trg_cleanup_expired_bot_sessions AFTER INSERT ON public.telegram_bot_sessions FOR EACH STATEMENT EXECUTE FUNCTION cleanup_expired_bot_sessions();
CREATE TRIGGER update_telegram_leads_updated_at BEFORE UPDATE ON public.telegram_leads FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER auto_generate_display_name BEFORE INSERT OR UPDATE ON public.testimonials FOR EACH ROW EXECUTE FUNCTION generate_display_name();
CREATE TRIGGER set_testimonial_display_name BEFORE INSERT OR UPDATE ON public.testimonials FOR EACH ROW EXECUTE FUNCTION sync_testimonial_display_name();
CREATE TRIGGER sync_testimonials_to_public AFTER INSERT OR DELETE OR UPDATE ON public.testimonials FOR EACH ROW EXECUTE FUNCTION sync_to_public_testimonials();
CREATE TRIGGER update_testimonials_updated_at BEFORE UPDATE ON public.testimonials FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_trainers_updated_at BEFORE UPDATE ON public.trainers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trigger_training_sessions_leaderboard AFTER INSERT OR DELETE OR UPDATE ON public.training_sessions FOR EACH ROW EXECUTE FUNCTION trigger_update_leaderboard();
CREATE TRIGGER update_leaderboard_on_training_session AFTER INSERT OR DELETE OR UPDATE ON public.training_sessions FOR EACH ROW EXECUTE FUNCTION trigger_update_leaderboard();
CREATE TRIGGER role_changes_audit_trigger AFTER INSERT OR DELETE ON public.user_roles FOR EACH ROW EXECUTE FUNCTION log_role_changes();

-- ################ 06_views.sql ################

-- 06_views.sql
-- В действующей базе КЭМП НЕТ ни одного VIEW и ни одной MATERIALIZED VIEW
-- в схеме public (проверено по pg_class relkind IN ('v','m') = 0).
-- Файл оставлен как placeholder для сохранения порядка миграций.

-- ################ 07_grants.sql ################

-- 07_grants.sql — привилегии PostgREST-ролей (anon, authenticated, service_role).
-- 239 табличных GRANT + 268 GRANT EXECUTE. Доступ реально ограничивается RLS (08).

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.achievement_types TO anon;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.achievement_types TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.achievement_types TO service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.achievements TO anon;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.achievements TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.achievements TO service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.activities TO anon;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.activities TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.activities TO service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.activity_checkins TO anon;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.activity_checkins TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.activity_checkins TO service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.admin_access_log TO anon;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.admin_access_log TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.admin_access_log TO service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.admin_sessions TO anon;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.admin_sessions TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.admin_sessions TO service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.application_notes TO anon;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.application_notes TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.application_notes TO service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.application_reminders TO anon;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.application_reminders TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.application_reminders TO service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.ascetic_activities TO anon;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.ascetic_activities TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.ascetic_activities TO service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.ascetic_types TO anon;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.ascetic_types TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.ascetic_types TO service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.audit_log TO anon;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.audit_log TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.audit_log TO service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.broadcast_messages TO anon;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.broadcast_messages TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.broadcast_messages TO service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.broadcast_responses TO anon;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.broadcast_responses TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.broadcast_responses TO service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.broadcasts TO anon;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.broadcasts TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.broadcasts TO service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.challenge_entries TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.challenge_entries TO service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.challenges TO anon;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.challenges TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.challenges TO service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.coin_rules TO anon;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.coin_rules TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.coin_rules TO service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.coin_transactions TO anon;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.coin_transactions TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.coin_transactions TO service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.contact_rate_limit TO anon;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.contact_rate_limit TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.contact_rate_limit TO service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.contact_submissions TO anon;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.contact_submissions TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.contact_submissions TO service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.content_blocks TO anon;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.content_blocks TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.content_blocks TO service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.contract_data TO anon;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.contract_data TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.contract_data TO service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.contracts TO anon;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.contracts TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.contracts TO service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.cooper_test_results TO anon;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.cooper_test_results TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.cooper_test_results TO service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.crash_tests TO anon;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.crash_tests TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.crash_tests TO service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.habit_progress TO anon;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.habit_progress TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.habit_progress TO service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.hero_races TO anon;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.hero_races TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.hero_races TO service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.homework_assignments TO anon;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.homework_assignments TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.homework_assignments TO service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.homework_submissions TO anon;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.homework_submissions TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.homework_submissions TO service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.intensive_streams TO anon;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.intensive_streams TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.intensive_streams TO service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.journal_answers TO anon;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.journal_answers TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.journal_answers TO service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.journal_emotions TO anon;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.journal_emotions TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.journal_emotions TO service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.journal_entries TO anon;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.journal_entries TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.journal_entries TO service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.journal_prompts TO anon;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.journal_prompts TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.journal_prompts TO service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.leaderboard TO anon;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.leaderboard TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.leaderboard TO service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.lectures TO anon;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.lectures TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.lectures TO service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.mastermind_entries TO anon;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.mastermind_entries TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.mastermind_entries TO service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.mastermind_groups TO anon;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.mastermind_groups TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.mastermind_groups TO service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.mastermind_members TO anon;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.mastermind_members TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.mastermind_members TO service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.mastermind_tasks TO anon;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.mastermind_tasks TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.mastermind_tasks TO service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.materials TO anon;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.materials TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.materials TO service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.moments TO anon;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.moments TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.moments TO service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.notifications TO anon;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.notifications TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.notifications TO service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.participant_habits TO anon;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.participant_habits TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.participant_habits TO service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.participant_notes TO anon;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.participant_notes TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.participant_notes TO service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.participant_status_history TO anon;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.participant_status_history TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.participant_status_history TO service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.participant_tags TO anon;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.participant_tags TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.participant_tags TO service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.profile_tags TO anon;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.profile_tags TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.profile_tags TO service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.profiles TO anon;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.profiles TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.profiles TO service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.public_profiles TO anon;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.public_profiles TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.public_profiles TO service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.public_testimonials TO anon;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.public_testimonials TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.public_testimonials TO service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.pyramid_levels TO anon;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.pyramid_levels TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.pyramid_levels TO service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.referral_leads TO anon;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.referral_leads TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.referral_leads TO service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.referral_settings TO anon;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.referral_settings TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.referral_settings TO service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.reward_requests TO anon;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.reward_requests TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.reward_requests TO service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.rewards TO anon;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.rewards TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.rewards TO service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.role_audit_log TO anon;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.role_audit_log TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.role_audit_log TO service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.schedule_participants TO anon;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.schedule_participants TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.schedule_participants TO service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.schedules TO anon;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.schedules TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.schedules TO service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.streams TO anon;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.streams TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.streams TO service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.tactical_sessions TO anon;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.tactical_sessions TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.tactical_sessions TO service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.telegram_bot_logs TO anon;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.telegram_bot_logs TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.telegram_bot_logs TO service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.telegram_bot_sessions TO anon;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.telegram_bot_sessions TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.telegram_bot_sessions TO service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.telegram_leads TO anon;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.telegram_leads TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.telegram_leads TO service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.testimonials TO anon;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.testimonials TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.testimonials TO service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.totems TO anon;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.totems TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.totems TO service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.trainers TO anon;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.trainers TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.trainers TO service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.training_programs TO anon;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.training_programs TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.training_programs TO service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.training_sessions TO anon;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.training_sessions TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.training_sessions TO service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.user_achievements TO anon;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.user_achievements TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.user_achievements TO service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.user_activities TO anon;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.user_activities TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.user_activities TO service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.user_challenges TO anon;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.user_challenges TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.user_challenges TO service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.user_points TO anon;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.user_points TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.user_points TO service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.user_roles TO anon;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.user_roles TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.user_roles TO service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.user_totems TO anon;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.user_totems TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.user_totems TO service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.weekly_summaries TO anon;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.weekly_summaries TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.weekly_summaries TO service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public."аскезы_участников" TO anon;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public."аскезы_участников" TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public."аскезы_участников" TO service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public."кэмп_активности" TO anon;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public."кэмп_активности" TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public."кэмп_активности" TO service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public."тотемы_участников" TO anon;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public."тотемы_участников" TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public."тотемы_участников" TO service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public."участники" TO anon;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public."участники" TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public."участники" TO service_role;

-- function grants
GRANT EXECUTE ON FUNCTION public.admin_adjust_coins(p_user_id uuid, p_amount integer, p_reason text) TO anon;
GRANT EXECUTE ON FUNCTION public.admin_adjust_coins(p_user_id uuid, p_amount integer, p_reason text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_adjust_coins(p_user_id uuid, p_amount integer, p_reason text) TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_confirm_referral(p_lead_id uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.admin_confirm_referral(p_lead_id uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_confirm_referral(p_lead_id uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_list_coin_balances() TO anon;
GRANT EXECUTE ON FUNCTION public.admin_list_coin_balances() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_list_coin_balances() TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_set_approval(p_user_id uuid, p_approved boolean) TO anon;
GRANT EXECUTE ON FUNCTION public.admin_set_approval(p_user_id uuid, p_approved boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_approval(p_user_id uuid, p_approved boolean) TO service_role;
GRANT EXECUTE ON FUNCTION public.auto_cleanup_contact_submissions() TO anon;
GRANT EXECUTE ON FUNCTION public.auto_cleanup_contact_submissions() TO authenticated;
GRANT EXECUTE ON FUNCTION public.auto_cleanup_contact_submissions() TO service_role;
GRANT EXECUTE ON FUNCTION public.auto_delete_old_contact_submissions() TO anon;
GRANT EXECUTE ON FUNCTION public.auto_delete_old_contact_submissions() TO authenticated;
GRANT EXECUTE ON FUNCTION public.auto_delete_old_contact_submissions() TO service_role;
GRANT EXECUTE ON FUNCTION public.award_coins_by_rule(p_user_id uuid, p_rule_code text, p_source_type text, p_source_id uuid, p_reason text, p_amount_override integer) TO anon;
GRANT EXECUTE ON FUNCTION public.award_coins_by_rule(p_user_id uuid, p_rule_code text, p_source_type text, p_source_id uuid, p_reason text, p_amount_override integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.award_coins_by_rule(p_user_id uuid, p_rule_code text, p_source_type text, p_source_id uuid, p_reason text, p_amount_override integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.book_schedule_session(p_telegram_id text, p_schedule_id uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.book_schedule_session(p_telegram_id text, p_schedule_id uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.book_schedule_session(p_telegram_id text, p_schedule_id uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.calculate_cooper_fitness_level(total_seconds integer) TO anon;
GRANT EXECUTE ON FUNCTION public.calculate_cooper_fitness_level(total_seconds integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.calculate_cooper_fitness_level(total_seconds integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.calculate_cooper_fitness_level_minutes(total_minutes integer) TO anon;
GRANT EXECUTE ON FUNCTION public.calculate_cooper_fitness_level_minutes(total_minutes integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.calculate_cooper_fitness_level_minutes(total_minutes integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.check_in_activity(p_telegram_id text, p_activity_type text) TO anon;
GRANT EXECUTE ON FUNCTION public.check_in_activity(p_telegram_id text, p_activity_type text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_in_activity(p_telegram_id text, p_activity_type text) TO service_role;
GRANT EXECUTE ON FUNCTION public.checkin_ascetic(p_telegram_id text, p_ascetic_id uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.checkin_ascetic(p_telegram_id text, p_ascetic_id uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.checkin_ascetic(p_telegram_id text, p_ascetic_id uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.cleanup_expired_bot_sessions() TO anon;
GRANT EXECUTE ON FUNCTION public.cleanup_expired_bot_sessions() TO authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_expired_bot_sessions() TO service_role;
GRANT EXECUTE ON FUNCTION public.cleanup_expired_sessions() TO anon;
GRANT EXECUTE ON FUNCTION public.cleanup_expired_sessions() TO authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_expired_sessions() TO service_role;
GRANT EXECUTE ON FUNCTION public.cleanup_old_audit_logs() TO anon;
GRANT EXECUTE ON FUNCTION public.cleanup_old_audit_logs() TO authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_old_audit_logs() TO service_role;
GRANT EXECUTE ON FUNCTION public.confirm_referral_lead(_lead_id uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.confirm_referral_lead(_lead_id uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.confirm_referral_lead(_lead_id uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.create_reward_request(p_reward_id uuid, p_user_comment text) TO anon;
GRANT EXECUTE ON FUNCTION public.create_reward_request(p_reward_id uuid, p_user_comment text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_reward_request(p_reward_id uuid, p_user_comment text) TO service_role;
GRANT EXECUTE ON FUNCTION public.decrypt_phone(encrypted_phone text) TO anon;
GRANT EXECUTE ON FUNCTION public.decrypt_phone(encrypted_phone text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.decrypt_phone(encrypted_phone text) TO service_role;
GRANT EXECUTE ON FUNCTION public.encrypt_phone(phone_text text) TO anon;
GRANT EXECUTE ON FUNCTION public.encrypt_phone(phone_text text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.encrypt_phone(phone_text text) TO service_role;
GRANT EXECUTE ON FUNCTION public.enhanced_contact_rate_limit(p_ip_address inet) TO anon;
GRANT EXECUTE ON FUNCTION public.enhanced_contact_rate_limit(p_ip_address inet) TO authenticated;
GRANT EXECUTE ON FUNCTION public.enhanced_contact_rate_limit(p_ip_address inet) TO service_role;
GRANT EXECUTE ON FUNCTION public.enhanced_rate_limit_check(p_ip_address inet, p_action text) TO anon;
GRANT EXECUTE ON FUNCTION public.enhanced_rate_limit_check(p_ip_address inet, p_action text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.enhanced_rate_limit_check(p_ip_address inet, p_action text) TO service_role;
GRANT EXECUTE ON FUNCTION public.enroll_application(p_submission_id uuid, p_stream_id uuid, p_user_id uuid, p_new_status participant_status_type) TO anon;
GRANT EXECUTE ON FUNCTION public.enroll_application(p_submission_id uuid, p_stream_id uuid, p_user_id uuid, p_new_status participant_status_type) TO authenticated;
GRANT EXECUTE ON FUNCTION public.enroll_application(p_submission_id uuid, p_stream_id uuid, p_user_id uuid, p_new_status participant_status_type) TO service_role;
GRANT EXECUTE ON FUNCTION public.ensure_referral_code(_user_id uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.ensure_referral_code(_user_id uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ensure_referral_code(_user_id uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.generate_display_name() TO anon;
GRANT EXECUTE ON FUNCTION public.generate_display_name() TO authenticated;
GRANT EXECUTE ON FUNCTION public.generate_display_name() TO service_role;
GRANT EXECUTE ON FUNCTION public.generate_referral_code() TO anon;
GRANT EXECUTE ON FUNCTION public.generate_referral_code() TO authenticated;
GRANT EXECUTE ON FUNCTION public.generate_referral_code() TO service_role;
GRANT EXECUTE ON FUNCTION public.generate_telegram_link_code(p_user_id uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.generate_telegram_link_code(p_user_id uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_ascetic_for_user(p_telegram_id text) TO anon;
GRANT EXECUTE ON FUNCTION public.get_ascetic_for_user(p_telegram_id text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_ascetic_for_user(p_telegram_id text) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_broadcast_audience(filter_json jsonb) TO anon;
GRANT EXECUTE ON FUNCTION public.get_broadcast_audience(filter_json jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_broadcast_audience(filter_json jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_homework_for_user(p_telegram_id text) TO anon;
GRANT EXECUTE ON FUNCTION public.get_homework_for_user(p_telegram_id text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_homework_for_user(p_telegram_id text) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_journal_for_user(p_telegram_id text, p_date date) TO anon;
GRANT EXECUTE ON FUNCTION public.get_journal_for_user(p_telegram_id text, p_date date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_journal_for_user(p_telegram_id text, p_date date) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_participant_full_state(p_user_id uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.get_participant_full_state(p_user_id uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_participant_full_state(p_user_id uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_participant_full_state_by_telegram(p_telegram_id text) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_participant_timeline(_user_id uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.get_participant_timeline(_user_id uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_participant_timeline(_user_id uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_profile_for_user(p_telegram_id text) TO anon;
GRANT EXECUTE ON FUNCTION public.get_profile_for_user(p_telegram_id text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_profile_for_user(p_telegram_id text) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_pyramid_for_user(p_telegram_id text) TO anon;
GRANT EXECUTE ON FUNCTION public.get_pyramid_for_user(p_telegram_id text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_pyramid_for_user(p_telegram_id text) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_rating_for_user(p_telegram_id text) TO anon;
GRANT EXECUTE ON FUNCTION public.get_rating_for_user(p_telegram_id text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_rating_for_user(p_telegram_id text) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_schedule_for_user(p_telegram_id text, p_from timestamp with time zone, p_days integer) TO anon;
GRANT EXECUTE ON FUNCTION public.get_schedule_for_user(p_telegram_id text, p_from timestamp with time zone, p_days integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_schedule_for_user(p_telegram_id text, p_from timestamp with time zone, p_days integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_user_coin_balance(p_user_id uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.get_user_coin_balance(p_user_id uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_coin_balance(p_user_id uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO anon;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;
GRANT EXECUTE ON FUNCTION public.handle_new_user_participant() TO anon;
GRANT EXECUTE ON FUNCTION public.handle_new_user_participant() TO authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_user_participant() TO service_role;
GRANT EXECUTE ON FUNCTION public.has_role(_user_id uuid, _role user_role) TO anon;
GRANT EXECUTE ON FUNCTION public.has_role(_user_id uuid, _role user_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(_user_id uuid, _role user_role) TO service_role;
GRANT EXECUTE ON FUNCTION public.is_admin(_user_id uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.is_admin(_user_id uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin(_user_id uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.is_club_resident(_user_id uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.is_club_resident(_user_id uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_club_resident(_user_id uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.is_public_participant(_user_id uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.is_public_participant(_user_id uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_public_participant(_user_id uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.is_super_admin(_user_id uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.is_super_admin(_user_id uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_super_admin(_user_id uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.link_or_create_telegram_profile(p_telegram_id text, p_telegram_username text, p_telegram_first_name text, p_telegram_last_name text, p_phone text, p_referral_code text) TO service_role;
GRANT EXECUTE ON FUNCTION public.link_telegram_lead_to_profile(p_lead_id uuid, p_profile_id uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.link_telegram_lead_to_profile(p_lead_id uuid, p_profile_id uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.link_telegram_lead_to_profile(p_lead_id uuid, p_profile_id uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.link_telegram_profile(p_link_code text, p_telegram_id text, p_telegram_username text, p_telegram_first_name text, p_telegram_last_name text, p_telegram_photo_url text) TO service_role;
GRANT EXECUTE ON FUNCTION public.log_contact_form_access() TO anon;
GRANT EXECUTE ON FUNCTION public.log_contact_form_access() TO authenticated;
GRANT EXECUTE ON FUNCTION public.log_contact_form_access() TO service_role;
GRANT EXECUTE ON FUNCTION public.log_participant_status_change() TO anon;
GRANT EXECUTE ON FUNCTION public.log_participant_status_change() TO authenticated;
GRANT EXECUTE ON FUNCTION public.log_participant_status_change() TO service_role;
GRANT EXECUTE ON FUNCTION public.log_role_changes() TO anon;
GRANT EXECUTE ON FUNCTION public.log_role_changes() TO authenticated;
GRANT EXECUTE ON FUNCTION public.log_role_changes() TO service_role;
GRANT EXECUTE ON FUNCTION public.log_security_access(p_action text, p_table_name text, p_record_id uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.log_security_access(p_action text, p_table_name text, p_record_id uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.log_security_access(p_action text, p_table_name text, p_record_id uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.log_security_event(event_type text, user_id_param uuid, details jsonb) TO anon;
GRANT EXECUTE ON FUNCTION public.log_security_event(event_type text, user_id_param uuid, details jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.log_security_event(event_type text, user_id_param uuid, details jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.mask_email_secure(email_address text) TO anon;
GRANT EXECUTE ON FUNCTION public.mask_email_secure(email_address text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mask_email_secure(email_address text) TO service_role;
GRANT EXECUTE ON FUNCTION public.mask_participant_name(full_name text) TO anon;
GRANT EXECUTE ON FUNCTION public.mask_participant_name(full_name text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mask_participant_name(full_name text) TO service_role;
GRANT EXECUTE ON FUNCTION public.mask_phone_number(phone_number text) TO anon;
GRANT EXECUTE ON FUNCTION public.mask_phone_number(phone_number text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mask_phone_number(phone_number text) TO service_role;
GRANT EXECUTE ON FUNCTION public.mask_phone_secure(phone_number text) TO anon;
GRANT EXECUTE ON FUNCTION public.mask_phone_secure(phone_number text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mask_phone_secure(phone_number text) TO service_role;
GRANT EXECUTE ON FUNCTION public.normalize_phone(p_phone text) TO anon;
GRANT EXECUTE ON FUNCTION public.normalize_phone(p_phone text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.normalize_phone(p_phone text) TO service_role;
GRANT EXECUTE ON FUNCTION public.recalculate_all_ranks() TO anon;
GRANT EXECUTE ON FUNCTION public.recalculate_all_ranks() TO authenticated;
GRANT EXECUTE ON FUNCTION public.recalculate_all_ranks() TO service_role;
GRANT EXECUTE ON FUNCTION public.review_homework_submission(p_submission_id uuid, p_status text, p_admin_comment text) TO anon;
GRANT EXECUTE ON FUNCTION public.review_homework_submission(p_submission_id uuid, p_status text, p_admin_comment text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.review_homework_submission(p_submission_id uuid, p_status text, p_admin_comment text) TO service_role;
GRANT EXECUTE ON FUNCTION public.review_reward_request(p_request_id uuid, p_new_status text, p_admin_comment text) TO anon;
GRANT EXECUTE ON FUNCTION public.review_reward_request(p_request_id uuid, p_new_status text, p_admin_comment text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.review_reward_request(p_request_id uuid, p_new_status text, p_admin_comment text) TO service_role;
GRANT EXECUTE ON FUNCTION public.save_journal_entry(p_telegram_id text, p_entry_date date, p_day_type text, p_emotions jsonb, p_answers jsonb) TO anon;
GRANT EXECUTE ON FUNCTION public.save_journal_entry(p_telegram_id text, p_entry_date date, p_day_type text, p_emotions jsonb, p_answers jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.save_journal_entry(p_telegram_id text, p_entry_date date, p_day_type text, p_emotions jsonb, p_answers jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.server_challenge_checkin(p_user_id uuid, p_challenge_id uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.server_challenge_checkin(p_user_id uuid, p_challenge_id uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.server_challenge_checkin(p_user_id uuid, p_challenge_id uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.server_complete_mastermind_task(p_user_id uuid, p_task_id uuid, p_comment text, p_file_url text) TO anon;
GRANT EXECUTE ON FUNCTION public.server_complete_mastermind_task(p_user_id uuid, p_task_id uuid, p_comment text, p_file_url text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.server_complete_mastermind_task(p_user_id uuid, p_task_id uuid, p_comment text, p_file_url text) TO service_role;
GRANT EXECUTE ON FUNCTION public.server_create_mastermind_task(p_user_id uuid, p_title text, p_description text, p_deadline date) TO anon;
GRANT EXECUTE ON FUNCTION public.server_create_mastermind_task(p_user_id uuid, p_title text, p_description text, p_deadline date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.server_create_mastermind_task(p_user_id uuid, p_title text, p_description text, p_deadline date) TO service_role;
GRANT EXECUTE ON FUNCTION public.server_create_reward_request(p_user_id uuid, p_reward_id uuid, p_user_comment text) TO anon;
GRANT EXECUTE ON FUNCTION public.server_create_reward_request(p_user_id uuid, p_reward_id uuid, p_user_comment text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.server_create_reward_request(p_user_id uuid, p_reward_id uuid, p_user_comment text) TO service_role;
GRANT EXECUTE ON FUNCTION public.server_register_for_event(p_user_id uuid, p_schedule_id uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.server_register_for_event(p_user_id uuid, p_schedule_id uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.server_register_for_event(p_user_id uuid, p_schedule_id uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.server_submit_mastermind_entry(p_user_id uuid, p_summary text, p_my_tasks text) TO anon;
GRANT EXECUTE ON FUNCTION public.server_submit_mastermind_entry(p_user_id uuid, p_summary text, p_my_tasks text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.server_submit_mastermind_entry(p_user_id uuid, p_summary text, p_my_tasks text) TO service_role;
GRANT EXECUTE ON FUNCTION public.server_unregister_from_event(p_user_id uuid, p_schedule_id uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.server_unregister_from_event(p_user_id uuid, p_schedule_id uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.server_unregister_from_event(p_user_id uuid, p_schedule_id uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.submit_homework(p_telegram_id text, p_assignment_id uuid, p_content text) TO anon;
GRANT EXECUTE ON FUNCTION public.submit_homework(p_telegram_id text, p_assignment_id uuid, p_content text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.submit_homework(p_telegram_id text, p_assignment_id uuid, p_content text) TO service_role;
GRANT EXECUTE ON FUNCTION public.submit_homework(p_telegram_id text, p_assignment_id uuid, p_content text, p_file_url text) TO anon;
GRANT EXECUTE ON FUNCTION public.submit_homework(p_telegram_id text, p_assignment_id uuid, p_content text, p_file_url text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.submit_homework(p_telegram_id text, p_assignment_id uuid, p_content text, p_file_url text) TO service_role;
GRANT EXECUTE ON FUNCTION public.sync_public_profiles() TO anon;
GRANT EXECUTE ON FUNCTION public.sync_public_profiles() TO authenticated;
GRANT EXECUTE ON FUNCTION public.sync_public_profiles() TO service_role;
GRANT EXECUTE ON FUNCTION public.sync_public_profiles_from_leaderboard() TO anon;
GRANT EXECUTE ON FUNCTION public.sync_public_profiles_from_leaderboard() TO authenticated;
GRANT EXECUTE ON FUNCTION public.sync_public_profiles_from_leaderboard() TO service_role;
GRANT EXECUTE ON FUNCTION public.sync_testimonial_display_name() TO anon;
GRANT EXECUTE ON FUNCTION public.sync_testimonial_display_name() TO authenticated;
GRANT EXECUTE ON FUNCTION public.sync_testimonial_display_name() TO service_role;
GRANT EXECUTE ON FUNCTION public.sync_to_public_testimonials() TO anon;
GRANT EXECUTE ON FUNCTION public.sync_to_public_testimonials() TO authenticated;
GRANT EXECUTE ON FUNCTION public.sync_to_public_testimonials() TO service_role;
GRANT EXECUTE ON FUNCTION public.take_ascetic(p_telegram_id text, p_text text) TO anon;
GRANT EXECUTE ON FUNCTION public.take_ascetic(p_telegram_id text, p_text text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.take_ascetic(p_telegram_id text, p_text text) TO service_role;
GRANT EXECUTE ON FUNCTION public.trigger_recalculate_ranks() TO anon;
GRANT EXECUTE ON FUNCTION public.trigger_recalculate_ranks() TO authenticated;
GRANT EXECUTE ON FUNCTION public.trigger_recalculate_ranks() TO service_role;
GRANT EXECUTE ON FUNCTION public.trigger_update_leaderboard() TO anon;
GRANT EXECUTE ON FUNCTION public.trigger_update_leaderboard() TO authenticated;
GRANT EXECUTE ON FUNCTION public.trigger_update_leaderboard() TO service_role;
GRANT EXECUTE ON FUNCTION public.unlink_telegram_profile(p_user_id uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.unlink_telegram_profile(p_user_id uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.update_avatar_for_user(p_telegram_id text, p_avatar_url text) TO anon;
GRANT EXECUTE ON FUNCTION public.update_avatar_for_user(p_telegram_id text, p_avatar_url text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_avatar_for_user(p_telegram_id text, p_avatar_url text) TO service_role;
GRANT EXECUTE ON FUNCTION public.update_habit_completed_days() TO anon;
GRANT EXECUTE ON FUNCTION public.update_habit_completed_days() TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_habit_completed_days() TO service_role;
GRANT EXECUTE ON FUNCTION public.update_leaderboard_on_ascetic() TO anon;
GRANT EXECUTE ON FUNCTION public.update_leaderboard_on_ascetic() TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_leaderboard_on_ascetic() TO service_role;
GRANT EXECUTE ON FUNCTION public.update_participant_status(p_user_id uuid, p_new_status participant_status_type) TO anon;
GRANT EXECUTE ON FUNCTION public.update_participant_status(p_user_id uuid, p_new_status participant_status_type) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_participant_status(p_user_id uuid, p_new_status participant_status_type) TO service_role;
GRANT EXECUTE ON FUNCTION public.update_profile_for_user(p_telegram_id text, p_weight_kg integer, p_height_cm integer, p_date_of_birth date) TO anon;
GRANT EXECUTE ON FUNCTION public.update_profile_for_user(p_telegram_id text, p_weight_kg integer, p_height_cm integer, p_date_of_birth date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_profile_for_user(p_telegram_id text, p_weight_kg integer, p_height_cm integer, p_date_of_birth date) TO service_role;
GRANT EXECUTE ON FUNCTION public.update_timestamp_public_profiles() TO anon;
GRANT EXECUTE ON FUNCTION public.update_timestamp_public_profiles() TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_timestamp_public_profiles() TO service_role;
GRANT EXECUTE ON FUNCTION public.update_updated_at_column() TO anon;
GRANT EXECUTE ON FUNCTION public.update_updated_at_column() TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_updated_at_column() TO service_role;
GRANT EXECUTE ON FUNCTION public.update_user_leaderboard(user_uuid uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.update_user_leaderboard(user_uuid uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_user_leaderboard(user_uuid uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.validate_audit_entry() TO anon;
GRANT EXECUTE ON FUNCTION public.validate_audit_entry() TO authenticated;
GRANT EXECUTE ON FUNCTION public.validate_audit_entry() TO service_role;
GRANT EXECUTE ON FUNCTION public.validate_audit_log_entry(p_action text, p_table_name text, p_user_id uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.validate_audit_log_entry(p_action text, p_table_name text, p_user_id uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.validate_audit_log_entry(p_action text, p_table_name text, p_user_id uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.validate_contact_submission(p_name text, p_phone text, p_course text, p_social text) TO anon;
GRANT EXECUTE ON FUNCTION public.validate_contact_submission(p_name text, p_phone text, p_course text, p_social text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.validate_contact_submission(p_name text, p_phone text, p_course text, p_social text) TO service_role;
GRANT EXECUTE ON FUNCTION public.validate_referral_code(p_code text) TO anon;
GRANT EXECUTE ON FUNCTION public.validate_referral_code(p_code text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.validate_referral_code(p_code text) TO service_role;
GRANT EXECUTE ON FUNCTION public.validate_security_event_type() TO anon;
GRANT EXECUTE ON FUNCTION public.validate_security_event_type() TO authenticated;
GRANT EXECUTE ON FUNCTION public.validate_security_event_type() TO service_role;

-- ################ 08_rls_policies.sql ################

-- 08_rls_policies.sql — включение RLS на 80 таблицах и 194 политики.

ALTER TABLE public.achievement_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_access_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.application_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.application_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ascetic_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ascetic_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.broadcast_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.broadcast_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.broadcasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.challenge_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coin_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coin_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_rate_limit ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contract_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cooper_test_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crash_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.habit_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hero_races ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.homework_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.homework_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.intensive_streams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journal_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journal_emotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journal_prompts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leaderboard ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lectures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mastermind_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mastermind_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mastermind_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mastermind_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.moments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.participant_habits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.participant_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.participant_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.participant_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.public_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.public_testimonials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pyramid_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reward_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedule_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.streams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tactical_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.telegram_bot_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.telegram_bot_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.telegram_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.testimonials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.totems ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trainers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_totems ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weekly_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."аскезы_участников" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."кэмп_активности" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."тотемы_участников" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."участники" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access for achievement_types" ON public.achievement_types AS PERMISSIVE FOR SELECT TO public
  USING (true);

CREATE POLICY "Achievements are publicly readable" ON public.achievements AS PERMISSIVE FOR SELECT TO public
  USING (true);

CREATE POLICY "Activities are publicly viewable" ON public.activities AS PERMISSIVE FOR SELECT TO public
  USING (true);

CREATE POLICY "Admins can manage activities" ON public.activities AS PERMISSIVE FOR ALL TO public
  USING ((EXISTS ( SELECT 1
   FROM user_roles
  WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = ANY (ARRAY['admin'::user_role, 'super_admin'::user_role]))))));

CREATE POLICY "Users can insert their own checkins" ON public.activity_checkins AS PERMISSIVE FOR INSERT TO public
  WITH CHECK ((auth.uid() = user_id));

CREATE POLICY "Users can view their own checkins" ON public.activity_checkins AS PERMISSIVE FOR SELECT TO public
  USING ((auth.uid() = user_id));

CREATE POLICY "Super admins can view all sessions" ON public.admin_sessions AS PERMISSIVE FOR SELECT TO public
  USING (is_super_admin(auth.uid()));

CREATE POLICY "Users can view their own sessions" ON public.admin_sessions AS PERMISSIVE FOR SELECT TO public
  USING ((auth.uid() = user_id));

CREATE POLICY "Admins can add application notes" ON public.application_notes AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((is_admin(auth.uid()) AND (author_id = auth.uid())));

CREATE POLICY "Admins can view application notes" ON public.application_notes AS PERMISSIVE FOR SELECT TO authenticated
  USING (is_admin(auth.uid()));

CREATE POLICY "Authors or super admins can delete application notes" ON public.application_notes AS PERMISSIVE FOR DELETE TO authenticated
  USING ((is_admin(auth.uid()) AND ((author_id = auth.uid()) OR is_super_admin(auth.uid()))));

CREATE POLICY "Admins can create application reminders" ON public.application_reminders AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((is_admin(auth.uid()) AND (author_id = auth.uid())));

CREATE POLICY "Admins can delete application reminders" ON public.application_reminders AS PERMISSIVE FOR DELETE TO authenticated
  USING (is_admin(auth.uid()));

CREATE POLICY "Admins can update application reminders" ON public.application_reminders AS PERMISSIVE FOR UPDATE TO authenticated
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Admins can view application reminders" ON public.application_reminders AS PERMISSIVE FOR SELECT TO authenticated
  USING (is_admin(auth.uid()));

CREATE POLICY "Admins can create ascetic activities for any participant" ON public.ascetic_activities AS PERMISSIVE FOR INSERT TO public
  WITH CHECK ((EXISTS ( SELECT 1
   FROM user_roles
  WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = ANY (ARRAY['admin'::user_role, 'super_admin'::user_role]))))));

CREATE POLICY "Admins can update ascetic activities" ON public.ascetic_activities AS PERMISSIVE FOR UPDATE TO public
  USING ((EXISTS ( SELECT 1
   FROM user_roles
  WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = ANY (ARRAY['admin'::user_role, 'super_admin'::user_role, 'trainer'::user_role]))))));

CREATE POLICY "Trainers can view all ascetic activities" ON public.ascetic_activities AS PERMISSIVE FOR SELECT TO public
  USING ((EXISTS ( SELECT 1
   FROM user_roles
  WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = ANY (ARRAY['admin'::user_role, 'super_admin'::user_role, 'trainer'::user_role]))))));

CREATE POLICY "Users can insert their own ascetic activities" ON public.ascetic_activities AS PERMISSIVE FOR INSERT TO public
  WITH CHECK ((auth.uid() = user_id));

CREATE POLICY "Users can view their own ascetic activities" ON public.ascetic_activities AS PERMISSIVE FOR SELECT TO public
  USING ((auth.uid() = user_id));

CREATE POLICY "Ascetic types are publicly readable" ON public.ascetic_types AS PERMISSIVE FOR SELECT TO public
  USING ((is_active = true));

CREATE POLICY "Super admins can manage ascetic types" ON public.ascetic_types AS PERMISSIVE FOR ALL TO public
  USING (is_super_admin(auth.uid()))
  WITH CHECK (is_super_admin(auth.uid()));

CREATE POLICY "Secure audit log insertions" ON public.audit_log AS PERMISSIVE FOR INSERT TO public
  WITH CHECK (((((current_setting('request.jwt.claims'::text, true))::json ->> 'role'::text) = 'service_role'::text) OR ((auth.uid() IS NOT NULL) AND (current_setting('role'::text, true) = 'authenticated'::text))));

CREATE POLICY "Super admins can view audit logs" ON public.audit_log AS PERMISSIVE FOR SELECT TO public
  USING (is_super_admin(auth.uid()));

CREATE POLICY "Admins can create broadcasts" ON public.broadcast_messages AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Admins can delete broadcasts" ON public.broadcast_messages AS PERMISSIVE FOR DELETE TO authenticated
  USING (is_admin(auth.uid()));

CREATE POLICY "Admins can update broadcasts" ON public.broadcast_messages AS PERMISSIVE FOR UPDATE TO authenticated
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Admins can view broadcasts" ON public.broadcast_messages AS PERMISSIVE FOR SELECT TO authenticated
  USING (is_admin(auth.uid()));

CREATE POLICY "Admins manage broadcast_responses" ON public.broadcast_responses AS PERMISSIVE FOR ALL TO authenticated
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Admins manage broadcasts" ON public.broadcasts AS PERMISSIVE FOR ALL TO authenticated
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "challenge_entries_delete_own" ON public.challenge_entries AS PERMISSIVE FOR DELETE TO authenticated
  USING (((user_id = auth.uid()) OR is_super_admin(auth.uid())));

CREATE POLICY "challenge_entries_insert_own" ON public.challenge_entries AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((user_id = auth.uid()));

CREATE POLICY "challenge_entries_select_own" ON public.challenge_entries AS PERMISSIVE FOR SELECT TO authenticated
  USING (((user_id = auth.uid()) OR is_admin(auth.uid()) OR is_super_admin(auth.uid())));

CREATE POLICY "Admins can delete challenges" ON public.challenges AS PERMISSIVE FOR DELETE TO authenticated
  USING ((is_admin(auth.uid()) OR is_super_admin(auth.uid())));

CREATE POLICY "Admins can insert challenges" ON public.challenges AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((is_admin(auth.uid()) OR is_super_admin(auth.uid())));

CREATE POLICY "Admins can update challenges" ON public.challenges AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((is_admin(auth.uid()) OR is_super_admin(auth.uid())))
  WITH CHECK ((is_admin(auth.uid()) OR is_super_admin(auth.uid())));

CREATE POLICY "Challenges are publicly readable" ON public.challenges AS PERMISSIVE FOR SELECT TO public
  USING (true);

CREATE POLICY "challenges_read" ON public.challenges AS PERMISSIVE FOR SELECT TO public
  USING (true);

CREATE POLICY "Admins manage coin rules" ON public.coin_rules AS PERMISSIVE FOR ALL TO authenticated
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Authenticated can read active coin rules" ON public.coin_rules AS PERMISSIVE FOR SELECT TO authenticated
  USING (((is_active = true) OR is_admin(auth.uid())));

CREATE POLICY "Admins manage coin transactions" ON public.coin_transactions AS PERMISSIVE FOR ALL TO authenticated
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Admins view all coin transactions" ON public.coin_transactions AS PERMISSIVE FOR SELECT TO authenticated
  USING (is_admin(auth.uid()));

CREATE POLICY "Users view own coin transactions" ON public.coin_transactions AS PERMISSIVE FOR SELECT TO authenticated
  USING ((auth.uid() = user_id));

CREATE POLICY "coin_transactions: only admins DELETE" ON public.coin_transactions AS RESTRICTIVE FOR DELETE TO authenticated
  USING (is_admin(auth.uid()));

CREATE POLICY "coin_transactions: only admins INSERT" ON public.coin_transactions AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "coin_transactions: only admins UPDATE" ON public.coin_transactions AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Admin only read access to contact submissions" ON public.contact_submissions AS PERMISSIVE FOR SELECT TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM user_roles
  WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = ANY (ARRAY['admin'::user_role, 'super_admin'::user_role]))))));

CREATE POLICY "Admins can delete contact submissions" ON public.contact_submissions AS PERMISSIVE FOR DELETE TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM user_roles
  WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = ANY (ARRAY['admin'::user_role, 'super_admin'::user_role]))))));

CREATE POLICY "Admins can update contact submissions" ON public.contact_submissions AS PERMISSIVE FOR UPDATE TO public
  USING ((EXISTS ( SELECT 1
   FROM user_roles
  WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = ANY (ARRAY['admin'::user_role, 'super_admin'::user_role]))))))
  WITH CHECK ((((processed = true) AND (processed_by = auth.uid())) OR (processed = false)));

CREATE POLICY "Allow validated contact form submissions" ON public.contact_submissions AS PERMISSIVE FOR INSERT TO public
  WITH CHECK ((validate_contact_submission(name, phone, course, social) AND (length(name) <= 100) AND (length(phone) <= 20) AND (length(course) <= 100) AND ((social IS NULL) OR (length(social) <= 200))));

CREATE POLICY "Deny public read access to contact submissions" ON public.contact_submissions AS PERMISSIVE FOR SELECT TO anon, authenticated
  USING (false);

CREATE POLICY "Admins can manage content blocks" ON public.content_blocks AS PERMISSIVE FOR ALL TO public
  USING (is_admin(auth.uid()));

CREATE POLICY "Content blocks are publicly readable" ON public.content_blocks AS PERMISSIVE FOR SELECT TO public
  USING ((is_active = true));

CREATE POLICY "Admins can view all contract data" ON public.contract_data AS PERMISSIVE FOR SELECT TO public
  USING (is_admin(auth.uid()));

CREATE POLICY "Users can insert own contract data" ON public.contract_data AS PERMISSIVE FOR INSERT TO public
  WITH CHECK ((auth.uid() = user_id));

CREATE POLICY "Users can update own contract data" ON public.contract_data AS PERMISSIVE FOR UPDATE TO public
  USING ((auth.uid() = user_id));

CREATE POLICY "Users can view own contract data" ON public.contract_data AS PERMISSIVE FOR SELECT TO public
  USING ((auth.uid() = user_id));

CREATE POLICY "Admins can view all contracts" ON public.contracts AS PERMISSIVE FOR SELECT TO public
  USING (is_admin(auth.uid()));

CREATE POLICY "Service role can manage contracts" ON public.contracts AS PERMISSIVE FOR ALL TO public
  USING (((auth.jwt() ->> 'role'::text) = 'service_role'::text));

CREATE POLICY "Users can view own contracts" ON public.contracts AS PERMISSIVE FOR SELECT TO public
  USING ((auth.uid() = user_id));

CREATE POLICY "Admins can create cooper test results for any participant" ON public.cooper_test_results AS PERMISSIVE FOR INSERT TO public
  WITH CHECK ((EXISTS ( SELECT 1
   FROM user_roles
  WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = ANY (ARRAY['admin'::user_role, 'super_admin'::user_role, 'trainer'::user_role]))))));

CREATE POLICY "Admins can delete cooper test results" ON public.cooper_test_results AS PERMISSIVE FOR DELETE TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM user_roles
  WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = ANY (ARRAY['admin'::user_role, 'super_admin'::user_role, 'trainer'::user_role]))))));

CREATE POLICY "Admins can update cooper test results" ON public.cooper_test_results AS PERMISSIVE FOR UPDATE TO public
  USING ((EXISTS ( SELECT 1
   FROM user_roles
  WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = ANY (ARRAY['admin'::user_role, 'super_admin'::user_role, 'trainer'::user_role]))))));

CREATE POLICY "Public can view Cooper test results for club residents" ON public.cooper_test_results AS PERMISSIVE FOR SELECT TO public
  USING (((verified = true) AND (EXISTS ( SELECT 1
   FROM public_profiles
  WHERE ((public_profiles.user_id = cooper_test_results.user_id) AND (public_profiles.participant_status = 'club_resident'::participant_status_type))))));

CREATE POLICY "Public can view Cooper test results for intensive active partic" ON public.cooper_test_results AS PERMISSIVE FOR SELECT TO public
  USING (((verified = true) AND (EXISTS ( SELECT 1
   FROM public_profiles
  WHERE ((public_profiles.user_id = cooper_test_results.user_id) AND (public_profiles.participant_status = 'intensive_active'::participant_status_type))))));

CREATE POLICY "Public can view verified Cooper test results for visible partic" ON public.cooper_test_results AS PERMISSIVE FOR SELECT TO public
  USING (((verified = true) AND (EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.user_id = cooper_test_results.user_id) AND (profiles.approved = true) AND (COALESCE(profiles.leaderboard_visible, true) = true) AND (COALESCE(profiles.profile_private, false) = false))))));

CREATE POLICY "Trainers can view all cooper test results" ON public.cooper_test_results AS PERMISSIVE FOR SELECT TO public
  USING ((EXISTS ( SELECT 1
   FROM user_roles
  WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = ANY (ARRAY['admin'::user_role, 'super_admin'::user_role, 'trainer'::user_role]))))));

CREATE POLICY "Users can insert their own cooper test results" ON public.cooper_test_results AS PERMISSIVE FOR INSERT TO public
  WITH CHECK ((auth.uid() = user_id));

CREATE POLICY "Users can view their own cooper test results" ON public.cooper_test_results AS PERMISSIVE FOR SELECT TO public
  USING ((auth.uid() = user_id));

CREATE POLICY "Admins can manage all crash test data" ON public.crash_tests AS PERMISSIVE FOR ALL TO public
  USING (is_admin(auth.uid()));

CREATE POLICY "Public can view crash tests of approved participants" ON public.crash_tests AS PERMISSIVE FOR SELECT TO anon, authenticated
  USING (((verified = true) AND is_public_participant(user_id)));

CREATE POLICY "Users can insert own crash tests" ON public.crash_tests AS PERMISSIVE FOR INSERT TO public
  WITH CHECK ((auth.uid() = user_id));

CREATE POLICY "Users can view own crash tests" ON public.crash_tests AS PERMISSIVE FOR SELECT TO public
  USING ((auth.uid() = user_id));

CREATE POLICY "Admins can view all habit progress" ON public.habit_progress AS PERMISSIVE FOR SELECT TO public
  USING ((EXISTS ( SELECT 1
   FROM user_roles
  WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = ANY (ARRAY['admin'::user_role, 'super_admin'::user_role, 'trainer'::user_role]))))));

CREATE POLICY "Users can manage their own habit progress" ON public.habit_progress AS PERMISSIVE FOR ALL TO public
  USING ((auth.uid() = user_id));

CREATE POLICY "Admins can manage all hero race data" ON public.hero_races AS PERMISSIVE FOR ALL TO public
  USING (is_admin(auth.uid()));

CREATE POLICY "Users can insert own hero races" ON public.hero_races AS PERMISSIVE FOR INSERT TO public
  WITH CHECK ((auth.uid() = user_id));

CREATE POLICY "Users can view own hero races" ON public.hero_races AS PERMISSIVE FOR SELECT TO public
  USING ((auth.uid() = user_id));

CREATE POLICY "Admins manage all homework assignments" ON public.homework_assignments AS PERMISSIVE FOR ALL TO authenticated
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Intensive participants view their assignments" ON public.homework_assignments AS PERMISSIVE FOR SELECT TO authenticated
  USING (((is_active = true) AND ((target_user_id = auth.uid()) OR ((stream_id IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.user_id = auth.uid()) AND (p.current_stream_id = homework_assignments.stream_id) AND (p.participant_status = 'intensive_active'::participant_status_type))))))));

CREATE POLICY "Admins can manage all homework data" ON public.homework_submissions AS PERMISSIVE FOR ALL TO public
  USING (is_admin(auth.uid()));

CREATE POLICY "Users can insert own homework" ON public.homework_submissions AS PERMISSIVE FOR INSERT TO public
  WITH CHECK ((auth.uid() = user_id));

CREATE POLICY "Users can view own homework" ON public.homework_submissions AS PERMISSIVE FOR SELECT TO public
  USING ((auth.uid() = user_id));

CREATE POLICY "Allow public read access for active streams" ON public.intensive_streams AS PERMISSIVE FOR SELECT TO public
  USING ((is_active = true));

CREATE POLICY "Admins view all answers" ON public.journal_answers AS PERMISSIVE FOR SELECT TO authenticated
  USING (is_admin(auth.uid()));

CREATE POLICY "Users manage own answers" ON public.journal_answers AS PERMISSIVE FOR ALL TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM journal_entries e
  WHERE ((e.id = journal_answers.entry_id) AND (e.user_id = auth.uid())))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM journal_entries e
  WHERE ((e.id = journal_answers.entry_id) AND (e.user_id = auth.uid())))));

CREATE POLICY "Admins view all emotions" ON public.journal_emotions AS PERMISSIVE FOR SELECT TO authenticated
  USING (is_admin(auth.uid()));

CREATE POLICY "Users manage own emotions" ON public.journal_emotions AS PERMISSIVE FOR ALL TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM journal_entries e
  WHERE ((e.id = journal_emotions.entry_id) AND (e.user_id = auth.uid())))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM journal_entries e
  WHERE ((e.id = journal_emotions.entry_id) AND (e.user_id = auth.uid())))));

CREATE POLICY "Admins view all entries" ON public.journal_entries AS PERMISSIVE FOR SELECT TO authenticated
  USING (is_admin(auth.uid()));

CREATE POLICY "Users manage own entries" ON public.journal_entries AS PERMISSIVE FOR ALL TO authenticated
  USING ((auth.uid() = user_id))
  WITH CHECK ((auth.uid() = user_id));

CREATE POLICY "Admins manage prompts" ON public.journal_prompts AS PERMISSIVE FOR ALL TO authenticated
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Prompts viewable by authenticated" ON public.journal_prompts AS PERMISSIVE FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admins can manage leaderboard" ON public.leaderboard AS PERMISSIVE FOR ALL TO authenticated
  USING (is_admin(auth.uid()));

CREATE POLICY "Anon can view leaderboard via public_profiles" ON public.leaderboard AS PERMISSIVE FOR SELECT TO anon
  USING ((EXISTS ( SELECT 1
   FROM public_profiles
  WHERE (public_profiles.user_id = leaderboard.user_id))));

CREATE POLICY "Authenticated users can view public leaderboard entries" ON public.leaderboard AS PERMISSIVE FOR SELECT TO authenticated
  USING (((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.user_id = leaderboard.user_id) AND (profiles.leaderboard_visible = true)))) OR (user_id = auth.uid())));

CREATE POLICY "Admins can manage all lecture data" ON public.lectures AS PERMISSIVE FOR ALL TO public
  USING (is_admin(auth.uid()));

CREATE POLICY "Users can insert own lectures" ON public.lectures AS PERMISSIVE FOR INSERT TO public
  WITH CHECK ((auth.uid() = user_id));

CREATE POLICY "Users can view own lectures" ON public.lectures AS PERMISSIVE FOR SELECT TO public
  USING ((auth.uid() = user_id));

CREATE POLICY "mm_entries_admin_write" ON public.mastermind_entries AS PERMISSIVE FOR ALL TO authenticated
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "mm_entries_insert" ON public.mastermind_entries AS PERMISSIVE FOR INSERT TO public
  WITH CHECK (true);

CREATE POLICY "mm_entries_read" ON public.mastermind_entries AS PERMISSIVE FOR SELECT TO public
  USING (true);

CREATE POLICY "mm_groups_read" ON public.mastermind_groups AS PERMISSIVE FOR SELECT TO public
  USING (true);

CREATE POLICY "mm_members_admin_write" ON public.mastermind_members AS PERMISSIVE FOR ALL TO authenticated
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "mm_members_read" ON public.mastermind_members AS PERMISSIVE FOR SELECT TO public
  USING (true);

CREATE POLICY "mm_tasks_admin_write" ON public.mastermind_tasks AS PERMISSIVE FOR ALL TO authenticated
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "mm_tasks_read" ON public.mastermind_tasks AS PERMISSIVE FOR SELECT TO public
  USING (true);

CREATE POLICY "mm_tasks_update" ON public.mastermind_tasks AS PERMISSIVE FOR UPDATE TO public
  USING (true);

CREATE POLICY "Admins manage all materials" ON public.materials AS PERMISSIVE FOR ALL TO authenticated
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Members view available materials" ON public.materials AS PERMISSIVE FOR SELECT TO authenticated
  USING (((is_active = true) AND (is_admin(auth.uid()) OR (EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.user_id = auth.uid()) AND ((materials.available_to = 'all'::text) OR ((materials.available_to = 'intensive'::text) AND (p.participant_status = 'intensive_active'::participant_status_type)) OR ((materials.available_to = 'club'::text) AND (p.participant_status = 'club_resident'::participant_status_type))) AND ((materials.stream_id IS NULL) OR (materials.stream_id = p.current_stream_id))))))));

CREATE POLICY "Admins can manage moments" ON public.moments AS PERMISSIVE FOR ALL TO public
  USING (is_admin(auth.uid()));

CREATE POLICY "Moments are publicly readable" ON public.moments AS PERMISSIVE FOR SELECT TO public
  USING ((is_active = true));

CREATE POLICY "Users can update their own notifications" ON public.notifications AS PERMISSIVE FOR UPDATE TO public
  USING ((auth.uid() = user_id));

CREATE POLICY "Users can view their own notifications" ON public.notifications AS PERMISSIVE FOR SELECT TO public
  USING ((auth.uid() = user_id));

CREATE POLICY "Admins can manage all habits" ON public.participant_habits AS PERMISSIVE FOR ALL TO public
  USING ((EXISTS ( SELECT 1
   FROM user_roles
  WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = ANY (ARRAY['admin'::user_role, 'super_admin'::user_role]))))));

CREATE POLICY "Admins can view all habits" ON public.participant_habits AS PERMISSIVE FOR SELECT TO public
  USING ((EXISTS ( SELECT 1
   FROM user_roles
  WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = ANY (ARRAY['admin'::user_role, 'super_admin'::user_role, 'trainer'::user_role]))))));

CREATE POLICY "Users can insert their own habits" ON public.participant_habits AS PERMISSIVE FOR INSERT TO public
  WITH CHECK ((auth.uid() = user_id));

CREATE POLICY "Users can update their own habits" ON public.participant_habits AS PERMISSIVE FOR UPDATE TO public
  USING ((auth.uid() = user_id));

CREATE POLICY "Users can view their own habits" ON public.participant_habits AS PERMISSIVE FOR SELECT TO public
  USING ((auth.uid() = user_id));

CREATE POLICY "Admins manage participant_notes" ON public.participant_notes AS PERMISSIVE FOR ALL TO authenticated
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Admins manage participant_status_history" ON public.participant_status_history AS PERMISSIVE FOR ALL TO authenticated
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Admins manage participant_tags" ON public.participant_tags AS PERMISSIVE FOR ALL TO authenticated
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Admins manage profile_tags" ON public.profile_tags AS PERMISSIVE FOR ALL TO authenticated
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Admins can update any profile" ON public.profiles AS PERMISSIVE FOR UPDATE TO public
  USING (is_admin(auth.uid()));

CREATE POLICY "Admins can view all profiles" ON public.profiles AS PERMISSIVE FOR SELECT TO public
  USING (is_admin(auth.uid()));

CREATE POLICY "Block anonymous access to profiles" ON public.profiles AS RESTRICTIVE FOR ALL TO anon
  USING (false)
  WITH CHECK (false);

CREATE POLICY "Users can insert their own profile" ON public.profiles AS PERMISSIVE FOR INSERT TO public
  WITH CHECK ((auth.uid() = user_id));

CREATE POLICY "Users can update their own profile" ON public.profiles AS PERMISSIVE FOR UPDATE TO public
  USING ((auth.uid() = user_id));

CREATE POLICY "Users can view their own profile" ON public.profiles AS PERMISSIVE FOR SELECT TO public
  USING ((auth.uid() = user_id));

CREATE POLICY "Public can read public profiles" ON public.public_profiles AS PERMISSIVE FOR SELECT TO public
  USING (true);

CREATE POLICY "Public testimonials are readable by everyone" ON public.public_testimonials AS PERMISSIVE FOR SELECT TO public
  USING (true);

CREATE POLICY "Admins manage pyramid levels" ON public.pyramid_levels AS PERMISSIVE FOR ALL TO authenticated
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Authenticated can view pyramid levels" ON public.pyramid_levels AS PERMISSIVE FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admins can delete leads" ON public.referral_leads AS PERMISSIVE FOR DELETE TO authenticated
  USING (is_admin(auth.uid()));

CREATE POLICY "Admins can update leads" ON public.referral_leads AS PERMISSIVE FOR UPDATE TO authenticated
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Admins can view all leads" ON public.referral_leads AS PERMISSIVE FOR SELECT TO authenticated
  USING (is_admin(auth.uid()));

CREATE POLICY "Anyone can submit referral lead with valid code" ON public.referral_leads AS PERMISSIVE FOR INSERT TO anon, authenticated
  WITH CHECK (((bonus_awarded = false) AND (status = 'new'::text) AND ((length(TRIM(BOTH FROM name)) >= 2) AND (length(TRIM(BOTH FROM name)) <= 100)) AND ((phone IS NULL) OR ((length(phone) >= 5) AND (length(phone) <= 30))) AND ((telegram IS NULL) OR (length(telegram) <= 100)) AND ((comment IS NULL) OR (length(comment) <= 1000)) AND (EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.user_id = referral_leads.referrer_user_id) AND (p.referral_code = referral_leads.referral_code) AND (p.referral_code IS NOT NULL))))));

CREATE POLICY "Referrer can view own leads" ON public.referral_leads AS PERMISSIVE FOR SELECT TO authenticated
  USING ((auth.uid() = referrer_user_id));

CREATE POLICY "Admins manage settings" ON public.referral_settings AS PERMISSIVE FOR ALL TO authenticated
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Settings readable by anon for join page" ON public.referral_settings AS PERMISSIVE FOR SELECT TO anon
  USING (true);

CREATE POLICY "Settings readable by authenticated" ON public.referral_settings AS PERMISSIVE FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admins manage all reward requests" ON public.reward_requests AS PERMISSIVE FOR ALL TO authenticated
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Users view own reward requests" ON public.reward_requests AS PERMISSIVE FOR SELECT TO authenticated
  USING ((auth.uid() = user_id));

CREATE POLICY "Admins manage rewards" ON public.rewards AS PERMISSIVE FOR ALL TO authenticated
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Club residents view active rewards" ON public.rewards AS PERMISSIVE FOR SELECT TO authenticated
  USING (((is_active = true) AND (EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.user_id = auth.uid()) AND (p.participant_status = 'club_resident'::participant_status_type))))));

CREATE POLICY "Super admins can view role audit logs" ON public.role_audit_log AS PERMISSIVE FOR SELECT TO authenticated
  USING (is_super_admin(auth.uid()));

CREATE POLICY "Club residents can register for club schedules" ON public.schedule_participants AS PERMISSIVE FOR INSERT TO public
  WITH CHECK (((auth.uid() = user_id) AND (is_club_resident(auth.uid()) OR is_admin(auth.uid()))));

CREATE POLICY "Trainers can view all schedule participants" ON public.schedule_participants AS PERMISSIVE FOR SELECT TO public
  USING ((EXISTS ( SELECT 1
   FROM user_roles
  WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = ANY (ARRAY['admin'::user_role, 'super_admin'::user_role, 'trainer'::user_role]))))));

CREATE POLICY "Users can view their own schedule participation" ON public.schedule_participants AS PERMISSIVE FOR SELECT TO public
  USING ((auth.uid() = user_id));

CREATE POLICY "admins_delete_any_participation" ON public.schedule_participants AS PERMISSIVE FOR DELETE TO public
  USING ((EXISTS ( SELECT 1
   FROM user_roles
  WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = ANY (ARRAY['admin'::user_role, 'super_admin'::user_role, 'trainer'::user_role]))))));

CREATE POLICY "users_delete_own_participation" ON public.schedule_participants AS PERMISSIVE FOR DELETE TO public
  USING ((auth.uid() = user_id));

CREATE POLICY "Admins and trainers can manage schedules" ON public.schedules AS PERMISSIVE FOR ALL TO authenticated
  USING ((is_admin(auth.uid()) OR has_role(auth.uid(), 'trainer'::user_role)))
  WITH CHECK ((is_admin(auth.uid()) OR has_role(auth.uid(), 'trainer'::user_role)));

CREATE POLICY "Club schedules are viewable by club residents" ON public.schedules AS PERMISSIVE FOR SELECT TO public
  USING (((schedule_type = 'club'::schedule_type) AND (is_active = true) AND (is_club_resident(auth.uid()) OR is_admin(auth.uid()))));

CREATE POLICY "Intensive schedules are publicly viewable" ON public.schedules AS PERMISSIVE FOR SELECT TO public
  USING (((schedule_type = 'intensive'::schedule_type) AND (is_active = true)));

CREATE POLICY "Admins can manage streams" ON public.streams AS PERMISSIVE FOR ALL TO public
  USING ((EXISTS ( SELECT 1
   FROM user_roles
  WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = ANY (ARRAY['admin'::user_role, 'super_admin'::user_role]))))));

CREATE POLICY "Streams are publicly viewable" ON public.streams AS PERMISSIVE FOR SELECT TO public
  USING (true);

CREATE POLICY "Admins can manage all tactical data" ON public.tactical_sessions AS PERMISSIVE FOR ALL TO public
  USING (is_admin(auth.uid()));

CREATE POLICY "Users can insert own tactical sessions" ON public.tactical_sessions AS PERMISSIVE FOR INSERT TO public
  WITH CHECK ((auth.uid() = user_id));

CREATE POLICY "Users can view own tactical sessions" ON public.tactical_sessions AS PERMISSIVE FOR SELECT TO public
  USING ((auth.uid() = user_id));

CREATE POLICY "super_admin_select_bot_logs" ON public.telegram_bot_logs AS PERMISSIVE FOR SELECT TO public
  USING (is_super_admin(auth.uid()));

CREATE POLICY "Admins can update telegram leads" ON public.telegram_leads AS PERMISSIVE FOR UPDATE TO authenticated
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Admins can view telegram leads" ON public.telegram_leads AS PERMISSIVE FOR SELECT TO authenticated
  USING (is_admin(auth.uid()));

CREATE POLICY "Admins can manage testimonials" ON public.testimonials AS PERMISSIVE FOR ALL TO public
  USING (is_admin(auth.uid()));

CREATE POLICY "Admins can view all testimonial data" ON public.testimonials AS PERMISSIVE FOR SELECT TO public
  USING (is_admin(auth.uid()));

CREATE POLICY "Admins can manage totems" ON public.totems AS PERMISSIVE FOR ALL TO public
  USING (is_admin(auth.uid()));

CREATE POLICY "Totems are publicly readable" ON public.totems AS PERMISSIVE FOR SELECT TO public
  USING (true);

CREATE POLICY "Trainers are publicly readable" ON public.trainers AS PERMISSIVE FOR SELECT TO public
  USING (true);

CREATE POLICY "Training programs are publicly readable" ON public.training_programs AS PERMISSIVE FOR SELECT TO public
  USING (true);

CREATE POLICY "Admins can manage all training sessions" ON public.training_sessions AS PERMISSIVE FOR ALL TO public
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Users can create their own training sessions" ON public.training_sessions AS PERMISSIVE FOR INSERT TO public
  WITH CHECK ((auth.uid() = user_id));

CREATE POLICY "Users can insert their own training sessions" ON public.training_sessions AS PERMISSIVE FOR INSERT TO public
  WITH CHECK ((auth.uid() = user_id));

CREATE POLICY "Users can update their own training sessions" ON public.training_sessions AS PERMISSIVE FOR UPDATE TO public
  USING ((auth.uid() = user_id))
  WITH CHECK ((auth.uid() = user_id));

CREATE POLICY "Users can view their own training sessions" ON public.training_sessions AS PERMISSIVE FOR SELECT TO public
  USING ((auth.uid() = user_id));

CREATE POLICY "Users can view their own achievements" ON public.user_achievements AS PERMISSIVE FOR SELECT TO public
  USING ((auth.uid() = user_id));

CREATE POLICY "Admins manage user activities" ON public.user_activities AS PERMISSIVE FOR ALL TO authenticated
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Trainers can view all user activities" ON public.user_activities AS PERMISSIVE FOR SELECT TO public
  USING ((EXISTS ( SELECT 1
   FROM user_roles
  WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = ANY (ARRAY['admin'::user_role, 'super_admin'::user_role, 'trainer'::user_role]))))));

CREATE POLICY "Users can insert their own activities" ON public.user_activities AS PERMISSIVE FOR INSERT TO public
  WITH CHECK ((auth.uid() = user_id));

CREATE POLICY "Users can view their own activities" ON public.user_activities AS PERMISSIVE FOR SELECT TO public
  USING ((auth.uid() = user_id));

CREATE POLICY "Users can join challenges" ON public.user_challenges AS PERMISSIVE FOR INSERT TO public
  WITH CHECK ((auth.uid() = user_id));

CREATE POLICY "Users can view their own challenge participation" ON public.user_challenges AS PERMISSIVE FOR SELECT TO public
  USING ((auth.uid() = user_id));

CREATE POLICY "Admins can manage user points" ON public.user_points AS PERMISSIVE FOR ALL TO public
  USING (is_admin(auth.uid()));

CREATE POLICY "Users can view own points" ON public.user_points AS PERMISSIVE FOR SELECT TO public
  USING ((auth.uid() = user_id));

CREATE POLICY "Only super admins can assign roles" ON public.user_roles AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (is_super_admin(auth.uid()));

CREATE POLICY "Super admins can manage user roles" ON public.user_roles AS PERMISSIVE FOR ALL TO authenticated
  USING (is_super_admin(auth.uid()));

CREATE POLICY "Users can view their own roles" ON public.user_roles AS PERMISSIVE FOR SELECT TO public
  USING ((auth.uid() = user_id));

CREATE POLICY "Admins can assign totems" ON public.user_totems AS PERMISSIVE FOR ALL TO public
  USING ((EXISTS ( SELECT 1
   FROM user_roles
  WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = ANY (ARRAY['admin'::user_role, 'super_admin'::user_role]))))));

CREATE POLICY "Admins can view all totems" ON public.user_totems AS PERMISSIVE FOR SELECT TO public
  USING ((EXISTS ( SELECT 1
   FROM user_roles
  WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = ANY (ARRAY['admin'::user_role, 'super_admin'::user_role]))))));

CREATE POLICY "Public can view totems of approved participants" ON public.user_totems AS PERMISSIVE FOR SELECT TO anon, authenticated
  USING (is_public_participant(user_id));

CREATE POLICY "Users can view their own totems" ON public.user_totems AS PERMISSIVE FOR SELECT TO public
  USING ((auth.uid() = user_id));

CREATE POLICY "Admins manage weekly summaries" ON public.weekly_summaries AS PERMISSIVE FOR ALL TO public
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Users can manage their own ascetics" ON public."аскезы_участников" AS PERMISSIVE FOR ALL TO public
  USING ((participant_id IN ( SELECT "участники".id
   FROM "участники"
  WHERE ("участники".user_id = auth.uid()))));

CREATE POLICY "Users can view their own kamp activities" ON public."кэмп_активности" AS PERMISSIVE FOR SELECT TO public
  USING ((participant_id IN ( SELECT "участники".id
   FROM "участники"
  WHERE ("участники".user_id = auth.uid()))));

CREATE POLICY "Users can view their own totems" ON public."тотемы_участников" AS PERMISSIVE FOR SELECT TO public
  USING ((participant_id IN ( SELECT "участники".id
   FROM "участники"
  WHERE ("участники".user_id = auth.uid()))));

CREATE POLICY "Users can update their own participant" ON public."участники" AS PERMISSIVE FOR UPDATE TO public
  USING ((auth.uid() = user_id));

CREATE POLICY "Users can view their own participant" ON public."участники" AS PERMISSIVE FOR SELECT TO public
  USING ((auth.uid() = user_id));

-- ################ 10_storage.sql ################

-- 10_storage.sql — 38 RLS-политик storage.objects.
-- Бакеты создаются ОТДЕЛЬНО (см. README, раздел «Ручные действия»).

CREATE POLICY "Admins can delete content media" ON storage.objects AS PERMISSIVE FOR DELETE TO public
  USING (((bucket_id = 'content'::text) AND is_admin(auth.uid())));

CREATE POLICY "Admins can delete moments media" ON storage.objects AS PERMISSIVE FOR DELETE TO public
  USING (((bucket_id = 'moments'::text) AND is_admin(auth.uid())));

CREATE POLICY "Admins can delete pyramid materials" ON storage.objects AS PERMISSIVE FOR DELETE TO authenticated
  USING (((bucket_id = 'pyramid-materials'::text) AND is_admin(auth.uid())));

CREATE POLICY "Admins can delete testimonials media" ON storage.objects AS PERMISSIVE FOR DELETE TO public
  USING (((bucket_id = 'testimonials'::text) AND is_admin(auth.uid())));

CREATE POLICY "Admins can insert pyramid materials" ON storage.objects AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (((bucket_id = 'pyramid-materials'::text) AND is_admin(auth.uid())));

CREATE POLICY "Admins can update content media" ON storage.objects AS PERMISSIVE FOR UPDATE TO public
  USING (((bucket_id = 'content'::text) AND is_admin(auth.uid())));

CREATE POLICY "Admins can update moments media" ON storage.objects AS PERMISSIVE FOR UPDATE TO public
  USING (((bucket_id = 'moments'::text) AND is_admin(auth.uid())));

CREATE POLICY "Admins can update pyramid materials" ON storage.objects AS PERMISSIVE FOR UPDATE TO authenticated
  USING (((bucket_id = 'pyramid-materials'::text) AND is_admin(auth.uid())))
  WITH CHECK (((bucket_id = 'pyramid-materials'::text) AND is_admin(auth.uid())));

CREATE POLICY "Admins can update testimonials media" ON storage.objects AS PERMISSIVE FOR UPDATE TO public
  USING (((bucket_id = 'testimonials'::text) AND is_admin(auth.uid())));

CREATE POLICY "Admins can upload content media" ON storage.objects AS PERMISSIVE FOR INSERT TO public
  WITH CHECK (((bucket_id = 'content'::text) AND is_admin(auth.uid())));

CREATE POLICY "Admins can upload moments media" ON storage.objects AS PERMISSIVE FOR INSERT TO public
  WITH CHECK (((bucket_id = 'moments'::text) AND is_admin(auth.uid())));

CREATE POLICY "Admins can upload testimonials media" ON storage.objects AS PERMISSIVE FOR INSERT TO public
  WITH CHECK (((bucket_id = 'testimonials'::text) AND is_admin(auth.uid())));

CREATE POLICY "Admins delete assignment files" ON storage.objects AS PERMISSIVE FOR DELETE TO authenticated
  USING (((bucket_id = 'homework-files'::text) AND ((storage.foldername(name))[1] = 'assignments'::text) AND (has_role(auth.uid(), 'admin'::user_role) OR has_role(auth.uid(), 'super_admin'::user_role))));

CREATE POLICY "Admins delete reward images" ON storage.objects AS PERMISSIVE FOR DELETE TO authenticated
  USING (((bucket_id = 'content'::text) AND ((storage.foldername(name))[1] = 'rewards'::text) AND is_admin(auth.uid())));

CREATE POLICY "Admins manage broadcast files delete" ON storage.objects AS PERMISSIVE FOR DELETE TO authenticated
  USING (((bucket_id = 'broadcasts'::text) AND is_admin(auth.uid())));

CREATE POLICY "Admins manage broadcast files insert" ON storage.objects AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (((bucket_id = 'broadcasts'::text) AND is_admin(auth.uid())));

CREATE POLICY "Admins manage broadcast files select" ON storage.objects AS PERMISSIVE FOR SELECT TO authenticated
  USING (((bucket_id = 'broadcasts'::text) AND is_admin(auth.uid())));

CREATE POLICY "Admins manage broadcast files update" ON storage.objects AS PERMISSIVE FOR UPDATE TO authenticated
  USING (((bucket_id = 'broadcasts'::text) AND is_admin(auth.uid())));

CREATE POLICY "Admins read all homework files" ON storage.objects AS PERMISSIVE FOR SELECT TO authenticated
  USING (((bucket_id = 'homework-files'::text) AND (has_role(auth.uid(), 'admin'::user_role) OR has_role(auth.uid(), 'super_admin'::user_role))));

CREATE POLICY "Admins update assignment files" ON storage.objects AS PERMISSIVE FOR UPDATE TO authenticated
  USING (((bucket_id = 'homework-files'::text) AND ((storage.foldername(name))[1] = 'assignments'::text) AND (has_role(auth.uid(), 'admin'::user_role) OR has_role(auth.uid(), 'super_admin'::user_role))));

CREATE POLICY "Admins update reward images" ON storage.objects AS PERMISSIVE FOR UPDATE TO authenticated
  USING (((bucket_id = 'content'::text) AND ((storage.foldername(name))[1] = 'rewards'::text) AND is_admin(auth.uid())));

CREATE POLICY "Admins upload assignment files" ON storage.objects AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (((bucket_id = 'homework-files'::text) AND ((storage.foldername(name))[1] = 'assignments'::text) AND (has_role(auth.uid(), 'admin'::user_role) OR has_role(auth.uid(), 'super_admin'::user_role))));

CREATE POLICY "Admins upload reward images" ON storage.objects AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (((bucket_id = 'content'::text) AND ((storage.foldername(name))[1] = 'rewards'::text) AND is_admin(auth.uid())));

CREATE POLICY "Authenticated can read pyramid materials" ON storage.objects AS PERMISSIVE FOR SELECT TO authenticated
  USING ((bucket_id = 'pyramid-materials'::text));

CREATE POLICY "Authenticated read assignment files" ON storage.objects AS PERMISSIVE FOR SELECT TO authenticated
  USING (((bucket_id = 'homework-files'::text) AND ((storage.foldername(name))[1] = 'assignments'::text)));

CREATE POLICY "Public can view avatars" ON storage.objects AS PERMISSIVE FOR SELECT TO public
  USING ((bucket_id = 'avatars'::text));

CREATE POLICY "Public can view content media" ON storage.objects AS PERMISSIVE FOR SELECT TO public
  USING ((bucket_id = 'content'::text));

CREATE POLICY "Public can view moments media" ON storage.objects AS PERMISSIVE FOR SELECT TO public
  USING ((bucket_id = 'moments'::text));

CREATE POLICY "Public can view testimonials media" ON storage.objects AS PERMISSIVE FOR SELECT TO public
  USING ((bucket_id = 'testimonials'::text));

CREATE POLICY "Super admins can manage contracts" ON storage.objects AS PERMISSIVE FOR ALL TO public
  USING (((bucket_id = 'contracts'::text) AND is_super_admin(auth.uid())))
  WITH CHECK (((bucket_id = 'contracts'::text) AND is_super_admin(auth.uid())));

CREATE POLICY "Users can view their own contracts" ON storage.objects AS PERMISSIVE FOR SELECT TO public
  USING (((bucket_id = 'contracts'::text) AND ((auth.uid())::text = (storage.foldername(name))[1])));

CREATE POLICY "Users delete own avatar" ON storage.objects AS PERMISSIVE FOR DELETE TO authenticated
  USING (((bucket_id = 'avatars'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)));

CREATE POLICY "Users delete own homework files" ON storage.objects AS PERMISSIVE FOR DELETE TO authenticated
  USING (((bucket_id = 'homework-files'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)));

CREATE POLICY "Users manage own homework files" ON storage.objects AS PERMISSIVE FOR UPDATE TO authenticated
  USING (((bucket_id = 'homework-files'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)));

CREATE POLICY "Users read own homework files" ON storage.objects AS PERMISSIVE FOR SELECT TO authenticated
  USING (((bucket_id = 'homework-files'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)));

CREATE POLICY "Users update own avatar" ON storage.objects AS PERMISSIVE FOR UPDATE TO authenticated
  USING (((bucket_id = 'avatars'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)));

CREATE POLICY "Users upload own avatar" ON storage.objects AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (((bucket_id = 'avatars'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)));

CREATE POLICY "Users upload own homework files" ON storage.objects AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (((bucket_id = 'homework-files'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)));
