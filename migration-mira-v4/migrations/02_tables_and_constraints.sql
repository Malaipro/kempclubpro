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
