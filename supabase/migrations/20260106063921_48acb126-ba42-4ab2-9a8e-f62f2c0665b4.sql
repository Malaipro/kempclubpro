-- Деактивируем 3-й поток
UPDATE streams SET is_active = false WHERE name = '3-ий поток';

-- Создаем 4-й поток
INSERT INTO streams (name, start_date, end_date, is_active, stream_type, description, max_participants)
VALUES (
  '4-й поток',
  (CURRENT_DATE + INTERVAL '5 days')::date,
  (CURRENT_DATE + INTERVAL '5 days' + INTERVAL '8 weeks')::date,
  true,
  'intensive',
  'Четвёртый поток интенсива КЭМП',
  20
);