-- Пирамида КЭМП: 7 уровней, показываются в Telegram Mini App.
--
-- pyramid_levels — справочник уровней. is_unlocked — глобальный флаг
-- (открывает уровень всем участникам разом, включается администратором
-- по мере прохождения потока), а не персональный прогресс пользователя.
--
-- get_pyramid_for_user(p_telegram_id) — резолвит telegram_id -> profile
-- (как и другие Telegram RPC), чтобы отдавать данные только привязанным
-- участникам, и возвращает все уровни с их is_unlocked.

CREATE TABLE public.pyramid_levels (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  level_number     INTEGER NOT NULL CHECK (level_number BETWEEN 1 AND 7),
  title            TEXT NOT NULL,
  description      TEXT,
  presentation_url TEXT,
  is_unlocked      BOOLEAN NOT NULL DEFAULT false,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (level_number)
);

ALTER TABLE public.pyramid_levels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view pyramid levels"
ON public.pyramid_levels FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins manage pyramid levels"
ON public.pyramid_levels FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

INSERT INTO public.pyramid_levels (level_number, title, description, is_unlocked) VALUES
  (1, 'Действия',     'Ежедневные действия — фундамент любого результата.', true),
  (2, 'Привычки',      'Устойчивые повторяющиеся действия, которые становятся автоматическими.', false),
  (3, 'Среда',         'Окружение, которое поддерживает твои привычки и действия.', false),
  (4, 'Идентичность',  'Кто ты есть — то, во что ты веришь о самом себе.', false),
  (5, 'Убеждения',     'Установки, которые определяют твои решения и границы возможного.', false),
  (6, 'Ценности',      'То, что для тебя действительно важно и на что ты опираешься.', false),
  (7, 'Миссия',        'Твоё предназначение — то, ради чего всё остальное имеет смысл.', false);


-- ────────────────────────────────────────────────────────────────
-- get_pyramid_for_user
-- ────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_pyramid_for_user(
  p_telegram_id TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_levels  JSONB;
BEGIN
  SELECT p.user_id INTO v_user_id
  FROM   profiles p
  WHERE  p.telegram_id = p_telegram_id
  LIMIT  1;

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('found', false, 'error', 'not_linked');
  END IF;

  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id',               l.id,
      'level_number',     l.level_number,
      'title',            l.title,
      'description',      l.description,
      'presentation_url', l.presentation_url,
      'is_unlocked',      l.is_unlocked
    )
    ORDER BY l.level_number ASC
  ), '[]'::jsonb)
  INTO v_levels
  FROM   public.pyramid_levels l;

  RETURN jsonb_build_object('found', true, 'levels', v_levels);
END;
$$;
