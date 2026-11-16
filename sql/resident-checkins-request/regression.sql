-- ONLY an empty local database. Explicit localhost socket is mandatory.
\set ON_ERROR_STOP on
CREATE SCHEMA auth;
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('test.uid',true),'')::uuid $$;
CREATE TABLE public.profiles(user_id uuid PRIMARY KEY, participant_status text, approved boolean);
GRANT ALL ON public.profiles TO CURRENT_USER;
CREATE TABLE public.schedules(id uuid PRIMARY KEY, schedule_type text DEFAULT 'club', is_active boolean DEFAULT true,
  start_time timestamptz, club_kind text DEFAULT 'training_bjj', booking_mode text DEFAULT 'free',
  activity_type text DEFAULT 'БЖЖ', description text, week_anchor date);
GRANT ALL ON public.schedules TO CURRENT_USER;
CREATE TABLE public.schedule_participants(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id uuid REFERENCES public.schedules(id), user_id uuid, attended boolean DEFAULT false,
  self_marked_at timestamptz, attended_marked_at timestamptz, attended_marked_by uuid,
  attendance_history jsonb DEFAULT '[]', paid_booking_id uuid, UNIQUE(schedule_id,user_id));
GRANT ALL ON public.schedule_participants TO CURRENT_USER;
CREATE FUNCTION public.club_week_start(t timestamptz,a date) RETURNS date LANGUAGE sql AS $$
  SELECT coalesce(a,date_trunc('week',t AT TIME ZONE 'Europe/Moscow')::date) $$;
CREATE FUNCTION public.test_assert(v boolean, label text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN IF v IS DISTINCT FROM true THEN RAISE EXCEPTION 'FAIL: %',label; END IF; RAISE NOTICE 'PASS: %',label; END $$;
\ir up.sql
BEGIN;
INSERT INTO public.profiles VALUES ('00000000-0000-4000-8000-000000000001','club_resident',true);
SET LOCAL test.uid='00000000-0000-4000-8000-000000000001';
INSERT INTO public.schedules(id,start_time) SELECT ('00000000-0000-4000-8000-'||lpad(i::text,12,'0'))::uuid,now()-interval '1 hour' FROM generate_series(1,10) i;
UPDATE public.schedules SET booking_mode='paid' WHERE id='00000000-0000-4000-8000-000000000002';
UPDATE public.schedules SET club_kind='lecture' WHERE id='00000000-0000-4000-8000-000000000003';
UPDATE public.schedules SET schedule_type='intensive' WHERE id='00000000-0000-4000-8000-000000000004';
UPDATE public.schedules SET is_active=false WHERE id='00000000-0000-4000-8000-000000000005';
UPDATE public.schedules SET start_time=now()+interval '1 second' WHERE id='00000000-0000-4000-8000-000000000006';
UPDATE public.schedules SET start_time=now()-interval '7 days' WHERE id='00000000-0000-4000-8000-000000000007';
UPDATE public.schedules SET start_time=now()-interval '7 days 1 second' WHERE id='00000000-0000-4000-8000-000000000008';
UPDATE public.schedules SET start_time=now() WHERE id='00000000-0000-4000-8000-000000000009';
DO $$ DECLARE a jsonb; b jsonb; rid uuid; t timestamptz; h jsonb; BEGIN
  a:=public.request_attendance_web('00000000-0000-4000-8000-000000000001');
  PERFORM public.test_assert(a->>'status'='pending','free unregistered training creates pending request');
  rid:=(a->>'request_id')::uuid;
  b:=public.request_attendance_web('00000000-0000-4000-8000-000000000001');
  PERFORM public.test_assert(a=b,'replay returns same id and timestamp');
  PERFORM public.test_assert((SELECT count(*)=1 FROM public.schedule_participants WHERE schedule_id='00000000-0000-4000-8000-000000000001'),'no duplicate');
  PERFORM public.test_assert((SELECT attended=false AND attended_marked_at IS NULL FROM public.schedule_participants WHERE id=rid),'request is not confirmation');
  UPDATE public.schedule_participants SET attended=true,attended_marked_at=now(),attended_marked_by='00000000-0000-4000-8000-000000000099',attendance_history='[{"decision":"confirmed"}]' WHERE id=rid;
  SELECT attended_marked_at,attendance_history INTO t,h FROM public.schedule_participants WHERE id=rid;
  a:=public.request_attendance_web('00000000-0000-4000-8000-000000000001');
  PERFORM public.test_assert(a->>'status'='confirmed' AND (a->>'request_id')::uuid=rid,'confirmed decision replay');
  PERFORM public.test_assert((SELECT attended_marked_at=t AND attendance_history=h FROM public.schedule_participants WHERE id=rid),'founder audit unchanged');
  UPDATE public.schedule_participants SET attended=false WHERE id=rid;
  PERFORM public.test_assert(public.request_attendance_web('00000000-0000-4000-8000-000000000001')->>'status'='absent','negative decision preserved');
END $$;
SELECT public.test_assert(public.request_attendance_web('00000000-0000-4000-8000-000000000002')->>'error'='not_registered','paid requires existing booking');
SELECT public.test_assert(public.request_attendance_web('00000000-0000-4000-8000-000000000003')->>'error'='not_registered','lecture requires existing booking');
SELECT public.test_assert(public.request_attendance_web('00000000-0000-4000-8000-000000000004')->>'error'='not_club_event','intensive excluded');
SELECT public.test_assert(public.request_attendance_web('00000000-0000-4000-8000-000000000005')->>'error'='not_club_event','inactive excluded');
SELECT public.test_assert(public.request_attendance_web('00000000-0000-4000-8000-000000000006')->>'error'='event_not_started','before start denied');
SELECT public.test_assert(public.request_attendance_web('00000000-0000-4000-8000-000000000007')->>'status'='pending','exactly seven days allowed');
SELECT public.test_assert(public.request_attendance_web('00000000-0000-4000-8000-000000000008')->>'error'='mark_window_closed','past seven days denied');
SELECT public.test_assert(public.request_attendance_web('00000000-0000-4000-8000-000000000009')->>'status'='pending','exact start allowed');
INSERT INTO public.schedule_participants(schedule_id,user_id,paid_booking_id) VALUES ('00000000-0000-4000-8000-000000000002','00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000088');
SELECT public.test_assert(public.request_attendance_web('00000000-0000-4000-8000-000000000002')->>'status'='pending','existing paid attendance unchanged');
UPDATE public.profiles SET approved=false;
SELECT public.test_assert(public.request_attendance_web('00000000-0000-4000-8000-000000000010')->>'error'='not_resident','unapproved denied');
UPDATE public.profiles SET approved=true,participant_status='intensive_active';
SELECT public.test_assert(public.request_attendance_web('00000000-0000-4000-8000-000000000010')->>'error'='not_resident','nonresident denied');
SET LOCAL test.uid='';
SELECT public.test_assert(public.request_attendance_web('00000000-0000-4000-8000-000000000010')->>'error'='not_authenticated','signed out denied');
SET LOCAL test.uid='00000000-0000-4000-8000-000000000001';
UPDATE public.profiles SET participant_status='club_resident';
SELECT public.test_assert((SELECT bool_and((e->>'booking_mode') IN ('free','paid') AND e->>'schedule_type'='club' AND (e->>'is_active')::boolean) FROM jsonb_array_elements(public.get_resident_checkins_web()->'events') e),'reader returns mandatory eligibility metadata');
COMMIT;
\ir down.sql
SET test.uid='00000000-0000-4000-8000-000000000001';
SELECT public.test_assert(public.request_attendance_web('00000000-0000-4000-8000-000000000010')->>'error'='not_registered','down restores advance booking requirement');
SELECT public.test_assert((SELECT count(*)=4 FROM public.schedule_participants),'down preserves all requests');
\ir up.sql