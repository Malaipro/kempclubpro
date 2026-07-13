-- Профиль для Telegram Mini App: просмотр/редактирование личных данных +
-- просмотр результатов (тест Купера, тотемы), плюс bucket 'avatars'.
--
-- get_profile_for_user    — имя/фамилия, вес/рост/дата рождения, аватар,
--                            последний тест Купера, список тотемов
-- update_profile_for_user — сохраняет вес/рост/дату рождения
-- update_avatar_for_user  — сохраняет avatar_url после загрузки файла

-- ────────────────────────────────────────────────────────────────
-- 1. Storage bucket 'avatars'
-- ────────────────────────────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public can view avatars"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

CREATE POLICY "Users upload own avatar"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users update own avatar"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users delete own avatar"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
);


-- ────────────────────────────────────────────────────────────────
-- 2. get_profile_for_user
-- ────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_profile_for_user(
  p_telegram_id TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_profile JSONB;
  v_cooper  JSONB;
  v_totems  JSONB;
BEGIN
  SELECT p.user_id INTO v_user_id
  FROM   profiles p
  WHERE  p.telegram_id = p_telegram_id
  LIMIT  1;

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('found', false, 'error', 'not_linked');
  END IF;

  SELECT jsonb_build_object(
    'first_name',    p.first_name,
    'last_name',     p.last_name,
    'avatar_url',    p.avatar_url,
    'weight_kg',     p.weight_kg,
    'height_cm',     p.height_cm,
    'date_of_birth', p.date_of_birth
  )
  INTO v_profile
  FROM   profiles p
  WHERE  p.user_id = v_user_id;

  -- Последний тест Купера (текущая схема — время прохождения, не дистанция)
  SELECT jsonb_build_object(
    'test_date',     c.test_date,
    'total_minutes', c.total_minutes,
    'total_seconds', c.total_seconds,
    'fitness_level', c.fitness_level
  )
  INTO v_cooper
  FROM   cooper_test_results c
  WHERE  c.user_id = v_user_id
  ORDER BY c.test_date DESC
  LIMIT  1;

  -- Тотемы участника
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id',          t.id,
      'name',        t.name,
      'discipline',  t.discipline,
      'icon_name',   t.icon_name,
      'icon_color',  t.icon_color,
      'assigned_at', ut.assigned_at
    )
    ORDER BY ut.assigned_at DESC
  ), '[]'::jsonb)
  INTO v_totems
  FROM   user_totems ut
  JOIN   totems t ON t.id = ut.totem_id
  WHERE  ut.user_id = v_user_id;

  RETURN jsonb_build_object(
    'found',       true,
    'profile',     v_profile,
    'cooper_test', v_cooper,
    'totems',      v_totems
  );
END;
$$;


-- ────────────────────────────────────────────────────────────────
-- 3. update_profile_for_user — вес/рост/дата рождения
-- ────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.update_profile_for_user(
  p_telegram_id   TEXT,
  p_weight_kg     INTEGER,
  p_height_cm     INTEGER,
  p_date_of_birth DATE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  SELECT p.user_id INTO v_user_id
  FROM   profiles p
  WHERE  p.telegram_id = p_telegram_id
  LIMIT  1;

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_linked');
  END IF;

  UPDATE profiles
  SET    weight_kg     = p_weight_kg,
         height_cm     = p_height_cm,
         date_of_birth = p_date_of_birth
  WHERE  user_id = v_user_id;

  RETURN jsonb_build_object(
    'ok',            true,
    'weight_kg',     p_weight_kg,
    'height_cm',     p_height_cm,
    'date_of_birth', p_date_of_birth
  );
END;
$$;


-- ────────────────────────────────────────────────────────────────
-- 4. update_avatar_for_user — сохраняет ссылку на загруженное фото
-- ────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.update_avatar_for_user(
  p_telegram_id TEXT,
  p_avatar_url  TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  SELECT p.user_id INTO v_user_id
  FROM   profiles p
  WHERE  p.telegram_id = p_telegram_id
  LIMIT  1;

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_linked');
  END IF;

  UPDATE profiles
  SET    avatar_url = p_avatar_url
  WHERE  user_id = v_user_id;

  RETURN jsonb_build_object('ok', true, 'avatar_url', p_avatar_url);
END;
$$;
