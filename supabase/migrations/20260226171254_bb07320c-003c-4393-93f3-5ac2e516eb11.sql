-- Обновляем дату окончания 4-го потока
UPDATE public.streams 
SET end_date = '2026-03-22', updated_at = now()
WHERE id = 'bb78484e-e310-47f8-8e4d-8bbe9347d3a2';

-- Создаем 5-й поток с датой начала 23 марта
INSERT INTO public.streams (name, start_date, end_date, is_active, stream_type, max_participants, description)
VALUES ('5-й поток', '2026-03-23', '2026-06-01', true, 'intensive', 20, 'Пятый интенсив КЭМП');

-- Деактивируем 4-й поток
UPDATE public.streams 
SET is_active = false, updated_at = now()
WHERE id = 'bb78484e-e310-47f8-8e4d-8bbe9347d3a2';