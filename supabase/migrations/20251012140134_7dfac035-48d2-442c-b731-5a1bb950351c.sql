-- Fix: UPDATE requires a WHERE clause in recalculate_all_ranks
-- Добавляем WHERE TRUE к UPDATE без WHERE для соблюдения safe-update режима

CREATE OR REPLACE FUNCTION public.recalculate_all_ranks()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Сначала сбрасываем все ранги в 0 (добавлен WHERE TRUE для safe-update)
  UPDATE leaderboard SET rank_position = 0 WHERE TRUE;
  
  -- Пересчитываем ранги только для видимых участников (не админов)
  WITH visible_admins AS (
    SELECT user_id FROM user_roles 
    WHERE role IN ('admin', 'super_admin')
  ),
  ranked_users AS (
    SELECT 
      l.user_id,
      ROW_NUMBER() OVER (ORDER BY l.total_points DESC, l.last_updated ASC) as new_rank
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