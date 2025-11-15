-- Update recalculate_all_ranks to calculate positions per stream
CREATE OR REPLACE FUNCTION public.recalculate_all_ranks()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Сбрасываем все ранги в 0
  UPDATE leaderboard SET rank_position = 0 WHERE TRUE;
  
  -- Пересчитываем ранги отдельно для каждого потока
  WITH visible_admins AS (
    SELECT user_id FROM user_roles 
    WHERE role IN ('admin', 'super_admin')
  ),
  ranked_users AS (
    SELECT 
      l.user_id,
      ROW_NUMBER() OVER (
        PARTITION BY p.current_stream_id 
        ORDER BY l.total_points DESC, l.last_updated ASC
      ) as new_rank
    FROM leaderboard l
    INNER JOIN profiles p ON p.user_id = l.user_id
    WHERE l.total_points > 0
      AND p.approved = true
      AND COALESCE(p.leaderboard_visible, true) = true
      AND COALESCE(p.profile_private, false) = false
      AND l.user_id NOT IN (SELECT user_id FROM visible_admins)
  )
  UPDATE leaderboard 
  SET rank_position = ranked_users.new_rank
  FROM ranked_users
  WHERE leaderboard.user_id = ranked_users.user_id;
  
  -- Обновляем rank_position в таблице profiles
  UPDATE profiles p
  SET rank_position = COALESCE((SELECT rank_position FROM leaderboard WHERE user_id = p.user_id), 0)
  WHERE TRUE;
END;
$function$;

-- Update update_user_leaderboard to recalculate ranks per stream after update
CREATE OR REPLACE FUNCTION public.update_user_leaderboard(user_uuid uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_training_points INTEGER := 0;
  v_tactical_points INTEGER := 0;
  v_theory_points INTEGER := 0;
  v_challenge_points INTEGER := 0;
  v_bjj_points INTEGER := 0;
  v_kick_points INTEGER := 0;
  v_ofp_points INTEGER := 0;
  v_nutrition_points INTEGER := 0;
  v_kamp_pyramid_points INTEGER := 0;
  v_total_points INTEGER := 0;
  v_other_points INTEGER := 0;
  v_crash_bjj INTEGER := 0;
  v_crash_kick INTEGER := 0;
  v_crash_ofp INTEGER := 0;
  v_stream_id UUID;
BEGIN
  -- Get user's stream_id
  SELECT current_stream_id INTO v_stream_id FROM profiles WHERE user_id = user_uuid;

  -- Баллы из тренировочных сессий (только подтвержденные)
  SELECT COALESCE(SUM(points_earned), 0) INTO v_training_points
  FROM training_sessions 
  WHERE user_id = user_uuid AND verified = true;
  
  -- Разбивка по типам активности в тренировочных сессиях  
  SELECT 
    COALESCE(SUM(CASE WHEN session_type = 'bjj' OR activity_type = 'bjj' THEN points_earned ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN session_type = 'kickboxing' OR activity_type = 'kickboxing' THEN points_earned ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN session_type = 'physical' OR activity_type = 'ofp' THEN points_earned ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN session_type = 'theory' OR activity_type = 'theory' THEN points_earned ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN session_type = 'tactics' OR activity_type = 'tactics' THEN points_earned ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN session_type = 'nutrition' OR activity_type = 'nutrition' THEN points_earned ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN session_type = 'kamp_pyramid' OR activity_type = 'kamp_pyramid' THEN points_earned ELSE 0 END), 0)
  INTO v_bjj_points, v_kick_points, v_ofp_points, v_theory_points, v_tactical_points, v_nutrition_points, v_kamp_pyramid_points
  FROM training_sessions 
  WHERE user_id = user_uuid AND verified = true;

  -- Баллы из краш-тестов по дисциплинам
  SELECT 
    COALESCE(SUM(CASE WHEN LOWER(test_type) = 'bjj' THEN points_earned ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN LOWER(test_type) = 'kickboxing' THEN points_earned ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN LOWER(test_type) = 'ofp' THEN points_earned ELSE 0 END), 0)
  INTO v_crash_bjj, v_crash_kick, v_crash_ofp
  FROM crash_tests 
  WHERE user_id = user_uuid AND verified = true AND passed = true;

  -- Добавляем краш-тесты к соответствующим категориям
  v_bjj_points := v_bjj_points + v_crash_bjj;
  v_kick_points := v_kick_points + v_crash_kick;
  v_ofp_points := v_ofp_points + v_crash_ofp;

  -- Баллы из тактических сессий
  SELECT COALESCE(SUM(points_earned), 0) INTO v_other_points
  FROM tactical_sessions 
  WHERE user_id = user_uuid AND verified = true;
  
  v_tactical_points := v_tactical_points + v_other_points;
  
  -- Баллы из других активностей
  SELECT 
    COALESCE(SUM(points_earned), 0) INTO v_other_points
  FROM (
    SELECT points_earned FROM hero_races WHERE user_id = user_uuid AND verified = true
    UNION ALL
    SELECT points_earned FROM homework_submissions WHERE user_id = user_uuid AND verified = true
    UNION ALL
    SELECT points_earned FROM lectures WHERE user_id = user_uuid AND verified = true
    UNION ALL
    SELECT points_earned FROM ascetic_activities WHERE user_id = user_uuid AND verified = true
  ) all_activities;

  v_tactical_points := v_tactical_points + v_other_points;
  v_total_points := v_training_points + v_tactical_points + v_other_points + v_crash_bjj + v_crash_kick + v_crash_ofp;

  -- Обновляем или вставляем запись в leaderboard
  INSERT INTO leaderboard (
    user_id, 
    total_points, 
    bjj_points, 
    kickboxing_points, 
    ofp_points, 
    theory_points, 
    tactical_points,
    nutrition_points,
    kamp_pyramid_points,
    challenges_points,
    monthly_points,
    last_updated
  ) VALUES (
    user_uuid,
    v_total_points,
    v_bjj_points,
    v_kick_points,
    v_ofp_points, 
    v_theory_points,
    v_tactical_points,
    v_nutrition_points,
    v_kamp_pyramid_points,
    v_challenge_points,
    0,
    now()
  )
  ON CONFLICT (user_id) 
  DO UPDATE SET
    total_points = EXCLUDED.total_points,
    bjj_points = EXCLUDED.bjj_points,
    kickboxing_points = EXCLUDED.kickboxing_points,
    ofp_points = EXCLUDED.ofp_points,
    theory_points = EXCLUDED.theory_points,
    tactical_points = EXCLUDED.tactical_points,
    nutrition_points = EXCLUDED.nutrition_points,
    kamp_pyramid_points = EXCLUDED.kamp_pyramid_points,
    challenges_points = EXCLUDED.challenges_points,
    last_updated = now();

  -- Пересчитываем позиции в рейтинге по потокам
  WITH visible_admins AS (
    SELECT user_id FROM user_roles 
    WHERE role IN ('admin', 'super_admin')
  ),
  ranked_users AS (
    SELECT 
      l.user_id,
      ROW_NUMBER() OVER (
        PARTITION BY p.current_stream_id 
        ORDER BY l.total_points DESC, l.last_updated ASC
      ) as new_rank
    FROM leaderboard l
    INNER JOIN profiles p ON p.user_id = l.user_id
    WHERE l.total_points > 0
      AND p.current_stream_id = v_stream_id
      AND p.approved = true
      AND COALESCE(p.leaderboard_visible, true) = true
      AND COALESCE(p.profile_private, false) = false
      AND l.user_id NOT IN (SELECT user_id FROM visible_admins)
  )
  UPDATE leaderboard 
  SET rank_position = ranked_users.new_rank
  FROM ranked_users
  WHERE leaderboard.user_id = ranked_users.user_id;

  -- Update profiles table with latest points and rank
  UPDATE profiles 
  SET 
    total_points = v_total_points,
    rank_position = COALESCE((SELECT rank_position FROM leaderboard WHERE user_id = user_uuid), 0)
  WHERE user_id = user_uuid;

END;
$function$;