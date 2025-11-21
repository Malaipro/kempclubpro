-- Создаем политику для публичного чтения результатов теста Купера
-- Разрешаем видеть проверенные результаты только для участников,
-- чьи профили публичны и видны в рейтинге
CREATE POLICY "Public can view verified Cooper test results for visible participants"
ON cooper_test_results
FOR SELECT
TO public
USING (
  verified = true
  AND EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.user_id = cooper_test_results.user_id
      AND profiles.approved = true
      AND COALESCE(profiles.leaderboard_visible, true) = true
      AND COALESCE(profiles.profile_private, false) = false
  )
);