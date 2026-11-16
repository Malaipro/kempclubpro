-- Staging only. Restore the functions read on 2026-11-16; do not remove requests or founder decisions.
BEGIN;
CREATE OR REPLACE FUNCTION public.request_attendance_web(p_schedule_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
END $function$;
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
CREATE OR REPLACE FUNCTION public.notify_booking_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  r record;
  s record;
  p record;
  cnt int;
  txt text;
  sec text;
BEGIN
  BEGIN
    r := CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
    SELECT title, start_time, max_participants INTO s FROM schedules WHERE id = r.schedule_id;
    SELECT first_name, last_name, display_name, phone INTO p FROM profiles WHERE user_id = r.user_id;
    SELECT count(*) INTO cnt FROM schedule_participants WHERE schedule_id = r.schedule_id;
    SELECT value INTO sec FROM internal_settings WHERE key = 'notify_booking_secret';

    txt := CASE WHEN TG_OP = 'DELETE' THEN '🔴 Отмена записи' ELSE '🟢 Новая запись' END
      || E'\n👤 ' || COALESCE(NULLIF(trim(COALESCE(p.first_name,'') || ' ' || COALESCE(p.last_name,'')), ''), p.display_name, 'Участник')
      || COALESCE(E'\n📞 ' || p.phone, '')
      || E'\n📅 «' || COALESCE(s.title, 'Мероприятие') || '»'
      || COALESCE(E'\n🕒 ' || to_char(s.start_time AT TIME ZONE 'Europe/Moscow', 'DD.MM.YYYY HH24:MI') || ' (МСК)', '')
      || E'\n👥 Записано: ' || cnt || COALESCE('/' || s.max_participants, '');

    PERFORM net.http_post(
      url := 'https://wfjvjvbjjxcgkaolkgdq.supabase.co/functions/v1/notify-booking',
      headers := jsonb_build_object('Content-Type', 'application/json', 'x-notify-secret', sec),
      body := jsonb_build_object('text', txt)
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'notify_booking_change failed: %', SQLERRM;
  END;
  RETURN NULL;
END;
$$;
COMMIT;
