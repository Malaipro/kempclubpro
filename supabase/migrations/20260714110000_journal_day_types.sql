-- Расширяем day_type «Ежедневника» с грубого weekday/saturday/sunday до
-- конкретных дней недели (monday/wednesday/friday/saturday/sunday).
--
-- ALTER TYPE ... ADD VALUE нельзя использовать в той же транзакции, где новое
-- значение уже используется (в т.ч. в INSERT ниже) — миграции применяются
-- одним скриптом/транзакцией, поэтому вместо расширения enum переводим обе
-- колонки на TEXT + CHECK. 'weekday' оставляем как допустимое значение ради
-- обратной совместимости с уже существующими записями/вопросами.

ALTER TABLE public.journal_prompts
  ALTER COLUMN day_type TYPE TEXT USING day_type::text;
ALTER TABLE public.journal_prompts
  ADD CONSTRAINT journal_prompts_day_type_check
  CHECK (day_type IN ('monday', 'wednesday', 'friday', 'saturday', 'sunday', 'weekday'));

ALTER TABLE public.journal_entries
  ALTER COLUMN day_type TYPE TEXT USING day_type::text;
ALTER TABLE public.journal_entries
  ADD CONSTRAINT journal_entries_day_type_check
  CHECK (day_type IN ('monday', 'wednesday', 'friday', 'saturday', 'sunday', 'weekday'));

-- Старые вопросы дня 'weekday' в новой схеме дней недели больше не
-- подбираются — отключаем, не удаляя (сохраняем историю уже отвеченных
-- journal_answers, которые на них ссылаются).
UPDATE public.journal_prompts SET is_active = false WHERE day_type = 'weekday';

-- Сид вопросов по дням тренировочного цикла
INSERT INTO public.journal_prompts (day_type, question_text, sort_order) VALUES
  ('monday',    'Как прошёл BJJ?', 1),
  ('monday',    'Что открыл сегодня на лекции Пирамиды?', 2),
  ('monday',    'Главное наблюдение о себе', 3),
  ('wednesday', 'Как прошла ОФП?', 1),
  ('wednesday', 'Что разобрали на разборе Пирамиды?', 2),
  ('wednesday', 'Что далось труднее всего?', 3),
  ('friday',    'Как прошёл кикбоксинг?', 1),
  ('friday',    'Главное по нутрициологии сегодня?', 2),
  ('friday',    'Итог недели — коротко', 3);

-- saturday/sunday не меняются — их вопросы уже засеяны в предыдущей миграции
-- и остаются активными без изменений.


-- ────────────────────────────────────────────────────────────────
-- get_journal_for_user — теперь определяет конкретный день недели, а не
-- грубый weekday/saturday/sunday. Вторник/четверг своих вопросов не имеют —
-- показываем понедельничные как дефолт.
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
-- save_journal_entry — day_type теперь просто TEXT, без каста на enum
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

  IF p_day_type NOT IN ('monday', 'wednesday', 'friday', 'saturday', 'sunday', 'weekday') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_day_type');
  END IF;

  INSERT INTO public.journal_entries (user_id, entry_date, day_type)
  VALUES (v_user_id, p_entry_date, p_day_type)
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
