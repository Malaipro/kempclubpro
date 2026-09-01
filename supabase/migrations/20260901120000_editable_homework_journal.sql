-- ════════════════════════════════════════════════════════════════
-- Редактирование ДЗ и рефлексии в Mini App до проверки тренером
--   • journal_entries.is_reviewed     — флаг проверки записи ежедневника
--   • homework_submissions.file_urls   — массив файлов ответа (мультизагрузка)
--   • get_journal_for_user  — отдаёт answers[].id + entry.is_reviewed
--   • get_homework_for_user — отдаёт submission_id + submission_file_urls
-- ════════════════════════════════════════════════════════════════

-- 1. Новые колонки ──────────────────────────────────────────────
ALTER TABLE public.journal_entries
  ADD COLUMN IF NOT EXISTS is_reviewed boolean NOT NULL DEFAULT false;

ALTER TABLE public.homework_submissions
  ADD COLUMN IF NOT EXISTS file_urls jsonb NOT NULL DEFAULT '[]'::jsonb;

-- 2. get_journal_for_user ──────────────────────────────────────
-- Добавлены id у ответов (нужен для точечного апдейта journal_answers)
-- и is_reviewed у записи (скрывает кнопку редактирования после проверки).
CREATE OR REPLACE FUNCTION public.get_journal_for_user(
  p_telegram_id TEXT,
  p_date        DATE DEFAULT CURRENT_DATE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id  UUID;
  v_day_type TEXT;
  v_prompts  JSONB;
  v_entry_id UUID;
  v_entry    JSONB;
BEGIN
  SELECT p.user_id INTO v_user_id
  FROM   profiles p
  WHERE  p.telegram_id = p_telegram_id
  LIMIT  1;

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('found', false, 'error', 'not_linked');
  END IF;

  -- EXTRACT(DOW): 0=вс, 1=пн, 2=вт, 3=ср, 4=чт, 5=пт, 6=сб
  v_day_type := CASE EXTRACT(DOW FROM p_date)
                  WHEN 1 THEN 'monday'
                  WHEN 3 THEN 'wednesday'
                  WHEN 5 THEN 'friday'
                  WHEN 6 THEN 'saturday'
                  WHEN 0 THEN 'sunday'
                  ELSE 'monday'
                END;

  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id',            jp.id,
      'question_text', jp.question_text,
      'sort_order',    jp.sort_order
    )
    ORDER BY jp.sort_order
  ), '[]'::jsonb)
  INTO v_prompts
  FROM   public.journal_prompts jp
  WHERE  jp.day_type = v_day_type
    AND  jp.is_active = true;

  SELECT je.id INTO v_entry_id
  FROM   public.journal_entries je
  WHERE  je.user_id = v_user_id
    AND  je.entry_date = p_date
  LIMIT  1;

  IF v_entry_id IS NOT NULL THEN
    SELECT jsonb_build_object(
      'id',          je.id,
      'entry_date',  je.entry_date,
      'day_type',    je.day_type,
      'is_reviewed', je.is_reviewed,
      'emotions', (
        SELECT COALESCE(jsonb_agg(
          jsonb_build_object('emotion_name', em.emotion_name, 'intensity', em.intensity)
        ), '[]'::jsonb)
        FROM public.journal_emotions em
        WHERE em.entry_id = je.id
      ),
      'answers', (
        SELECT COALESCE(jsonb_agg(
          jsonb_build_object('id', a.id, 'prompt_id', a.prompt_id, 'answer_text', a.answer_text)
          ORDER BY a.created_at
        ), '[]'::jsonb)
        FROM public.journal_answers a
        WHERE a.entry_id = je.id
      )
    )
    INTO v_entry
    FROM   public.journal_entries je
    WHERE  je.id = v_entry_id;
  END IF;

  RETURN jsonb_build_object(
    'found',    true,
    'date',     p_date,
    'day_type', v_day_type,
    'prompts',  v_prompts,
    'entry',    v_entry
  );
END;
$$;

-- 3. get_homework_for_user ─────────────────────────────────────
-- Добавлены submission_id (для update_homework_submission) и
-- submission_file_urls (массив; с обратной совместимостью со старым file_url).
CREATE OR REPLACE FUNCTION public.get_homework_for_user(p_telegram_id text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
      'submission_id', s.submission_id,
      'submission_content', s.content,
      'submission_file_urls', COALESCE(
        NULLIF(s.file_urls, '[]'::jsonb),
        CASE WHEN s.file_url IS NOT NULL AND s.file_url <> ''
             THEN jsonb_build_array(s.file_url)
             ELSE '[]'::jsonb END
      ),
      'admin_comment', s.admin_comment
    )
    ORDER BY a.created_at DESC
  )
  INTO v_homework
  FROM   public.homework_assignments a
  LEFT JOIN LATERAL (
    SELECT hs.id AS submission_id, hs.status, hs.content, hs.file_url, hs.file_urls, hs.admin_comment
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
$function$;
