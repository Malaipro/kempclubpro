-- Fix leaderboard update triggers and ensure they fire for all activity tables

-- Update function to recalculate leaderboard when any activity is added/updated
CREATE OR REPLACE FUNCTION public.update_user_leaderboard(user_uuid uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_training_points INTEGER := 0;
  v_tactical_points INTEGER := 0;
  v_theory_points INTEGER := 0;
  v_challenge_points INTEGER := 0;
  v_bjj_points INTEGER := 0;
  v_kick_points INTEGER := 0;
  v_ofp_points INTEGER := 0;
  v_total_points INTEGER := 0;
  v_other_points INTEGER := 0;
BEGIN
  -- Баллы из тренировочных сессий (только подтвержденные)
  SELECT COALESCE(SUM(points_earned), 0) INTO v_training_points
  FROM training_sessions 
  WHERE user_id = user_uuid AND verified = true;
  
  -- Разбивка по типам активности в тренировочных сессиях  
  SELECT 
    COALESCE(SUM(CASE WHEN session_type = 'bjj' OR activity_type = 'bjj' THEN points_earned ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN session_type = 'kickboxing' OR activity_type = 'kickboxing' THEN points_earned ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN session_type = 'physical' OR activity_type = 'ofp' THEN points_earned ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN session_type = 'theory' OR activity_type = 'theory' THEN points_earned ELSE 0 END), 0)
  INTO v_bjj_points, v_kick_points, v_ofp_points, v_theory_points
  FROM training_sessions 
  WHERE user_id = user_uuid AND verified = true;

  -- Баллы из тактических сессий
  SELECT COALESCE(SUM(points_earned), 0) INTO v_tactical_points
  FROM tactical_sessions 
  WHERE user_id = user_uuid AND verified = true;
  
  -- Баллы из других активностей
  SELECT 
    COALESCE(SUM(points_earned), 0) INTO v_other_points
  FROM (
    SELECT points_earned FROM hero_races WHERE user_id = user_uuid AND verified = true
    UNION ALL
    SELECT points_earned FROM crash_tests WHERE user_id = user_uuid AND verified = true
    UNION ALL
    SELECT points_earned FROM homework_submissions WHERE user_id = user_uuid AND verified = true
    UNION ALL
    SELECT points_earned FROM lectures WHERE user_id = user_uuid AND verified = true
    UNION ALL
    SELECT points_earned FROM ascetic_activities WHERE user_id = user_uuid AND verified = true
  ) all_activities;

  -- Общий подсчет баллов
  v_total_points := v_training_points + v_tactical_points + v_other_points;

  -- Обновляем или вставляем запись в leaderboard
  INSERT INTO leaderboard (
    user_id, 
    total_points, 
    bjj_points, 
    kickboxing_points, 
    ofp_points, 
    theory_points, 
    tactical_points,
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
    v_tactical_points + v_other_points, -- добавляем остальные баллы к тактическим
    v_challenge_points,
    0, -- monthly_points пока 0
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
    challenges_points = EXCLUDED.challenges_points,
    last_updated = now();

  -- Обновляем позиции в рейтинге
  WITH ranked_users AS (
    SELECT 
      l.user_id,
      ROW_NUMBER() OVER (ORDER BY l.total_points DESC, l.last_updated ASC) as new_rank
    FROM leaderboard l
    WHERE l.total_points > 0
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
$$;

-- Create triggers for all activity tables to update leaderboard
CREATE OR REPLACE FUNCTION public.trigger_update_leaderboard()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Обновляем рейтинг для затронутого пользователя
  IF TG_OP = 'DELETE' THEN
    PERFORM update_user_leaderboard(OLD.user_id);
    RETURN OLD;
  ELSE
    PERFORM update_user_leaderboard(NEW.user_id);
    RETURN NEW;
  END IF;
END;
$$;

-- Drop existing triggers to avoid conflicts
DROP TRIGGER IF EXISTS update_leaderboard_on_training_session ON training_sessions;
DROP TRIGGER IF EXISTS update_leaderboard_on_tactical_session ON tactical_sessions;
DROP TRIGGER IF EXISTS update_leaderboard_on_hero_race ON hero_races;
DROP TRIGGER IF EXISTS update_leaderboard_on_crash_test ON crash_tests;
DROP TRIGGER IF EXISTS update_leaderboard_on_homework ON homework_submissions;
DROP TRIGGER IF EXISTS update_leaderboard_on_lecture ON lectures;
DROP TRIGGER IF EXISTS update_leaderboard_on_ascetic ON ascetic_activities;

-- Create triggers for all activity tables
CREATE TRIGGER update_leaderboard_on_training_session
  AFTER INSERT OR UPDATE OR DELETE ON training_sessions
  FOR EACH ROW EXECUTE FUNCTION trigger_update_leaderboard();

CREATE TRIGGER update_leaderboard_on_tactical_session
  AFTER INSERT OR UPDATE OR DELETE ON tactical_sessions
  FOR EACH ROW EXECUTE FUNCTION trigger_update_leaderboard();

CREATE TRIGGER update_leaderboard_on_hero_race
  AFTER INSERT OR UPDATE OR DELETE ON hero_races
  FOR EACH ROW EXECUTE FUNCTION trigger_update_leaderboard();

CREATE TRIGGER update_leaderboard_on_crash_test
  AFTER INSERT OR UPDATE OR DELETE ON crash_tests
  FOR EACH ROW EXECUTE FUNCTION trigger_update_leaderboard();

CREATE TRIGGER update_leaderboard_on_homework
  AFTER INSERT OR UPDATE OR DELETE ON homework_submissions
  FOR EACH ROW EXECUTE FUNCTION trigger_update_leaderboard();

CREATE TRIGGER update_leaderboard_on_lecture
  AFTER INSERT OR UPDATE OR DELETE ON lectures
  FOR EACH ROW EXECUTE FUNCTION trigger_update_leaderboard();

CREATE TRIGGER update_leaderboard_on_ascetic
  AFTER INSERT OR UPDATE OR DELETE ON ascetic_activities
  FOR EACH ROW EXECUTE FUNCTION trigger_update_leaderboard();

-- Force update all existing user leaderboards
DO $$
DECLARE
  user_record RECORD;
BEGIN
  FOR user_record IN SELECT DISTINCT user_id FROM profiles WHERE approved = true LOOP
    PERFORM update_user_leaderboard(user_record.user_id);
  END LOOP;
END $$;