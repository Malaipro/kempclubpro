-- Политика для публичного просмотра тотемов одобренных участников
CREATE POLICY "Public can view totems of approved participants"
ON public.user_totems
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.user_id = user_totems.user_id
    AND profiles.approved = true
    AND profiles.leaderboard_visible = true
  )
);

-- Политика для публичного просмотра краш-тестов одобренных участников
CREATE POLICY "Public can view crash tests of approved participants"
ON public.crash_tests
FOR SELECT
USING (
  verified = true
  AND EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.user_id = crash_tests.user_id
    AND profiles.approved = true
    AND profiles.leaderboard_visible = true
  )
);