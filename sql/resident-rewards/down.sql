-- ============================================================================
-- sql/resident-rewards/down.sql — откат resident-rewards.
-- Восстанавливает версии функций из:
--   * main:sql/resident-checkins/up.sql (founder_confirm_attendance);
--   * sql/resident-checkins-request/up.sql (get_resident_checkins_web);
--   * sql/web-app-resident.sql (get_resident_rating_web).
-- Записи coin_transactions не удаляются (append-only журнал): обращение
-- начислений при необходимости делается компенсирующими записями вручную.
-- ============================================================================
BEGIN;

DROP FUNCTION IF EXISTS public.get_resident_rewards_web();
DROP FUNCTION IF EXISTS public.founder_cancel_event_web(uuid);
DROP FUNCTION IF EXISTS public._resident_apply_training_award(uuid, uuid, boolean, uuid);
DROP TABLE IF EXISTS public.resident_reward_awards;

-- founder_confirm_attendance — версия resident-checkins (без начислений).
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

REVOKE ALL ON FUNCTION public.founder_confirm_attendance(uuid, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.founder_confirm_attendance(uuid, jsonb) TO authenticated;

-- get_resident_checkins_web — версия resident-checkins-request (только активные).
CREATE OR REPLACE FUNCTION public.get_resident_checkins_web(p_weeks integer DEFAULT 12)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
        'booking_mode', s.booking_mode,
        'schedule_type', s.schedule_type,
        'is_active', s.is_active,
        'attended', COALESCE(sp.attended,false),
        'self_marked_at', sp.self_marked_at,
        'attended_marked_at', sp.attended_marked_at,
        'booking_id', pb.id,
        'booking_status', CASE WHEN sp.id IS NOT NULL AND pb.id IS NULL THEN 'registered' ELSE pb.booking_status END
      ) ORDER BY s.start_time DESC)
      FROM public.schedules s
      LEFT JOIN public.schedule_participants sp ON sp.schedule_id = s.id AND sp.user_id = v_uid
      LEFT JOIN LATERAL (
        SELECT b.id,b.booking_status FROM public.paid_bookings b
        WHERE b.schedule_id=s.id AND b.user_id=v_uid
        ORDER BY b.created_at DESC,b.id DESC LIMIT 1
      ) pb ON true
      WHERE s.schedule_type = 'club' AND s.is_active
        AND s.start_time >= v_from AND s.start_time <= now() + interval '14 days'
        AND (sp.id IS NOT NULL OR pb.id IS NOT NULL OR s.club_kind IN ('training_bjj','training_ofp','training_kick'))
    ), '[]'::jsonb)
  );
END $function$;

REVOKE ALL ON FUNCTION public.get_resident_checkins_web(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_resident_checkins_web(integer) TO authenticated;

-- get_resident_rating_web — версия web-app-resident (только leaderboard).
CREATE OR REPLACE FUNCTION public.get_resident_rating_web()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_entries jsonb;
  v_my_position int;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_authenticated');
  END IF;

  WITH ranked AS (
    SELECT l.user_id,
           l.total_points,
           ROW_NUMBER() OVER (ORDER BY l.total_points DESC) AS pos
      FROM leaderboard l
      JOIN profiles p ON p.user_id = l.user_id
     WHERE p.participant_status = 'club_resident'
  )
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
           'user_id', r.user_id,
           'display_name', mask_participant_name(trim(pr.first_name || ' ' || pr.last_name)),
           'total_points', r.total_points,
           'position', r.pos,
           'is_me', r.user_id = v_uid
         ) ORDER BY r.pos), '[]'::jsonb)
    INTO v_entries
    FROM ranked r
    JOIN profiles pr ON pr.user_id = r.user_id;

  SELECT pos INTO v_my_position FROM ranked WHERE user_id = v_uid;

  RETURN jsonb_build_object(
    'ok', true,
    'entries', v_entries,
    'my_position', v_my_position
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_resident_rating_web() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_resident_rating_web() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_resident_rating_web() TO service_role;

-- Правило resident_week_full оставляем в coin_rules (is_active можно снять
-- вручную при отказе от механики): удаление правила потеряло бы связь
-- исторических coin_transactions.rule_id.
UPDATE public.coin_rules SET is_active = false, updated_at = now() WHERE code = 'resident_week_full';

COMMIT;
