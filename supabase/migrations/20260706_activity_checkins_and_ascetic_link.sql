-- Активити-чекины (attendance) + связка ascetic_activities → ascetic_types
--
-- 1. ascetic_activities.ascetic_type_id — ссылка на справочник ascetic_types
--    (раньше activity_type в ascetic_activities был свободным текстом, никак
--    не связанным с ascetic_types)
-- 2. activity_checkins — ежедневные отметки посещения/выполнения активности
-- 3. RLS: пользователь видит и создаёт только свои чекины
-- 4. check_in_activity(p_telegram_id, p_activity_type) — чекин из Telegram Mini App
--    (тот же паттерн поиска профиля по telegram_id, что и в
--    get_schedule_for_user / book_schedule_session)

-- ────────────────────────────────────────────────────────────────
-- 1. Связь ascetic_activities → ascetic_types
-- ────────────────────────────────────────────────────────────────
ALTER TABLE public.ascetic_activities
  ADD COLUMN IF NOT EXISTS ascetic_type_id UUID REFERENCES public.ascetic_types(id);


-- ────────────────────────────────────────────────────────────────
-- 2. Таблица activity_checkins
-- ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.activity_checkins (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL,
  checked_at    DATE NOT NULL DEFAULT CURRENT_DATE,
  stream_id     UUID REFERENCES public.streams(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, activity_type, checked_at)
);

CREATE INDEX IF NOT EXISTS idx_activity_checkins_user_id ON public.activity_checkins(user_id);


-- ────────────────────────────────────────────────────────────────
-- 3. RLS
-- ────────────────────────────────────────────────────────────────
ALTER TABLE public.activity_checkins ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own checkins" ON public.activity_checkins;
CREATE POLICY "Users can view their own checkins"
ON public.activity_checkins
FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own checkins" ON public.activity_checkins;
CREATE POLICY "Users can insert their own checkins"
ON public.activity_checkins
FOR INSERT
WITH CHECK (auth.uid() = user_id);


-- ────────────────────────────────────────────────────────────────
-- 4. check_in_activity — чекин из Telegram Mini App по telegram_id
-- ────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.check_in_activity(
  p_telegram_id   TEXT,
  p_activity_type TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id       UUID;
  v_stream_id     UUID;
  v_rows_inserted INT;
BEGIN
  -- Ищем профиль по telegram_id (тот же паттерн что в get_schedule_for_user)
  SELECT p.user_id, p.current_stream_id
  INTO   v_user_id, v_stream_id
  FROM   profiles p
  WHERE  p.telegram_id = p_telegram_id
  LIMIT  1;

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'checked_in',     false,
      'already_checked', false,
      'date',           NULL,
      'reason',         'not_linked'
    );
  END IF;

  INSERT INTO activity_checkins (user_id, activity_type, stream_id)
  VALUES (v_user_id, p_activity_type, v_stream_id)
  ON CONFLICT (user_id, activity_type, checked_at) DO NOTHING;

  GET DIAGNOSTICS v_rows_inserted = ROW_COUNT;

  RETURN jsonb_build_object(
    'checked_in',      v_rows_inserted > 0,
    'already_checked', v_rows_inserted = 0,
    'date',            CURRENT_DATE
  );
END;
$$;
