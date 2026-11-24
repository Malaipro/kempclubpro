-- Production-like KEMP schema fixture for local E1 tests only.
-- Synthetic UUIDs only. notify_booking_change is a no-network counter stub.
\set ON_ERROR_STOP on

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN CREATE ROLE anon NOLOGIN; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN CREATE ROLE authenticated NOLOGIN; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN CREATE ROLE service_role NOLOGIN BYPASSRLS; END IF;
END $$;

CREATE SCHEMA auth;
CREATE TABLE auth.users (
  id uuid PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
  SELECT nullif(current_setting('test.uid', true), '')::uuid
$$;
GRANT USAGE ON SCHEMA auth, public TO anon, authenticated, service_role;

CREATE TYPE public.user_role AS ENUM ('user', 'admin', 'super_admin', 'trainer');
CREATE TYPE public.schedule_type AS ENUM ('intensive', 'club');

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  participant_status text,
  approved boolean NOT NULL DEFAULT false,
  display_name text,
  first_name text,
  last_name text,
  phone text
);
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.user_role NOT NULL DEFAULT 'user',
  UNIQUE (user_id, role)
);
CREATE TABLE public.trainers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL
);
CREATE TABLE public.streams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL
);
CREATE TABLE public.mastermind_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL
);
CREATE TABLE public.schedules (
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
  color text DEFAULT '#6366f1',
  schedule_type public.schedule_type NOT NULL DEFAULT 'intensive',
  stream_id uuid REFERENCES public.streams(id) ON DELETE SET NULL,
  mastermind_group_id uuid REFERENCES public.mastermind_groups(id) ON DELETE SET NULL
);
CREATE INDEX idx_schedules_type ON public.schedules(schedule_type);
CREATE INDEX idx_schedules_stream_id ON public.schedules(stream_id);
CREATE TABLE public.schedule_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id uuid NOT NULL REFERENCES public.schedules(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  registered_at timestamptz NOT NULL DEFAULT now(),
  attended boolean NOT NULL DEFAULT false,
  CONSTRAINT schedule_participants_schedule_user_key UNIQUE (schedule_id, user_id)
);
CREATE INDEX schedule_participants_user_idx ON public.schedule_participants(user_id);

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;
CREATE TRIGGER schedules_updated_at BEFORE UPDATE ON public.schedules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE FUNCTION public.has_role(_user_id uuid, _role public.user_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;
CREATE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role IN ('admin', 'super_admin'))
$$;
CREATE FUNCTION public.is_super_admin(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'super_admin')
$$;
CREATE FUNCTION public.is_club_resident(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = _user_id AND participant_status = 'club_resident' AND approved = true
  )
$$;

ALTER TABLE public.schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedule_participants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Intensive schedules are publicly viewable" ON public.schedules
  FOR SELECT TO anon, authenticated USING (schedule_type = 'intensive' AND is_active = true);
CREATE POLICY "Club schedules are viewable by club residents" ON public.schedules
  FOR SELECT TO authenticated USING (
    schedule_type = 'club' AND is_active = true
    AND (public.is_club_resident(auth.uid()) OR public.is_admin(auth.uid()))
  );
CREATE POLICY "Admins and trainers can manage schedules" ON public.schedules
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()) OR public.has_role(auth.uid(), 'trainer'::public.user_role))
  WITH CHECK (public.is_admin(auth.uid()) OR public.has_role(auth.uid(), 'trainer'::public.user_role));
CREATE POLICY "Users can view their own schedule participation" ON public.schedule_participants
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Trainers can view all schedule participants" ON public.schedule_participants
  FOR SELECT TO authenticated USING (
    public.is_admin(auth.uid()) OR public.has_role(auth.uid(), 'trainer'::public.user_role)
  );
CREATE POLICY "Club residents can register for club schedules" ON public.schedule_participants
  FOR INSERT TO authenticated WITH CHECK (
    auth.uid() = user_id AND (public.is_club_resident(auth.uid()) OR public.is_admin(auth.uid()))
  );
CREATE POLICY admins_insert_any_participation ON public.schedule_participants
  FOR INSERT TO authenticated WITH CHECK (
    public.is_admin(auth.uid()) OR public.has_role(auth.uid(), 'trainer'::public.user_role)
  );
CREATE POLICY users_delete_own_participation ON public.schedule_participants
  FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY admins_delete_any_participation ON public.schedule_participants
  FOR DELETE TO authenticated USING (
    public.is_admin(auth.uid()) OR public.has_role(auth.uid(), 'trainer'::public.user_role)
  );

GRANT SELECT ON public.schedules TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.schedules, public.schedule_participants TO authenticated;
GRANT ALL ON public.schedules, public.schedule_participants TO service_role;

CREATE FUNCTION public.server_register_for_event(p_uid uuid, p_sid uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.schedule_participants(schedule_id, user_id) VALUES (p_sid, p_uid);
  RETURN jsonb_build_object('ok', true);
END $$;
CREATE FUNCTION public.register_for_event_web(p_schedule_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN public.server_register_for_event(auth.uid(), p_schedule_id);
END $$;

-- Same trigger name and timing as production, but never performs HTTP/network I/O.
CREATE TABLE public.notification_stub_calls (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  operation text NOT NULL CHECK (operation IN ('INSERT', 'DELETE')),
  schedule_id uuid NOT NULL,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE FUNCTION public.notify_booking_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r public.schedule_participants%ROWTYPE;
BEGIN
  r := CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
  INSERT INTO public.notification_stub_calls(operation, schedule_id, user_id)
  VALUES (TG_OP, r.schedule_id, r.user_id);
  RETURN NULL;
END $$;
CREATE TRIGGER trg_notify_booking_change
AFTER INSERT OR DELETE ON public.schedule_participants
FOR EACH ROW EXECUTE FUNCTION public.notify_booking_change();
REVOKE ALL ON public.notification_stub_calls FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.notify_booking_change() FROM PUBLIC, anon, authenticated;

INSERT INTO auth.users(id) VALUES
  ('bfe3d1f1-3b4a-4c9c-b38a-e961f3fc7f2e'),
  ('00000000-0000-0000-0000-000000000001'),
  ('00000000-0000-0000-0000-000000000002'),
  ('00000000-0000-0000-0000-000000000003'),
  ('00000000-0000-0000-0000-000000000004'),
  ('00000000-0000-0000-0000-000000000005'),
  ('00000000-0000-0000-0000-000000000006'),
  ('00000000-0000-0000-0000-000000000007'),
  ('00000000-0000-0000-0000-000000000008');
INSERT INTO public.profiles(user_id, participant_status, approved, display_name) VALUES
  ('bfe3d1f1-3b4a-4c9c-b38a-e961f3fc7f2e', 'club_resident', false, 'Основатель'),
  ('00000000-0000-0000-0000-000000000001', 'club_resident', true, 'Резидент 1'),
  ('00000000-0000-0000-0000-000000000002', 'club_resident', true, 'Резидент 2'),
  ('00000000-0000-0000-0000-000000000003', 'club_resident', false, 'Не одобрен'),
  ('00000000-0000-0000-0000-000000000004', 'intensive_active', true, 'Интенсив'),
  ('00000000-0000-0000-0000-000000000005', 'club_resident', true, 'Админ'),
  ('00000000-0000-0000-0000-000000000006', 'club_resident', true, 'Другой super_admin'),
  ('00000000-0000-0000-0000-000000000007', 'club_resident', true, 'Резидент 3'),
  ('00000000-0000-0000-0000-000000000008', 'club_resident', true, 'Тренер');
INSERT INTO public.user_roles(user_id, role) VALUES
  ('bfe3d1f1-3b4a-4c9c-b38a-e961f3fc7f2e', 'super_admin'),
  ('00000000-0000-0000-0000-000000000005', 'admin'),
  ('00000000-0000-0000-0000-000000000006', 'super_admin'),
  ('00000000-0000-0000-0000-000000000008', 'trainer');
