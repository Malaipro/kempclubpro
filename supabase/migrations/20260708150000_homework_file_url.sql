-- file_url для домашних заданий:
-- 1. Колонки file_url в homework_assignments (файл от админа к заданию)
--    и homework_submissions (файл участника в ответе)
-- 2. Публичный бакет homework
-- 3. get_homework_for_user — возвращает file_url задания и ответа
-- 4. submit_homework — принимает p_file_url

ALTER TABLE public.homework_assignments ADD COLUMN IF NOT EXISTS file_url TEXT;
ALTER TABLE public.homework_submissions ADD COLUMN IF NOT EXISTS file_url TEXT;

-- Бакет для файлов ДЗ (публичное чтение по прямой ссылке)
INSERT INTO storage.buckets (id, name, public)
VALUES ('homework', 'homework', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Admins manage homework files" ON storage.objects;
CREATE POLICY "Admins manage homework files"
ON storage.objects FOR ALL
USING (bucket_id = 'homework' AND public.is_admin(auth.uid()))
WITH CHECK (bucket_id = 'homework' AND public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Public read homework files" ON storage.objects;
CREATE POLICY "Public read homework files"
ON storage.objects FOR SELECT
USING (bucket_id = 'homework');

-- ────────────────────────────────────────────────────────────────
-- get_homework_for_user: + file_url задания и submission_file_url
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
      'file_url', a.file_url,
      'status', s.status,
      'submission_content', s.content,
      'submission_file_url', s.file_url,
      'admin_comment', s.admin_comment
    )
    ORDER BY a.created_at DESC
  )
  INTO v_homework
  FROM   public.homework_assignments a
  LEFT JOIN LATERAL (
    SELECT hs.status, hs.content, hs.file_url, hs.admin_comment
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
-- submit_homework: + p_file_url. Старую 3-аргументную версию
-- удаляем, иначе PostgREST не сможет разрешить перегрузку.
-- ────────────────────────────────────────────────────────────────
DROP FUNCTION IF EXISTS public.submit_homework(TEXT, UUID, TEXT);

CREATE OR REPLACE FUNCTION public.submit_homework(
  p_telegram_id   TEXT,
  p_assignment_id UUID,
  p_content       TEXT,
  p_file_url      TEXT DEFAULT NULL
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
  v_content      TEXT := NULLIF(BTRIM(COALESCE(p_content, '')), '');
  v_file_url     TEXT := NULLIF(BTRIM(COALESCE(p_file_url, '')), '');
BEGIN
  IF v_content IS NULL AND v_file_url IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'empty_submission');
  END IF;

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
    INSERT INTO public.homework_submissions
      (user_id, assignment_id, homework_type, content, file_url, status)
    VALUES
      (v_user_id, p_assignment_id, 'assignment', v_content, v_file_url, 'submitted');
    RETURN jsonb_build_object('ok', true, 'status', 'submitted');
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

  RETURN jsonb_build_object('ok', true, 'status', 'submitted');
END;
$$;
