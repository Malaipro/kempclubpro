-- Добавляем политику для просмотра результатов теста Купера активных участников интенсива
-- Это позволит видеть результаты тестов участников со статусом intensive_active

CREATE POLICY "Public can view Cooper test results for intensive active participants"
ON cooper_test_results
FOR SELECT
USING (
  verified = true 
  AND EXISTS (
    SELECT 1 
    FROM public_profiles
    WHERE public_profiles.user_id = cooper_test_results.user_id
    AND public_profiles.participant_status = 'intensive_active'
  )
);