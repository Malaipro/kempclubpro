-- Ежедневник участника для Telegram Mini App
--
-- get_journal_for_user — вопросы дня (по day_type, вычисленному из даты) +
--                         запись участника за эту дату, если уже сохранена
-- save_journal_entry   — сохраняет запись за день: сам entry + эмоции +
--                         ответы на вопросы. Одна запись на (user_id, entry_date) —
--                         повторное сохранение за уже занятую дату не проходит,
--                         запись за день не редактируется.

-- ────────────────────────────────────────────────────────────────
-- 1. get_journal_for_user
-- ────────────────────────────────────────────────────────────────
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
  v_day_type public.journal_day_type;
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

  -- EXTRACT(DOW): 0 = воскресенье, 6 = суббота, остальное — будний день
  v_day_type := CASE EXTRACT(DOW FROM p_date)
                  WHEN 0 THEN 'sunday'::public.journal_day_type
                  WHEN 6 THEN 'saturday'::public.journal_day_type
                  ELSE 'weekday'::public.journal_day_type
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
      'id',         je.id,
      'entry_date', je.entry_date,
      'day_type',   je.day_type,
      'emotions', (
        SELECT COALESCE(jsonb_agg(
          jsonb_build_object('emotion_name', em.emotion_name, 'intensity', em.intensity)
        ), '[]'::jsonb)
        FROM public.journal_emotions em
        WHERE em.entry_id = je.id
      ),
      'answers', (
        SELECT COALESCE(jsonb_agg(
          jsonb_build_object('prompt_id', a.prompt_id, 'answer_text', a.answer_text)
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


-- ────────────────────────────────────────────────────────────────
-- 2. save_journal_entry
-- ────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.save_journal_entry(
  p_telegram_id TEXT,
  p_entry_date  DATE,
  p_day_type    TEXT,
  p_emotions    JSONB,
  p_answers     JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id  UUID;
  v_entry_id UUID;
BEGIN
  SELECT p.user_id INTO v_user_id
  FROM   profiles p
  WHERE  p.telegram_id = p_telegram_id
  LIMIT  1;

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_linked');
  END IF;

  IF p_day_type NOT IN ('weekday', 'saturday', 'sunday') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_day_type');
  END IF;

  INSERT INTO public.journal_entries (user_id, entry_date, day_type)
  VALUES (v_user_id, p_entry_date, p_day_type::public.journal_day_type)
  ON CONFLICT (user_id, entry_date) DO NOTHING
  RETURNING id INTO v_entry_id;

  IF v_entry_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'already_exists');
  END IF;

  INSERT INTO public.journal_emotions (entry_id, emotion_name, intensity)
  SELECT v_entry_id, elem->>'name', (elem->>'intensity')::int
  FROM   jsonb_array_elements(COALESCE(p_emotions, '[]'::jsonb)) elem;

  INSERT INTO public.journal_answers (entry_id, prompt_id, answer_text)
  SELECT v_entry_id, (elem->>'prompt_id')::uuid, elem->>'text'
  FROM   jsonb_array_elements(COALESCE(p_answers, '[]'::jsonb)) elem;

  RETURN jsonb_build_object(
    'ok', true,
    'entry', jsonb_build_object(
      'id',         v_entry_id,
      'entry_date', p_entry_date,
      'day_type',   p_day_type,
      'emotions', (
        SELECT COALESCE(jsonb_agg(
          jsonb_build_object('emotion_name', em.emotion_name, 'intensity', em.intensity)
        ), '[]'::jsonb)
        FROM public.journal_emotions em
        WHERE em.entry_id = v_entry_id
      ),
      'answers', (
        SELECT COALESCE(jsonb_agg(
          jsonb_build_object('prompt_id', a.prompt_id, 'answer_text', a.answer_text)
        ), '[]'::jsonb)
        FROM public.journal_answers a
        WHERE a.entry_id = v_entry_id
      )
    )
  );
END;
$$;
