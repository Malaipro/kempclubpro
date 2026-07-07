-- Аскезы для Telegram Mini App: текущая аскеза участника + дневной стрик
--
-- ascetic_activities уже существует (лог выполненных активностей); здесь она
-- переиспользуется как хранилище "текущей аскезы": последняя по completed_at
-- запись пользователя — это его активная аскеза, notes — текст аскезы.
--
-- 1. streak / last_checkin_date — новые поля для подсчёта дней подряд
-- 2. get_ascetic_for_user  — текущая аскеза участника + статус на сегодня
-- 3. take_ascetic          — взять новую аскезу (INSERT), стрик стартует с 0
-- 4. checkin_ascetic       — отметить сегодняшний день ("День +")

-- ────────────────────────────────────────────────────────────────
-- 1. Поля для стрика
-- ────────────────────────────────────────────────────────────────
ALTER TABLE public.ascetic_activities
  ADD COLUMN IF NOT EXISTS streak INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_checkin_date DATE;


-- ────────────────────────────────────────────────────────────────
-- 2. get_ascetic_for_user
-- ────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_ascetic_for_user(
  p_telegram_id TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_row     RECORD;
BEGIN
  SELECT p.user_id INTO v_user_id
  FROM   profiles p
  WHERE  p.telegram_id = p_telegram_id
  LIMIT  1;

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('found', false, 'error', 'not_linked');
  END IF;

  -- Текущая аскеза — последняя по completed_at запись пользователя
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
    'found',           true,
    'has_ascetic',     true,
    'id',              v_row.id,
    'text',            v_row.notes,
    'streak',          v_row.streak,
    'checked_in_today', v_row.last_checkin_date = CURRENT_DATE
  );
END;
$$;


-- ────────────────────────────────────────────────────────────────
-- 3. take_ascetic
-- ────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.take_ascetic(
  p_telegram_id TEXT,
  p_text        TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_id      UUID;
BEGIN
  SELECT p.user_id INTO v_user_id
  FROM   profiles p
  WHERE  p.telegram_id = p_telegram_id
  LIMIT  1;

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_linked');
  END IF;

  INSERT INTO public.ascetic_activities (user_id, activity_type, notes, streak, last_checkin_date)
  VALUES (v_user_id, 'ascetic_vow', p_text, 0, NULL)
  RETURNING id INTO v_id;

  RETURN jsonb_build_object(
    'ok',               true,
    'id',               v_id,
    'text',             p_text,
    'streak',           0,
    'checked_in_today', false
  );
END;
$$;


-- ────────────────────────────────────────────────────────────────
-- 4. checkin_ascetic — "День +"
-- ────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.checkin_ascetic(
  p_telegram_id TEXT,
  p_ascetic_id  UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_row     RECORD;
  v_streak  INT;
BEGIN
  SELECT p.user_id INTO v_user_id
  FROM   profiles p
  WHERE  p.telegram_id = p_telegram_id
  LIMIT  1;

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_linked');
  END IF;

  -- FOR UPDATE — блокируем строку на время подсчёта стрика (та же защита от
  -- гонки, что и в book_schedule_session)
  SELECT streak, last_checkin_date
  INTO   v_row
  FROM   public.ascetic_activities
  WHERE  id = p_ascetic_id
    AND  user_id = v_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_found');
  END IF;

  IF v_row.last_checkin_date = CURRENT_DATE THEN
    RETURN jsonb_build_object(
      'ok',              true,
      'checked_in',      false,
      'already_checked', true,
      'streak',          v_row.streak
    );
  END IF;

  -- Стрик продолжается только если вчера уже был чекин, иначе стартует заново
  IF v_row.last_checkin_date = CURRENT_DATE - 1 THEN
    v_streak := v_row.streak + 1;
  ELSE
    v_streak := 1;
  END IF;

  UPDATE public.ascetic_activities
  SET streak = v_streak,
      last_checkin_date = CURRENT_DATE
  WHERE id = p_ascetic_id;

  RETURN jsonb_build_object(
    'ok',              true,
    'checked_in',      true,
    'already_checked', false,
    'streak',          v_streak
  );
END;
$$;
