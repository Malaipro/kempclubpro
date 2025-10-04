-- Обновляем существующие display_name, чтобы показывать полные имена
UPDATE public.testimonials
SET display_name = participant_name
WHERE participant_name IS NOT NULL 
  AND display_name IS DISTINCT FROM participant_name;