-- Add Dmitry Shakirzyanov to trainers
INSERT INTO public.trainers (name, role, bio, is_active, sort_order)
VALUES (
  'Дмитрий Шакирзянов',
  'Организатор мероприятий',
  'Эксперт по организации мужских мероприятий',
  true,
  10
)
ON CONFLICT DO NOTHING;