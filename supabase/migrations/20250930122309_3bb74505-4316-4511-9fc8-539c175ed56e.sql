-- Удаляем старую политику с неправильной ссылкой на profiles
DROP POLICY IF EXISTS "Anonymous users can view leaderboard for visible profiles" ON public.leaderboard;

-- Создаем новую политику для anon, использующую public_profiles
CREATE POLICY "Anon can view leaderboard via public_profiles"
ON public.leaderboard
FOR SELECT
TO anon
USING (
  EXISTS (
    SELECT 1 FROM public.public_profiles
    WHERE public_profiles.user_id = leaderboard.user_id
  )
);