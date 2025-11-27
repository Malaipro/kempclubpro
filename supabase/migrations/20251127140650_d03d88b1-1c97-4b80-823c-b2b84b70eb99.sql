-- Создаём или заменяем функцию update_participant_status с правильной логикой
CREATE OR REPLACE FUNCTION update_participant_status(
  p_user_id uuid,
  p_new_status participant_status_type
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Обновляем статус участника
  UPDATE profiles
  SET 
    participant_status = p_new_status,
    -- Устанавливаем intensive_completed_at если переводим в "intensive_completed" или "club_resident"
    intensive_completed_at = CASE 
      WHEN p_new_status IN ('intensive_completed', 'club_resident', 'alumni') 
           AND intensive_completed_at IS NULL 
      THEN now()
      ELSE intensive_completed_at
    END,
    -- Устанавливаем club_joined_at если переводим в "club_resident"
    club_joined_at = CASE 
      WHEN p_new_status = 'club_resident' AND club_joined_at IS NULL 
      THEN now()
      ELSE club_joined_at
    END,
    updated_at = now()
  WHERE user_id = p_user_id;

  -- Обновляем leaderboard
  PERFORM update_user_leaderboard(p_user_id);
END;
$$;

-- Даём права на выполнение функции аутентифицированным пользователям
GRANT EXECUTE ON FUNCTION update_participant_status(uuid, participant_status_type) TO authenticated;