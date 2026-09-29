-- web-app-resident.sql — Кабинет резидентов для /app (Web Mini App)
-- UP: новые _web RPC для истории интенсива и рейтинга резидентов.

CREATE OR REPLACE FUNCTION public.get_intensive_history_web()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_profile record;
  v_stream record;
  v_homework jsonb;
  v_checkins jsonb;
  v_ascetics jsonb;
  v_rating jsonb;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_authenticated');
  END IF;

  SELECT p.participant_status, p.current_stream_id, p.stream_start_date, p.stream_end_date
    INTO v_profile
    FROM profiles p
   WHERE p.user_id = v_uid;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'profile_not_found');
  END IF;

  SELECT s.id, s.name, s.start_date, s.end_date
    INTO v_stream
    FROM streams s
   WHERE s.id = v_profile.current_stream_id;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
           'id', hs.id,
           'assignment_id', hs.assignment_id,
           'title', ha.title,
           'status', hs.status,
           'submitted_at', hs.submitted_at,
           'reviewed_at', hs.reviewed_at,
           'feedback', hs.admin_comment
         ) ORDER BY hs.submitted_at DESC), '[]'::jsonb)
    INTO v_homework
    FROM homework_submissions hs
    LEFT JOIN homework_assignments ha ON ha.id = hs.assignment_id
   WHERE hs.user_id = v_uid;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
           'id', ac.id,
           'activity_type', ac.activity_type,
           'checked_in_at', ac.checked_at
         ) ORDER BY ac.checked_at DESC), '[]'::jsonb)
    INTO v_checkins
    FROM activity_checkins ac
   WHERE ac.user_id = v_uid;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
           'id', aa.id,
           'ascetic_type', at.name,
           'challenge_name', aa.challenge_name,
           'streak', aa.streak,
           'completion_percentage', aa.completion_percentage,
           'completed_at', aa.completed_at,
           'points_earned', aa.points_earned
         ) ORDER BY aa.created_at DESC), '[]'::jsonb)
    INTO v_ascetics
    FROM ascetic_activities aa
    LEFT JOIN ascetic_types at ON at.id = aa.ascetic_type_id
   WHERE aa.user_id = v_uid;

  SELECT COALESCE(jsonb_build_object(
           'total_points', l.total_points,
           'rank_position', l.rank_position
         ), '{}'::jsonb)
    INTO v_rating
    FROM leaderboard l
   WHERE l.user_id = v_uid;

  RETURN jsonb_build_object(
    'ok', true,
    'stream', CASE WHEN v_stream.id IS NULL THEN NULL ELSE jsonb_build_object(
      'id', v_stream.id,
      'name', v_stream.name,
      'start_date', v_stream.start_date,
      'end_date', v_stream.end_date
    ) END,
    'stream_start_date', v_profile.stream_start_date,
    'stream_end_date', v_profile.stream_end_date,
    'homework', v_homework,
    'checkins', v_checkins,
    'ascetics', v_ascetics,
    'rating', v_rating
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_intensive_history_web() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_intensive_history_web() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_intensive_history_web() TO service_role;

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

-- Политики storage.objects для бакета chat-files (фото в чате).
-- Бакет создаётся отдельно через storage_create_bucket (public, 10 МБ).
CREATE POLICY "Users upload chat files to their topics"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'chat-files'
  AND (storage.foldername(name))[1]::uuid IN (
    SELECT ct.id
      FROM chat_topics ct
      JOIN chat_spaces cs ON cs.id = ct.space_id
     WHERE cs.target_status IN (
       SELECT p.participant_status::text
         FROM profiles p
        WHERE p.user_id = auth.uid()
     )
  )
);

CREATE POLICY "Users read chat files"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'chat-files');

CREATE POLICY "Users delete own chat files"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'chat-files' AND owner = auth.uid());

-- DOWN (откат) — выполнять вручную при необходимости:
-- DROP POLICY IF EXISTS "Users upload chat files to their topics" ON storage.objects;
-- DROP POLICY IF EXISTS "Users read chat files" ON storage.objects;
-- DROP POLICY IF EXISTS "Users delete own chat files" ON storage.objects;
-- DROP FUNCTION IF EXISTS public.get_resident_rating_web();
-- DROP FUNCTION IF EXISTS public.get_intensive_history_web();