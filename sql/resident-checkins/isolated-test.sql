-- Изолированная проверка resident-checkins-1 на локальной пустой БД (НЕ production).
-- Заглушки повторяют только нужные части схемы КЭМП.
\set ON_ERROR_STOP on
CREATE ROLE anon NOLOGIN; CREATE ROLE authenticated NOLOGIN; CREATE ROLE service_role NOLOGIN BYPASSRLS;
CREATE SCHEMA auth;
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('test.uid', true),'')::uuid $$;
GRANT USAGE ON SCHEMA auth, public TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION auth.uid() TO anon, authenticated, service_role;
CREATE TYPE schedule_type AS ENUM ('intensive','club');
CREATE TABLE profiles(user_id uuid PRIMARY KEY, participant_status text, approved boolean, display_name text, first_name text, last_name text);
CREATE TABLE user_roles(user_id uuid, role text);
CREATE TABLE schedules(id uuid PRIMARY KEY, activity_type text, description text, start_time timestamptz, is_active boolean DEFAULT true, schedule_type schedule_type);
CREATE TABLE schedule_participants(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), schedule_id uuid, user_id uuid, registered_at timestamptz DEFAULT now(), attended boolean DEFAULT false);
CREATE FUNCTION is_club_resident(_u uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$ SELECT EXISTS(SELECT 1 FROM profiles WHERE user_id=_u AND participant_status='club_resident' AND approved) $$;
CREATE FUNCTION is_super_admin(_u uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$ SELECT EXISTS(SELECT 1 FROM user_roles WHERE user_id=_u AND role='super_admin') $$;
GRANT SELECT, INSERT, UPDATE, DELETE ON schedule_participants TO authenticated;
GRANT ALL ON schedule_participants, schedules TO service_role;

-- Данные: F=основатель, R=резидент, R2=резидент, N=не одобрен, I=интенсив
INSERT INTO profiles VALUES
 ('00000000-0000-0000-0000-00000000000f','club_resident',true,'Основатель',null,null),
 ('00000000-0000-0000-0000-000000000001','club_resident',true,'Резидент',null,null),
 ('00000000-0000-0000-0000-000000000002','club_resident',true,'Резидент 2',null,null),
 ('00000000-0000-0000-0000-000000000003','club_resident',false,'Не одобрен',null,null),
 ('00000000-0000-0000-0000-000000000004','intensive_active',true,'Интенсив',null,null);
INSERT INTO user_roles VALUES ('00000000-0000-0000-0000-00000000000f','super_admin'), ('00000000-0000-0000-0000-000000000005','admin');
INSERT INTO schedules VALUES
 ('10000000-0000-0000-0000-000000000001','BJJ','',now()-interval '1 day',true,'club'),
 ('10000000-0000-0000-0000-000000000002','ОФП','',now()-interval '1 day',true,'club'),
 ('10000000-0000-0000-0000-000000000003','Кикбоксинг','',now()-interval '1 day',true,'club'),
 ('10000000-0000-0000-0000-000000000009','BJJ','',now()-interval '1 day',true,'intensive'),
 ('10000000-0000-0000-0000-00000000000a','Баня','',now()+interval '2 days',true,'club');
INSERT INTO schedule_participants(schedule_id,user_id) SELECT s, u FROM
 unnest(ARRAY['10000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000003','10000000-0000-0000-0000-00000000000a']::uuid[]) s,
 unnest(ARRAY['00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000002']::uuid[]) u;
INSERT INTO schedule_participants(schedule_id,user_id) VALUES ('10000000-0000-0000-0000-000000000009','00000000-0000-0000-0000-000000000001');

\i sql/resident-checkins/up.sql

CREATE FUNCTION pg_temp.expect(cond boolean, label text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN IF NOT cond THEN RAISE EXCEPTION 'FAIL: %', label; END IF; RAISE NOTICE 'OK: %', label; END $$;

-- Старые строки остаются «Не отмечался»
SELECT pg_temp.expect((SELECT count(*) FROM schedule_participants WHERE attended_marked_at IS NOT NULL OR self_marked_at IS NOT NULL)=0, 'старые записи без решения');

-- anon не может вызывать
SET ROLE anon;
DO $$ BEGIN PERFORM public.request_attendance_web('10000000-0000-0000-0000-000000000001'); RAISE EXCEPTION 'anon executed'; EXCEPTION WHEN insufficient_privilege THEN RAISE NOTICE 'OK: anon запрещён'; END $$;
RESET ROLE;

SET ROLE authenticated;
-- не одобренный / интенсив
SET test.uid='00000000-0000-0000-0000-000000000003';
SELECT pg_temp.expect(request_attendance_web('10000000-0000-0000-0000-000000000001')->>'error'='not_resident','не одобрен — отказ');
SELECT pg_temp.expect(get_resident_checkins_web()->>'error'='not_resident','не одобрен — нет данных');
SET test.uid='00000000-0000-0000-0000-000000000004';
SELECT pg_temp.expect(request_attendance_web('10000000-0000-0000-0000-000000000001')->>'error'='not_resident','интенсив — отказ');
-- резидент
SET test.uid='00000000-0000-0000-0000-000000000001';
SELECT pg_temp.expect(request_attendance_web('10000000-0000-0000-0000-000000000009')->>'error'='not_club_event','интенсив-событие — отказ');
SELECT pg_temp.expect(request_attendance_web('10000000-0000-0000-0000-00000000000a')->>'error'='event_not_started','будущее — отказ');
SELECT pg_temp.expect(request_attendance_web('10000000-0000-0000-0000-000000000001')->>'status'='pending','«Я был» → ожидает');
SELECT pg_temp.expect(request_attendance_web('10000000-0000-0000-0000-000000000001')->>'status'='pending','повтор без дубля');
-- прямые записи клиента
DO $$ BEGIN UPDATE schedule_participants SET attended=true WHERE user_id=auth.uid(); RAISE EXCEPTION 'direct update allowed'; EXCEPTION WHEN raise_exception THEN IF SQLERRM <> 'attendance_fields_protected' THEN RAISE; END IF; RAISE NOTICE 'OK: прямой UPDATE attended запрещён'; END $$;
INSERT INTO schedule_participants(schedule_id,user_id,attended,attended_marked_at) VALUES ('10000000-0000-0000-0000-00000000000a','00000000-0000-0000-0000-000000000003',true,now());
SELECT pg_temp.expect((SELECT NOT attended AND attended_marked_at IS NULL FROM schedule_participants WHERE user_id='00000000-0000-0000-0000-000000000003'),'прямой INSERT attended=true обнулён');
-- чужие права
SELECT pg_temp.expect(founder_confirm_attendance('10000000-0000-0000-0000-000000000001','[{"user_id":"00000000-0000-0000-0000-000000000001","attended":true}]')->>'error'='forbidden','резидент не подтверждает');
SET test.uid='00000000-0000-0000-0000-000000000005';
SELECT pg_temp.expect(founder_confirm_attendance('10000000-0000-0000-0000-000000000001','[{"user_id":"00000000-0000-0000-0000-000000000001","attended":true}]')->>'error'='forbidden','admin не подтверждает');
-- основатель
SET test.uid='00000000-0000-0000-0000-00000000000f';
SELECT pg_temp.expect(founder_set_event_kind('10000000-0000-0000-0000-000000000001','training_bjj')->>'ok'='true','вид БЖЖ');
SELECT founder_set_event_kind('10000000-0000-0000-0000-000000000002','training_ofp');
SELECT founder_set_event_kind('10000000-0000-0000-0000-000000000003','training_kick');
SELECT pg_temp.expect(founder_set_event_kind('10000000-0000-0000-0000-000000000009','training_bjj')->>'error'='not_club_event','интенсив нельзя классифицировать');
SELECT pg_temp.expect((founder_confirm_attendance('10000000-0000-0000-0000-000000000001','[{"user_id":"00000000-0000-0000-0000-000000000001","attended":true},{"user_id":"00000000-0000-0000-0000-000000000002","attended":false}]')->>'updated')::int=2,'массово 2 человека');
SELECT founder_confirm_attendance(s,'[{"user_id":"00000000-0000-0000-0000-000000000001","attended":true}]') FROM unnest(ARRAY['10000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000003']::uuid[]) s;
SELECT pg_temp.expect((SELECT attended_marked_at IS NULL FROM schedule_participants WHERE user_id='00000000-0000-0000-0000-000000000002' AND schedule_id='10000000-0000-0000-0000-000000000002'),'непомеченный остаётся без решения');
-- исправление с историей
SELECT founder_confirm_attendance('10000000-0000-0000-0000-000000000001','[{"user_id":"00000000-0000-0000-0000-000000000002","attended":true}]');
SELECT pg_temp.expect((SELECT attended AND jsonb_array_length(attendance_history)=2 AND attended_marked_by='00000000-0000-0000-0000-00000000000f' FROM schedule_participants WHERE user_id='00000000-0000-0000-0000-000000000002' AND schedule_id='10000000-0000-0000-0000-000000000001'),'исправление сохраняет историю');
-- резидент видит 3 подтверждённые тренировки
SET test.uid='00000000-0000-0000-0000-000000000001';
SELECT pg_temp.expect((SELECT count(*) FROM jsonb_array_elements(get_resident_checkins_web()->'events') e WHERE e->>'attended_marked_at' IS NOT NULL AND (e->>'attended')::boolean AND e->>'club_kind' LIKE 'training_%')=3,'резидент видит 3 подтверждённые тренировки');
SELECT pg_temp.expect(request_attendance_web('10000000-0000-0000-0000-000000000001')->>'error'='already_reviewed','после решения «Я был» недоступно');
RESET ROLE;
-- бот (service_role) не затронут
SET ROLE service_role;
INSERT INTO schedule_participants(schedule_id,user_id) VALUES ('10000000-0000-0000-0000-00000000000a','00000000-0000-0000-0000-000000000004');
RESET ROLE;
SELECT pg_temp.expect(true,'service_role вставляет запись');
-- откат
\i sql/resident-checkins/down.sql
SELECT pg_temp.expect((SELECT count(*) FROM information_schema.columns WHERE table_name='schedule_participants')=5,'DOWN вернул исходные колонки');
