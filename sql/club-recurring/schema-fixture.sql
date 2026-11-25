-- Production-like KEMP fixture for disposable local PostgreSQL only.
-- Synthetic users; net.http_post is captured in a local table and never performs network I/O.
\set ON_ERROR_STOP on

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN CREATE ROLE anon NOLOGIN; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN CREATE ROLE authenticated NOLOGIN; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN CREATE ROLE service_role NOLOGIN BYPASSRLS; END IF;
END $$;

CREATE SCHEMA auth;
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE SET search_path = '' AS $$
  SELECT nullif(current_setting('test.uid', true), '')::uuid
$$;
CREATE TABLE auth.users(id uuid PRIMARY KEY, created_at timestamptz NOT NULL DEFAULT now());
GRANT USAGE ON SCHEMA auth, public TO anon, authenticated, service_role;

CREATE TYPE public.user_role AS ENUM ('user', 'admin', 'super_admin', 'trainer');
CREATE TYPE public.schedule_type AS ENUM ('intensive', 'club');

CREATE TABLE public.profiles(
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  participant_status text,
  approved boolean NOT NULL DEFAULT false,
  display_name text,
  first_name text,
  last_name text,
  phone text
);
CREATE TABLE public.user_roles(
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.user_role NOT NULL,
  UNIQUE(user_id, role)
);
CREATE TABLE public.trainers(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL);
CREATE TABLE public.streams(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL);
CREATE TABLE public.mastermind_groups(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL);

CREATE TABLE public.schedules(
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  activity_type text NOT NULL,
  start_time timestamptz NOT NULL,
  end_time timestamptz NOT NULL,
  instructor_id uuid REFERENCES public.trainers(id) ON DELETE SET NULL,
  max_participants integer,
  location text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  color text DEFAULT '#10b981',
  schedule_type public.schedule_type NOT NULL DEFAULT 'club',
  stream_id uuid REFERENCES public.streams(id) ON DELETE SET NULL,
  mastermind_group_id uuid REFERENCES public.mastermind_groups(id) ON DELETE SET NULL,
  club_kind text,
  week_anchor date,
  booking_mode text NOT NULL DEFAULT 'free' CHECK (booking_mode IN ('free', 'paid')),
  price_total_rub integer,
  prepay_rub integer,
  cash_rub integer,
  payment_window_minutes integer NOT NULL DEFAULT 120,
  cancellation_terms text,
  payment_qr_url text,
  payment_link text
);
CREATE INDEX idx_schedules_type ON public.schedules(schedule_type);
CREATE INDEX idx_schedules_stream_id ON public.schedules(stream_id);

CREATE TABLE public.paid_bookings(
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id uuid NOT NULL REFERENCES public.schedules(id) ON DELETE RESTRICT,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  booking_status text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX paid_bookings_schedule_user_idx ON public.paid_bookings(schedule_id, user_id);

CREATE TABLE public.schedule_participants(
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id uuid NOT NULL REFERENCES public.schedules(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  registered_at timestamptz NOT NULL DEFAULT now(),
  attended boolean NOT NULL DEFAULT false,
  self_marked_at timestamptz,
  attended_marked_at timestamptz,
  attended_marked_by uuid REFERENCES auth.users(id),
  attendance_history jsonb NOT NULL DEFAULT '[]'::jsonb,
  paid_booking_id uuid REFERENCES public.paid_bookings(id) ON DELETE RESTRICT,
  UNIQUE(schedule_id, user_id)
);
CREATE INDEX schedule_participants_user_idx ON public.schedule_participants(user_id);

CREATE TABLE public.internal_settings(key text PRIMARY KEY, value text);
INSERT INTO public.internal_settings(key, value) VALUES ('notify_booking_secret', 'local-not-a-secret');
CREATE SCHEMA net;
CREATE TABLE public.notification_stub_calls(id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, body jsonb NOT NULL);
CREATE FUNCTION net.http_post(url text, headers jsonb, body jsonb)
RETURNS bigint LANGUAGE plpgsql SET search_path = '' AS $$
DECLARE v_id bigint;
BEGIN
  INSERT INTO public.notification_stub_calls(body) VALUES (body) RETURNING id INTO v_id;
  RETURN v_id;
END
$$;
\ir ../resident-checkins-request/notification-baseline.sql
CREATE TRIGGER trg_notify_booking_change
AFTER INSERT OR DELETE ON public.schedule_participants
FOR EACH ROW EXECUTE FUNCTION public.notify_booking_change();

CREATE FUNCTION public.club_week_start(p_start timestamptz, p_anchor date)
RETURNS date LANGUAGE sql STABLE SET search_path = '' AS $$
  SELECT COALESCE(p_anchor, date_trunc('week', p_start AT TIME ZONE 'Europe/Moscow')::date)
$$;

CREATE FUNCTION public.is_admin(p_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id=p_user_id AND role::text IN ('admin','super_admin'))
$$;
CREATE FUNCTION public.has_role(p_user_id uuid, p_role public.user_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id=p_user_id AND role=p_role)
$$;
CREATE FUNCTION public.is_club_resident(p_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE user_id=p_user_id AND participant_status='club_resident' AND approved)
$$;

ALTER TABLE public.schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedule_participants ENABLE ROW LEVEL SECURITY;
CREATE POLICY schedules_read ON public.schedules FOR SELECT TO authenticated USING (
  schedule_type='club' AND (public.is_club_resident(auth.uid()) OR public.is_admin(auth.uid()) OR public.has_role(auth.uid(),'trainer'))
);
CREATE POLICY schedules_manage ON public.schedules FOR ALL TO authenticated
USING (public.is_admin(auth.uid()) OR public.has_role(auth.uid(),'trainer'))
WITH CHECK (public.is_admin(auth.uid()) OR public.has_role(auth.uid(),'trainer'));
CREATE POLICY participants_own_read ON public.schedule_participants FOR SELECT TO authenticated USING (user_id=auth.uid());
CREATE POLICY participants_manage_read ON public.schedule_participants FOR SELECT TO authenticated USING (
  public.is_admin(auth.uid()) OR public.has_role(auth.uid(),'trainer')
);
CREATE POLICY participants_own_insert ON public.schedule_participants FOR INSERT TO authenticated WITH CHECK (
  user_id=auth.uid() AND public.is_club_resident(auth.uid())
);
CREATE POLICY participants_manage ON public.schedule_participants FOR ALL TO authenticated
USING (public.is_admin(auth.uid()) OR public.has_role(auth.uid(),'trainer'))
WITH CHECK (public.is_admin(auth.uid()) OR public.has_role(auth.uid(),'trainer'));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.schedules, public.schedule_participants TO authenticated;
GRANT SELECT ON public.profiles, public.user_roles, public.paid_bookings TO authenticated;
GRANT ALL ON public.schedules, public.schedule_participants TO service_role;
REVOKE ALL ON public.notification_stub_calls FROM PUBLIC, anon, authenticated, service_role;

INSERT INTO auth.users(id) VALUES
  ('00000000-0000-0000-0000-000000000001'),
  ('00000000-0000-0000-0000-000000000002'),
  ('00000000-0000-0000-0000-000000000005'),
  ('00000000-0000-0000-0000-000000000006'),
  ('00000000-0000-0000-0000-000000000008');
INSERT INTO public.profiles(user_id, participant_status, approved, display_name) VALUES
  ('00000000-0000-0000-0000-000000000001','club_resident',true,'Резидент'),
  ('00000000-0000-0000-0000-000000000002','club_resident',true,'Без роли'),
  ('00000000-0000-0000-0000-000000000005','club_resident',true,'Админ'),
  ('00000000-0000-0000-0000-000000000006','club_resident',true,'Super admin'),
  ('00000000-0000-0000-0000-000000000008','club_resident',true,'Тренер');
INSERT INTO public.user_roles(user_id, role) VALUES
  ('00000000-0000-0000-0000-000000000005','admin'),
  ('00000000-0000-0000-0000-000000000006','super_admin'),
  ('00000000-0000-0000-0000-000000000008','trainer');

CREATE FUNCTION public.test_expect(p_value boolean, p_label text)
RETURNS void LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  IF p_value IS DISTINCT FROM true THEN RAISE EXCEPTION 'FAIL: %', p_label; END IF;
  RAISE NOTICE 'OK: %', p_label;
END
$$;
