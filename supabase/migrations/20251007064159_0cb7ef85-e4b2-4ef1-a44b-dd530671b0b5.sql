-- Создаём функцию для полного пересчета рангов всех участников
CREATE OR REPLACE FUNCTION public.recalculate_all_ranks()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  -- Сначала сбрасываем все ранги в 0
  UPDATE leaderboard SET rank_position = 0;
  
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
  SET rank_position = COALESCE((SELECT rank_position FROM leaderboard WHERE user_id = p.user_id), 0);
END;
$function$;

-- Создаём триггерную функцию для пересчета рангов при изменении видимости
CREATE OR REPLACE FUNCTION public.trigger_recalculate_ranks()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  -- Проверяем, изменились ли поля, влияющие на видимость
  IF (TG_OP = 'UPDATE' AND (
    OLD.approved IS DISTINCT FROM NEW.approved OR
    OLD.leaderboard_visible IS DISTINCT FROM NEW.leaderboard_visible OR
    OLD.profile_private IS DISTINCT FROM NEW.profile_private
  )) THEN
    -- Вызываем полный пересчет рангов
    PERFORM recalculate_all_ranks();
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Создаём триггер на таблице profiles
DROP TRIGGER IF EXISTS on_profile_visibility_change ON profiles;
CREATE TRIGGER on_profile_visibility_change
AFTER UPDATE ON profiles
FOR EACH ROW
EXECUTE FUNCTION trigger_recalculate_ranks();