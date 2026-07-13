-- Рейтинг для Telegram Mini App: моя статистика + топ-10 потока
--
-- get_rating_for_user возвращает:
--   my          — позиция, очки, разбивка по активностям (leaderboard),
--                 посещаемость (activity_checkins) текущего участника
--   leaderboard — топ-10 участников того же потока (current_stream_id),
--                 отсортированных по rank_position, с флагом is_me
--
-- Видимость топа повторяет фильтр recalculate_all_ranks(): approved,
-- leaderboard_visible, не profile_private, исключая admin/super_admin.

CREATE OR REPLACE FUNCTION public.get_rating_for_user(
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
  v_my        JSONB;
  v_board     JSONB;
BEGIN
  SELECT p.user_id, p.current_stream_id
  INTO   v_user_id, v_stream_id
  FROM   profiles p
  WHERE  p.telegram_id = p_telegram_id
  LIMIT  1;

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('found', false, 'error', 'not_linked');
  END IF;

  -- Моя статистика: очки/разбивка из leaderboard, позиция из profiles
  SELECT jsonb_build_object(
    'rank_position', p.rank_position,
    'total_points',  COALESCE(l.total_points, p.total_points, 0),
    'breakdown', jsonb_build_object(
      'bjj',          COALESCE(l.bjj_points, 0),
      'kickboxing',   COALESCE(l.kickboxing_points, 0),
      'ofp',          COALESCE(l.ofp_points, 0),
      'theory',       COALESCE(l.theory_points, 0),
      'tactical',     COALESCE(l.tactical_points, 0),
      'nutrition',    COALESCE(l.nutrition_points, 0),
      'kamp_pyramid', COALESCE(l.kamp_pyramid_points, 0),
      'challenges',   COALESCE(l.challenges_points, 0)
    ),
    'attendance', (
      SELECT jsonb_build_object(
        'total',   COALESCE(SUM(t.cnt), 0),
        'by_type', COALESCE(jsonb_agg(
                     jsonb_build_object('activity_type', t.activity_type, 'count', t.cnt)
                     ORDER BY t.activity_type
                   ), '[]'::jsonb)
      )
      FROM (
        SELECT activity_type, COUNT(*) AS cnt
        FROM   public.activity_checkins
        WHERE  user_id = v_user_id
        GROUP BY activity_type
      ) t
    )
  )
  INTO v_my
  FROM   profiles p
  LEFT JOIN leaderboard l ON l.user_id = p.user_id
  WHERE  p.user_id = v_user_id;

  -- Топ-10 потока
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'user_id',       x.user_id,
      'display_name',  x.display_name,
      'first_name',    x.first_name,
      'last_name',     x.last_name,
      'avatar_url',    x.avatar_url,
      'rank_position', x.rank_position,
      'total_points',  x.total_points,
      'is_me',         x.user_id = v_user_id
    )
    ORDER BY x.rank_position ASC
  ), '[]'::jsonb)
  INTO v_board
  FROM (
    SELECT p2.user_id, p2.display_name, p2.first_name, p2.last_name, p2.avatar_url,
           p2.rank_position, COALESCE(l2.total_points, p2.total_points, 0) AS total_points
    FROM   profiles p2
    LEFT JOIN leaderboard l2 ON l2.user_id = p2.user_id
    WHERE  p2.current_stream_id = v_stream_id
      AND  p2.approved = true
      AND  COALESCE(p2.leaderboard_visible, true) = true
      AND  COALESCE(p2.profile_private, false) = false
      AND  p2.rank_position IS NOT NULL
      AND  p2.user_id NOT IN (
             SELECT ur.user_id FROM user_roles ur WHERE ur.role IN ('admin', 'super_admin')
           )
    ORDER BY p2.rank_position ASC
    LIMIT 10
  ) x;

  RETURN jsonb_build_object(
    'found',       true,
    'stream_id',   v_stream_id,
    'my',          v_my,
    'leaderboard', v_board
  );
END;
$$;
