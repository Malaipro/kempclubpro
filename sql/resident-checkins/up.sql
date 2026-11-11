-- КЭМП / resident-checkins-1 (UP). НЕ ПРИМЕНЕНО. Применять только после отдельного APPROVE.
-- Цель: резидент отправляет «Я был», проверенный аккаунт основателя подтверждает. Без начислений.
BEGIN;

-- Verified existing KEMP account (read-only user_roles lookup, 2026-11-10); UUID is not a secret.
CREATE OR REPLACE FUNCTION public.is_kemp_founder(p_uid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p_uid = 'bfe3d1f1-3b4a-4c9c-b38a-e961f3fc7f2e'::uuid
    AND public.is_super_admin(p_uid)
$$;
-- Admin authorization deliberately ignores profiles.approved (founder profile has approved=false; do not modify it).
-- approved=true remains mandatory for residents/recipients below.
REVOKE ALL ON FUNCTION public.is_kemp_founder(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_kemp_founder(uuid) TO authenticated, service_role;

-- 1. Минимальное расширение существующих таблиц (все поля nullable / с дефолтом, старые строки = «Не отмечался»)
ALTER TABLE public.schedule_participants
  ADD COLUMN IF NOT EXISTS self_marked_at timestamptz,
  ADD COLUMN IF NOT EXISTS attended_marked_at timestamptz,
  ADD COLUMN IF NOT EXISTS attended_marked_by uuid,
  ADD COLUMN IF NOT EXISTS attendance_history jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE public.schedules
  ADD COLUMN IF NOT EXISTS club_kind text,
  ADD COLUMN IF NOT EXISTS week_anchor date;

-- 2. Проверка вида клубного события (триггер, не CHECK)
CREATE OR REPLACE FUNCTION public.validate_schedule_club_kind()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.club_kind IS NOT NULL AND NEW.club_kind NOT IN (
    'training_bjj','training_ofp','training_kick','banya','sport','excursion',
    'lecture','mastermind','crash_test','other') THEN
    RAISE EXCEPTION 'invalid_club_kind';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_validate_schedule_club_kind ON public.schedules;
CREATE TRIGGER trg_validate_schedule_club_kind BEFORE INSERT OR UPDATE OF club_kind ON public.schedules
  FOR EACH ROW EXECUTE FUNCTION public.validate_schedule_club_kind();

-- 3. Защита полей посещения от прямых клиентских записей.
-- Не доверяем GUC/флагам сессии: прямой запрос из браузера выполняется ролью anon/authenticated;
-- внутри SECURITY DEFINER RPC current_user = владелец функции, а RPC сама проверяет auth.uid().
-- service_role (Telegram-бот) не затрагивается.
CREATE OR REPLACE FUNCTION public.guard_schedule_participant_attendance()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF current_user IN ('anon','authenticated') THEN
    IF TG_OP = 'INSERT' THEN
      NEW.attended := false;
      NEW.self_marked_at := NULL;
      NEW.attended_marked_at := NULL;
      NEW.attended_marked_by := NULL;
      NEW.attendance_history := '[]'::jsonb;
    ELSIF NEW.attended IS DISTINCT FROM OLD.attended
       OR NEW.self_marked_at IS DISTINCT FROM OLD.self_marked_at
       OR NEW.attended_marked_at IS DISTINCT FROM OLD.attended_marked_at
       OR NEW.attended_marked_by IS DISTINCT FROM OLD.attended_marked_by
       OR NEW.attendance_history IS DISTINCT FROM OLD.attendance_history THEN
      RAISE EXCEPTION 'attendance_fields_protected';
    END IF;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_guard_schedule_participant_attendance ON public.schedule_participants;
CREATE TRIGGER trg_guard_schedule_participant_attendance BEFORE INSERT OR UPDATE ON public.schedule_participants
  FOR EACH ROW EXECUTE FUNCTION public.guard_schedule_participant_attendance();

-- Неделя зачёта: понедельник по Москве; перенесённое занятие держит исходную неделю через week_anchor
CREATE OR REPLACE FUNCTION public.club_week_start(p_start timestamptz, p_anchor date)
RETURNS date LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT date_trunc('week', COALESCE(p_anchor::timestamp, p_start AT TIME ZONE 'Europe/Moscow'))::date
$$;

-- 4. Резидент: отметки и данные для статистики
CREATE OR REPLACE FUNCTION public.get_resident_checkins_web(p_weeks integer DEFAULT 12)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_from timestamptz := now() - make_interval(weeks => LEAST(GREATEST(COALESCE(p_weeks,12),1),52));
BEGIN
  IF v_uid IS NULL THEN RETURN jsonb_build_object('ok',false,'error','not_authenticated'); END IF;
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE user_id=v_uid AND participant_status='club_resident' AND approved=true) THEN RETURN jsonb_build_object('ok',false,'error','not_resident'); END IF;
  RETURN jsonb_build_object(
    'ok', true,
    'now', now(),
    'current_week', public.club_week_start(now(), NULL),
    'events', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'schedule_id', s.id,
        'title', s.activity_type,
        'theme', NULLIF(trim(split_part(COALESCE(s.description,''),'|||',1)),''),
        'start_time', s.start_time,
        'club_kind', s.club_kind,
        'week_start', public.club_week_start(s.start_time, s.week_anchor),
        'registered', sp.id IS NOT NULL,
        'attended', COALESCE(sp.attended,false),
        'self_marked_at', sp.self_marked_at,
        'attended_marked_at', sp.attended_marked_at
      ) ORDER BY s.start_time DESC)
      FROM public.schedules s
      LEFT JOIN public.schedule_participants sp ON sp.schedule_id = s.id AND sp.user_id = v_uid
      WHERE s.schedule_type = 'club' AND s.is_active
        AND s.start_time >= v_from AND s.start_time <= now() + interval '14 days'
        AND (sp.id IS NOT NULL OR s.club_kind IN ('training_bjj','training_ofp','training_kick'))
    ), '[]'::jsonb)
  );
END $$;

-- 5. Резидент: «Я был»
CREATE OR REPLACE FUNCTION public.request_attendance_web(p_schedule_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_event public.schedules%ROWTYPE;
  v_row public.schedule_participants%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN RETURN jsonb_build_object('ok',false,'error','not_authenticated'); END IF;
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE user_id=v_uid AND participant_status='club_resident' AND approved=true) THEN RETURN jsonb_build_object('ok',false,'error','not_resident'); END IF;
  SELECT * INTO v_event FROM public.schedules WHERE id = p_schedule_id AND is_active;
  IF NOT FOUND OR v_event.schedule_type <> 'club' THEN RETURN jsonb_build_object('ok',false,'error','not_club_event'); END IF;
  IF v_event.start_time > now() THEN RETURN jsonb_build_object('ok',false,'error','event_not_started'); END IF;
  IF v_event.start_time < now() - interval '7 days' THEN RETURN jsonb_build_object('ok',false,'error','mark_window_closed'); END IF;
  SELECT * INTO v_row FROM public.schedule_participants WHERE schedule_id = p_schedule_id AND user_id = v_uid FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok',false,'error','not_registered'); END IF;
  IF v_row.attended_marked_at IS NOT NULL THEN RETURN jsonb_build_object('ok',false,'error','already_reviewed'); END IF;
  IF v_row.self_marked_at IS NULL THEN
    UPDATE public.schedule_participants SET self_marked_at = now() WHERE id = v_row.id;
  END IF;
  RETURN jsonb_build_object('ok',true,'status','pending');
END $$;

-- 6. Основатель: список записавшихся по событию
CREATE OR REPLACE FUNCTION public.founder_get_event_attendance(p_schedule_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_event public.schedules%ROWTYPE;
BEGIN
  IF NOT public.is_kemp_founder(auth.uid()) THEN RETURN jsonb_build_object('ok',false,'error','forbidden'); END IF;
  SELECT * INTO v_event FROM public.schedules WHERE id = p_schedule_id;
  IF NOT FOUND OR v_event.schedule_type <> 'club' THEN RETURN jsonb_build_object('ok',false,'error','not_club_event'); END IF;
  RETURN jsonb_build_object('ok',true,
    'club_kind', v_event.club_kind,
    'week_anchor', v_event.week_anchor,
    'week_start', public.club_week_start(v_event.start_time, v_event.week_anchor),
    'participants', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'user_id', sp.user_id,
        'name', COALESCE(NULLIF(p.display_name,''), NULLIF(trim(COALESCE(p.first_name,'')||' '||COALESCE(p.last_name,'')),''), 'Без имени'),
        'is_resident', COALESCE(p.participant_status = 'club_resident' AND p.approved, false),
        'registered_at', sp.registered_at,
        'attended', sp.attended,
        'self_marked_at', sp.self_marked_at,
        'attended_marked_at', sp.attended_marked_at,
        'history_count', jsonb_array_length(sp.attendance_history)
      ) ORDER BY sp.registered_at)
      FROM public.schedule_participants sp
      LEFT JOIN public.profiles p ON p.user_id = sp.user_id
      WHERE sp.schedule_id = p_schedule_id
    ), '[]'::jsonb));
END $$;

-- 7. Основатель: массовое подтверждение. Меняются только явно переданные участники.
CREATE OR REPLACE FUNCTION public.founder_confirm_attendance(p_schedule_id uuid, p_marks jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_event public.schedules%ROWTYPE;
  v_mark jsonb;
  v_updated int := 0;
  v_skipped int := 0;
  v_n int;
BEGIN
  IF NOT public.is_kemp_founder(v_uid) THEN RETURN jsonb_build_object('ok',false,'error','forbidden'); END IF;
  SELECT * INTO v_event FROM public.schedules WHERE id = p_schedule_id FOR UPDATE;
  IF NOT FOUND OR v_event.schedule_type <> 'club' THEN RETURN jsonb_build_object('ok',false,'error','not_club_event'); END IF;
  IF v_event.start_time > now() THEN RETURN jsonb_build_object('ok',false,'error','event_not_started'); END IF;
  IF p_marks IS NULL OR jsonb_typeof(p_marks) <> 'array' THEN RETURN jsonb_build_object('ok',false,'error','invalid_marks'); END IF;
  FOR v_mark IN SELECT * FROM jsonb_array_elements(p_marks) LOOP
    IF jsonb_typeof(v_mark->'attended') <> 'boolean' OR NOT (v_mark ? 'user_id') THEN
      v_skipped := v_skipped + 1; CONTINUE;
    END IF;
    UPDATE public.schedule_participants sp SET
      attendance_history = sp.attendance_history || jsonb_build_array(jsonb_build_object(
        'at', now(), 'by', v_uid,
        'from', CASE WHEN sp.attended_marked_at IS NULL THEN NULL ELSE sp.attended END,
        'to', (v_mark->>'attended')::boolean)),
      attended = (v_mark->>'attended')::boolean,
      attended_marked_at = now(),
      attended_marked_by = v_uid
    WHERE sp.schedule_id = p_schedule_id AND sp.user_id = (v_mark->>'user_id')::uuid
      AND (sp.attended_marked_at IS NULL OR sp.attended IS DISTINCT FROM (v_mark->>'attended')::boolean);
    GET DIAGNOSTICS v_n = ROW_COUNT;
    IF v_n = 0 THEN v_skipped := v_skipped + 1; ELSE v_updated := v_updated + 1; END IF;
  END LOOP;
  RETURN jsonb_build_object('ok',true,'updated',v_updated,'skipped',v_skipped);
END $$;

-- 8. Основатель: вид события и неделя зачёта
CREATE OR REPLACE FUNCTION public.founder_set_event_kind(p_schedule_id uuid, p_club_kind text, p_week_anchor date DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_kemp_founder(auth.uid()) THEN RETURN jsonb_build_object('ok',false,'error','forbidden'); END IF;
  UPDATE public.schedules SET club_kind = NULLIF(p_club_kind,''), week_anchor = COALESCE(p_week_anchor, week_anchor, public.club_week_start(start_time, NULL))
   WHERE id = p_schedule_id AND schedule_type = 'club';
  IF NOT FOUND THEN RETURN jsonb_build_object('ok',false,'error','not_club_event'); END IF;
  RETURN jsonb_build_object('ok',true);
END $$;

REVOKE ALL ON FUNCTION public.get_resident_checkins_web(integer) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.request_attendance_web(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.founder_get_event_attendance(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.founder_confirm_attendance(uuid, jsonb) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.founder_set_event_kind(uuid, text, date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_resident_checkins_web(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.request_attendance_web(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.founder_get_event_attendance(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.founder_confirm_attendance(uuid, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.founder_set_event_kind(uuid, text, date) TO authenticated;

-- Existing web booking wrapper only: Telegram/shared core and intensive check-ins unchanged.
CREATE OR REPLACE FUNCTION public.register_for_event_web(p_schedule_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_uid uuid := auth.uid(); v_event public.schedules%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN RETURN jsonb_build_object('ok',false,'error','not_authenticated'); END IF;
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE user_id=v_uid AND participant_status='club_resident' AND approved=true) THEN
    RETURN jsonb_build_object('ok',false,'error','not_resident');
  END IF;
  SELECT * INTO v_event FROM public.schedules WHERE id=p_schedule_id FOR UPDATE;
  IF NOT FOUND OR NOT v_event.is_active OR v_event.schedule_type <> 'club' THEN
    RETURN jsonb_build_object('ok',false,'error','not_club_event');
  END IF;
  IF v_event.start_time <= now() THEN RETURN jsonb_build_object('ok',false,'error','event_started'); END IF;
  RETURN public.server_register_for_event(v_uid,p_schedule_id);
END $$;
REVOKE ALL ON FUNCTION public.register_for_event_web(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.register_for_event_web(uuid) TO authenticated;
COMMIT;
