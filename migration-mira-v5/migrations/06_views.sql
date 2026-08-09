-- 06_views.sql (v4)
-- В действующей базе КЭМП НЕТ ни одного VIEW в схеме public.
-- v4 добавляет ДВА безопасных публичных представления, чтобы роль anon
-- больше не читала таблицы public_profiles и cooper_test_results целиком.
--
-- Представления создаются владельцем (postgres) и НЕ используют security_invoker,
-- поэтому фильтрация выполняется внутри самого представления, а не через RLS.
-- Ключ участника отдаётся как псевдоним (md5 от uuid + соль), чтобы фронтенд мог
-- группировать строки, не получая реальный user_id.

-- ---------------------------------------------------------------
-- 1. Публичный рейтинг (замена anon-доступа к public_profiles)
--    Колонки: только псевдоним, отображаемое имя, баллы, позиция, статус, поток.
--    НЕ содержит: id, user_id, first_name, last_name, created_at/updated_at.
-- ---------------------------------------------------------------
CREATE OR REPLACE VIEW public.public_leaderboard_view
WITH (security_barrier = true) AS
SELECT
  md5(pp.user_id::text || 'mira-public-v4')     AS participant_key,
  pp.display_name,
  pp.total_points,
  pp.rank_position,
  pp.participant_status,
  pp.current_stream_id
FROM public.public_profiles pp
WHERE pp.display_name IS NOT NULL
  AND pp.participant_status IN ('intensive_active', 'club_resident');

-- ---------------------------------------------------------------
-- 2. Публичные результаты теста Купера (замена anon-доступа к таблице)
--    Колонки: псевдоним, отображаемое имя, результат, уровень, этап, дата.
--    НЕ содержит: id, user_id, age, gender, notes, verified_by, created_at.
-- ---------------------------------------------------------------
CREATE OR REPLACE VIEW public.public_cooper_results_view
WITH (security_barrier = true) AS
SELECT
  md5(c.user_id::text || 'mira-public-v4')      AS participant_key,
  pp.display_name,
  c.total_time,
  c.fitness_level,
  c.test_phase,
  c.test_date::date                              AS test_date
FROM public.cooper_test_results c
JOIN public.public_profiles pp ON pp.user_id = c.user_id
WHERE c.verified = true
  AND pp.participant_status IN ('intensive_active', 'club_resident');

-- Гранты на представления выданы в 07_grants.sql.
