-- Добавляем политику для просмотра результатов теста Купера резидентов клуба
-- Это позволит видеть результаты тестов участников со статусом club_resident

CREATE POLICY "Public can view Cooper test results for club residents"
ON cooper_test_results
FOR SELECT
USING (
  verified = true 
  AND EXISTS (
    SELECT 1 
    FROM public_profiles
    WHERE public_profiles.user_id = cooper_test_results.user_id
    AND public_profiles.participant_status = 'club_resident'
  )
);