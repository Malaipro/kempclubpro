-- PREPARED ONLY: never run against production without separate approval.
-- Requires current attendance + paid-booking schema; replaces two RPCs only.
BEGIN;
CREATE OR REPLACE FUNCTION public.request_attendance_web(p_schedule_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_event public.schedules%ROWTYPE;
  v_row public.schedule_participants%ROWTYPE;
  v_free_training boolean;
BEGIN
  IF v_uid IS NULL THEN RETURN jsonb_build_object('ok',false,'error','not_authenticated'); END IF;
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE user_id=v_uid AND participant_status='club_resident' AND approved=true) THEN
    RETURN jsonb_build_object('ok',false,'error','not_resident');
  END IF;
  -- Serializes missing-row creation for this event; also prevents settings changing mid-request.
  SELECT * INTO v_event FROM public.schedules WHERE id=p_schedule_id AND is_active FOR UPDATE;
  IF NOT FOUND OR v_event.schedule_type <> 'club' THEN RETURN jsonb_build_object('ok',false,'error','not_club_event'); END IF;
  IF v_event.start_time > now() THEN RETURN jsonb_build_object('ok',false,'error','event_not_started'); END IF;
  IF v_event.start_time < now()-interval '7 days' THEN RETURN jsonb_build_object('ok',false,'error','mark_window_closed'); END IF;
  v_free_training := v_event.booking_mode='free' AND v_event.club_kind IN ('training_bjj','training_ofp','training_kick');
  SELECT * INTO v_row FROM public.schedule_participants WHERE schedule_id=p_schedule_id AND user_id=v_uid FOR UPDATE;
  IF NOT FOUND THEN
    IF NOT COALESCE(v_free_training,false) THEN RETURN jsonb_build_object('ok',false,'error','not_registered'); END IF;
    -- Attendance after start, not an advance seat reservation. No capacity/payment bypass for other events.
    INSERT INTO public.schedule_participants(schedule_id,user_id)
      VALUES(p_schedule_id,v_uid) ON CONFLICT(schedule_id,user_id) DO NOTHING;
    SELECT * INTO v_row FROM public.schedule_participants WHERE schedule_id=p_schedule_id AND user_id=v_uid FOR UPDATE;
  END IF;
  IF v_row.attended_marked_at IS NOT NULL THEN
    RETURN jsonb_build_object('ok',true,'request_id',v_row.id,'status',CASE WHEN v_row.attended THEN 'confirmed' ELSE 'absent' END);
  END IF;
  IF v_row.self_marked_at IS NULL THEN
    UPDATE public.schedule_participants SET self_marked_at=now() WHERE id=v_row.id RETURNING * INTO v_row;
  END IF;
  RETURN jsonb_build_object('ok',true,'request_id',v_row.id,'status','pending','self_marked_at',v_row.self_marked_at);
END $function$;
-- CREATE OR REPLACE preserves existing ownership and ACL. No changes to roles, RLS, triggers or grants.
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
        'attended_marked_at', sp.attended_marked_at
      ) ORDER BY s.start_time DESC)
      FROM public.schedules s
      LEFT JOIN public.schedule_participants sp ON sp.schedule_id = s.id AND sp.user_id = v_uid
      WHERE s.schedule_type = 'club' AND s.is_active
        AND s.start_time >= v_from AND s.start_time <= now() + interval '14 days'
        AND (sp.id IS NOT NULL OR s.club_kind IN ('training_bjj','training_ofp','training_kick'))
    ), '[]'::jsonb)
  );
END $function$;

COMMIT;
