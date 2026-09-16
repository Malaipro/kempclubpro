-- web-app-stage-2: веб-доступ (/app) к экранам Расписание / Отметки / Аскезы / ДЗ
CREATE OR REPLACE FUNCTION public.get_schedule_web(
  p_from timestamptz DEFAULT now(),
  p_days integer DEFAULT 7
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id   UUID := auth.uid();
  v_stream_id UUID;
  v_status    TEXT;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('found', false, 'error', 'not_authenticated');
  END IF;

  SELECT p.current_stream_id, p.participant_status::TEXT
  INTO   v_stream_id, v_status
  FROM   profiles p
  WHERE  p.user_id = v_user_id
  LIMIT  1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('found', false, 'error', 'profile_not_found');
  END IF;

  RETURN jsonb_build_object(
    'found', true,
    'stream_id', v_stream_id,
    'status', v_status,
    'schedule', (
      SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
          'id', s.id,
          'title', s.title,
          'activity_type', s.activity_type,
          'description', s.description,
          'start_time', s.start_time,
          'end_time', s.end_time,
          'location', s.location,
          'color', s.color,
          'max_participants', s.max_participants,
          'booked_count', (SELECT COUNT(*) FROM schedule_participants sp2 WHERE sp2.schedule_id = s.id),
          'instructor', CASE WHEN t.id IS NULL THEN NULL
                             ELSE jsonb_build_object('id', t.id, 'name', t.name, 'role', t.role) END,
          'booked', EXISTS (SELECT 1 FROM schedule_participants sp
                            WHERE sp.schedule_id = s.id AND sp.user_id = v_user_id),
          'attended', (SELECT sp.attended FROM schedule_participants sp
                       WHERE sp.schedule_id = s.id AND sp.user_id = v_user_id LIMIT 1)
        ) ORDER BY s.start_time
      ), '[]'::jsonb)
      FROM schedules s
      LEFT JOIN trainers t ON t.id = s.instructor_id
      WHERE s.is_active = true
        AND s.start_time >= p_from
        AND s.start_time <  p_from + (p_days || ' days')::INTERVAL
        AND (
          (v_status IN ('intensive_active','intensive_completed')
             AND s.schedule_type = 'intensive'
             AND (s.stream_id = v_stream_id OR s.stream_id IS NULL))
          OR
          (v_status IN ('club_resident','alumni') AND s.schedule_type = 'club')
        )
    )
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.register_for_event_web(p_schedule_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE v_user_id UUID := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_authenticated');
  END IF;
  RETURN public.server_register_for_event(v_user_id, p_schedule_id);
END;
$function$;

CREATE OR REPLACE FUNCTION public.unregister_from_event_web(p_schedule_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE v_user_id UUID := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_authenticated');
  END IF;
  RETURN public.server_unregister_from_event(v_user_id, p_schedule_id);
END;
$function$;

CREATE OR REPLACE FUNCTION public.check_in_activity_web(p_activity_type text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id       UUID := auth.uid();
  v_stream_id     UUID;
  v_rows_inserted INT;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('checked_in', false, 'already_checked', false,
                              'date', NULL, 'reason', 'not_authenticated');
  END IF;

  SELECT p.current_stream_id INTO v_stream_id
  FROM profiles p WHERE p.user_id = v_user_id LIMIT 1;

  INSERT INTO activity_checkins (user_id, activity_type, stream_id)
  VALUES (v_user_id, p_activity_type, v_stream_id)
  ON CONFLICT (user_id, activity_type, checked_at) DO NOTHING;

  GET DIAGNOSTICS v_rows_inserted = ROW_COUNT;

  RETURN jsonb_build_object(
    'checked_in', v_rows_inserted > 0,
    'already_checked', v_rows_inserted = 0,
    'date', CURRENT_DATE
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_ascetic_web()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id UUID := auth.uid();
  v_row     RECORD;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('found', false, 'error', 'not_authenticated');
  END IF;

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
    'found', true,
    'has_ascetic', true,
    'id', v_row.id,
    'text', v_row.notes,
    'streak', v_row.streak,
    'checked_in_today', v_row.last_checkin_date = CURRENT_DATE
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.take_ascetic_web(p_text text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id UUID := auth.uid();
  v_id      UUID;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_authenticated');
  END IF;

  INSERT INTO public.ascetic_activities (user_id, activity_type, notes, streak, last_checkin_date)
  VALUES (v_user_id, 'ascetic_vow', p_text, 0, NULL)
  RETURNING id INTO v_id;

  RETURN jsonb_build_object('ok', true, 'id', v_id, 'text', p_text,
                            'streak', 0, 'checked_in_today', false);
END;
$function$;

CREATE OR REPLACE FUNCTION public.checkin_ascetic_web(p_ascetic_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id UUID := auth.uid();
  v_row     RECORD;
  v_streak  INT;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_authenticated');
  END IF;

  SELECT streak, last_checkin_date INTO v_row
  FROM   public.ascetic_activities
  WHERE  id = p_ascetic_id AND user_id = v_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_found');
  END IF;

  IF v_row.last_checkin_date = CURRENT_DATE THEN
    RETURN jsonb_build_object('ok', true, 'checked_in', false,
                              'already_checked', true, 'streak', v_row.streak);
  END IF;

  IF v_row.last_checkin_date = CURRENT_DATE - 1 THEN
    v_streak := v_row.streak + 1;
  ELSE
    v_streak := 1;
  END IF;

  UPDATE public.ascetic_activities
  SET streak = v_streak, last_checkin_date = CURRENT_DATE
  WHERE id = p_ascetic_id;

  RETURN jsonb_build_object('ok', true, 'checked_in', true,
                            'already_checked', false, 'streak', v_streak);
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_homework_web()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id   UUID := auth.uid();
  v_stream_id UUID;
  v_homework  JSONB;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('found', false, 'error', 'not_authenticated');
  END IF;

  SELECT p.current_stream_id INTO v_stream_id
  FROM profiles p WHERE p.user_id = v_user_id LIMIT 1;

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
      'submission_id', s.submission_id,
      'submission_content', s.content,
      'submission_file_urls', COALESCE(
        NULLIF(s.file_urls, '[]'::jsonb),
        CASE WHEN s.file_url IS NOT NULL AND s.file_url <> ''
             THEN jsonb_build_array(s.file_url) ELSE '[]'::jsonb END
      ),
      'admin_comment', s.admin_comment
    ) ORDER BY a.created_at DESC
  )
  INTO v_homework
  FROM public.homework_assignments a
  LEFT JOIN LATERAL (
    SELECT hs.id AS submission_id, hs.status, hs.content, hs.file_url, hs.file_urls, hs.admin_comment
    FROM   public.homework_submissions hs
    WHERE  hs.assignment_id = a.id AND hs.user_id = v_user_id
    ORDER BY hs.created_at DESC
    LIMIT 1
  ) s ON true
  WHERE a.is_active = true
    AND (a.target_user_id = v_user_id
         OR (v_stream_id IS NOT NULL AND a.stream_id = v_stream_id));

  RETURN jsonb_build_object('found', true, 'homework', COALESCE(v_homework, '[]'::jsonb));
END;
$function$;

CREATE OR REPLACE FUNCTION public.submit_homework_web(
  p_assignment_id uuid,
  p_content text,
  p_file_url text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id       UUID := auth.uid();
  v_stream_id     UUID;
  v_assignment    public.homework_assignments%ROWTYPE;
  v_submission    public.homework_submissions%ROWTYPE;
  v_submission_id UUID;
  v_content       TEXT := NULLIF(BTRIM(COALESCE(p_content, '')), '');
  v_file_url      TEXT := NULLIF(BTRIM(COALESCE(p_file_url, '')), '');
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_authenticated');
  END IF;

  IF v_content IS NULL AND v_file_url IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'empty_submission');
  END IF;

  SELECT p.current_stream_id INTO v_stream_id
  FROM profiles p WHERE p.user_id = v_user_id LIMIT 1;

  SELECT * INTO v_assignment
  FROM   public.homework_assignments
  WHERE  id = p_assignment_id
    AND  is_active = true
    AND  (target_user_id = v_user_id
          OR (v_stream_id IS NOT NULL AND stream_id = v_stream_id));

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_found');
  END IF;

  SELECT * INTO v_submission
  FROM   public.homework_submissions
  WHERE  assignment_id = p_assignment_id AND user_id = v_user_id
  ORDER BY created_at DESC
  LIMIT 1
  FOR UPDATE;

  IF NOT FOUND THEN
    INSERT INTO public.homework_submissions
      (user_id, assignment_id, homework_type, content, file_url, status)
    VALUES
      (v_user_id, p_assignment_id, 'assignment', v_content, v_file_url, 'submitted')
    RETURNING id INTO v_submission_id;

    RETURN jsonb_build_object('ok', true, 'status', 'submitted',
                              'submission_id', v_submission_id, 'user_id', v_user_id);
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

  RETURN jsonb_build_object('ok', true, 'status', 'submitted',
                            'submission_id', v_submission.id, 'user_id', v_user_id);
END;
$function$;

REVOKE EXECUTE ON FUNCTION
  public.get_schedule_web(timestamptz, integer),
  public.register_for_event_web(uuid),
  public.unregister_from_event_web(uuid),
  public.check_in_activity_web(text),
  public.get_ascetic_web(),
  public.take_ascetic_web(text),
  public.checkin_ascetic_web(uuid),
  public.get_homework_web(),
  public.submit_homework_web(uuid, text, text)
FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION
  public.get_schedule_web(timestamptz, integer),
  public.register_for_event_web(uuid),
  public.unregister_from_event_web(uuid),
  public.check_in_activity_web(text),
  public.get_ascetic_web(),
  public.take_ascetic_web(text),
  public.checkin_ascetic_web(uuid),
  public.get_homework_web(),
  public.submit_homework_web(uuid, text, text)
TO authenticated, service_role;