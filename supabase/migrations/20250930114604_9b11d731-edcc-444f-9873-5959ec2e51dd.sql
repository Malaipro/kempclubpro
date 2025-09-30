-- Разрешить публичный доступ на чтение leaderboard для видимых профилей
-- Это позволит показывать детализацию баллов на главной странице сайта

CREATE POLICY "Public can view leaderboard for visible profiles"
ON public.leaderboard
FOR SELECT
TO public
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.user_id = leaderboard.user_id
    AND profiles.leaderboard_visible = true
    AND profiles.approved = true
    AND profiles.profile_private = false
  )
);