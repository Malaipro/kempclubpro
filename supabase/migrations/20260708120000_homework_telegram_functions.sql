-- Домашние задания для Telegram Mini App
--
-- 1. get_homework_for_user  — активные ДЗ участника (по stream_id или personal
--    target_user_id) вместе со статусом его сдачи по каждому
-- 2. submit_homework        — отправка/пересдача ответа на ДЗ

-- ────────────────────────────────────────────────────────────────
-- 1. get_homework_for_user
-- ────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_homework_for_user(
  p_telegram_id TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id   UUID;
  v_stream_id UUID;
  v_homework  JSONB;
BEGIN
  SELECT p.user_id, p.current_stream_id
  INTO   v_user_id, v_stream_id
  FROM   profiles p
  WHERE  p.telegram_id = p_telegram_id
  LIMIT  1;

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('found', false, 'error', 'not_linked');
  END IF;

  SELECT jsonb_agg(
    jsonb_build_object(
      'id', a.id,
      'title', a.title,
      'theme', a.theme,
      'content', a.content,
      'deadline', a.deadline,
      'points_reward', a.points_reward,
      'status', s.status,
      'submission_content', s.content,
      'admin_comment', s.admin_comment
    )
    ORDER BY a.created_at DESC
  )
  INTO v_homework
  FROM   public.homework_assignments a
  LEFT JOIN LATERAL (
    SELECT hs.status, hs.content, hs.admin_comment
    FROM   public.homework_submissions hs
    WHERE  hs.assignment_id = a.id
      AND  hs.user_id = v_user_id
    ORDER BY hs.created_at DESC
    LIMIT  1
  ) s ON true
  WHERE  a.is_active = true
    AND  (
      a.target_user_id = v_user_id
      OR (v_stream_id IS NOT NULL AND a.stream_id = v_stream_id)
    );

  RETURN jsonb_build_object('found', true, 'homework', COALESCE(v_homework, '[]'::jsonb));
END;
$$;


-- ────────────────────────────────────────────────────────────────
-- 2. submit_homework
-- ────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.submit_homework(
  p_telegram_id   TEXT,
  p_assignment_id UUID,
  p_content       TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id      UUID;
  v_stream_id    UUID;
  v_assignment   public.homework_assignments%ROWTYPE;
  v_submission   public.homework_submissions%ROWTYPE;
BEGIN
  SELECT p.user_id, p.current_stream_id
  INTO   v_user_id, v_stream_id
  FROM   profiles p
  WHERE  p.telegram_id = p_telegram_id
  LIMIT  1;

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_linked');
  END IF;

  SELECT * INTO v_assignment
  FROM   public.homework_assignments
  WHERE  id = p_assignment_id
    AND  is_active = true
    AND  (
      target_user_id = v_user_id
      OR (v_stream_id IS NOT NULL AND stream_id = v_stream_id)
    );

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_found');
  END IF;

  SELECT * INTO v_submission
  FROM   public.homework_submissions
  WHERE  assignment_id = p_assignment_id
    AND  user_id = v_user_id
  ORDER BY created_at DESC
  LIMIT  1
  FOR UPDATE;

  IF NOT FOUND THEN
    INSERT INTO public.homework_submissions (user_id, assignment_id, homework_type, content, status)
    VALUES (v_user_id, p_assignment_id, 'assignment', p_content, 'submitted');
    RETURN jsonb_build_object('ok', true, 'status', 'submitted');
  END IF;

  IF v_submission.status <> 'rework' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'already_submitted');
  END IF;

  UPDATE public.homework_submissions
  SET content = p_content,
      status = 'submitted',
      admin_comment = NULL,
      reviewed_at = NULL,
      reviewed_by = NULL,
      verified = false,
      points_earned = 0
  WHERE id = v_submission.id;

  RETURN jsonb_build_object('ok', true, 'status', 'submitted');
END;
$$;
