-- Удаляем старые публичные политики если они есть
DROP POLICY IF EXISTS "Public can view totems of approved participants" ON public.user_totems;
DROP POLICY IF EXISTS "Public can view crash tests of approved participants" ON public.crash_tests;

-- Создаем новые рабочие политики для публичного просмотра
CREATE POLICY "Anon can view totems of approved participants"
ON public.user_totems
FOR SELECT
TO anon, authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.user_id = user_totems.user_id
    AND profiles.approved = true
    AND profiles.leaderboard_visible = true
    AND profiles.profile_private = false
  )
);

CREATE POLICY "Anon can view crash tests of approved participants"
ON public.crash_tests
FOR SELECT
TO anon, authenticated
USING (
  verified = true
  AND EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.user_id = crash_tests.user_id
    AND profiles.approved = true
    AND profiles.leaderboard_visible = true
    AND profiles.profile_private = false
  )
);