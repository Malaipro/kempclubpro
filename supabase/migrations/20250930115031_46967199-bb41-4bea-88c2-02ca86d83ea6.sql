-- Удаляем политику с неправильной ролью
DROP POLICY IF EXISTS "Public can view leaderboard for visible profiles" ON public.leaderboard;

-- Создаем правильную политику для анонимных пользователей (роль anon)
CREATE POLICY "Anonymous users can view leaderboard for visible profiles"
ON public.leaderboard
FOR SELECT
TO anon
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.user_id = leaderboard.user_id
    AND profiles.leaderboard_visible = true
    AND profiles.approved = true
    AND profiles.profile_private = false
  )
);