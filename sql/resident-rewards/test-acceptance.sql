-- ============================================================================
-- sql/resident-rewards/test-acceptance.sql — приёмочные тесты наград КЭМП.
-- ТОЛЬКО локальный синтетический стенд. Запуск через test-local.sh.
-- Покрывает сценарии 1-5 и 7-12 из KEMP-CHECKINS-REWARDS-01 (этап E);
-- параллельные сессии (сценарий 6) — в test-local.sh.
-- Синтетические UUID: пользователи 22…/33…, события 11….
-- ============================================================================
\set ON_ERROR_STOP on

CREATE OR REPLACE FUNCTION pg_temp.t_assert(p_label text, p_actual text, p_expected text)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  IF p_actual IS DISTINCT FROM p_expected THEN
    RAISE EXCEPTION 'FAIL %: expected %, got %', p_label, p_expected, p_actual;
  END IF;
  RAISE NOTICE 'PASS %', p_label;
END $$;

-- ---------------------------------------------------------------------------
-- 0. Чистка предыдущих прогонов и сид синтетики.
-- ---------------------------------------------------------------------------
SELECT id AS founder_id FROM auth.users WHERE email = 'admin.pr10@example.test' \gset
SELECT id AS r1_id FROM auth.users WHERE email = 'resident.pr10@example.test' \gset

DELETE FROM public.schedules WHERE id IN (
  '11111111-1111-4111-8111-111111111100','11111111-1111-4111-8111-111111111101',
  '11111111-1111-4111-8111-111111111102','11111111-1111-4111-8111-111111111103',
  '11111111-1111-4111-8111-111111111104');
DELETE FROM public.resident_reward_awards WHERE user_id IN (:'r1_id', '22222222-2222-4222-8222-222222222202', '33333333-3333-4333-8333-333333333303');
DELETE FROM public.coin_transactions WHERE user_id IN (:'r1_id', '22222222-2222-4222-8222-222222222202', '33333333-3333-4333-8333-333333333303');
DELETE FROM public.leaderboard WHERE user_id IN (:'r1_id', '22222222-2222-4222-8222-222222222202', '33333333-3333-4333-8333-333333333303');
DELETE FROM public.profiles WHERE user_id IN ('22222222-2222-4222-8222-222222222202', '33333333-3333-4333-8333-333333333303');
DELETE FROM auth.users WHERE id IN ('22222222-2222-4222-8222-222222222202', '33333333-3333-4333-8333-333333333303');

INSERT INTO auth.users (id, email) VALUES
  ('22222222-2222-4222-8222-222222222202', 'resident2.rewards@example.test'),
  ('33333333-3333-4333-8333-333333333303', 'resident3.rewards@example.test');
INSERT INTO public.profiles (user_id, participant_status, approved, display_name, first_name, last_name)
VALUES
  ('22222222-2222-4222-8222-222222222202', 'club_resident', true, 'Тест Резидентова', 'Тест', 'Резидентова'),
  ('33333333-3333-4333-8333-333333333303', 'club_resident', true, 'Проверка Третьякова', 'Проверка', 'Третьякова');

-- События недели зачёта 2026-11-23 (Пн 06:00 МСК): БЖЖ / ОФП / кикбоксинг.
INSERT INTO public.schedules (id, title, activity_type, start_time, end_time, schedule_type, club_kind, booking_mode, is_active)
VALUES
  ('11111111-1111-4111-8111-111111111101', 'БЖЖ', 'БЖЖ', '2026-11-23 06:00:00+03', '2026-11-23 07:30:00+03', 'club', 'training_bjj', 'free', true),
  ('11111111-1111-4111-8111-111111111102', 'ОФП', 'ОФП', '2026-11-25 06:00:00+03', '2026-11-25 07:30:00+03', 'club', 'training_ofp', 'free', true),
  ('11111111-1111-4111-8111-111111111103', 'Кикбоксинг', 'Кикбоксинг', '2026-11-27 06:00:00+03', '2026-11-27 07:30:00+03', 'club', 'training_kick', 'free', true),
  ('11111111-1111-4111-8111-111111111104', 'Встреча без истории', 'Встреча', '2026-11-25 19:00:00+03', '2026-11-25 20:00:00+03', 'club', 'other', 'free', true);

-- История интенсива: r1 = 35 баллов, r2 = 50 баллов (реестр резидентов пуст).
INSERT INTO public.leaderboard (user_id, total_points, rank_position) VALUES
  (:'r1_id', 35, 1),
  ('22222222-2222-4222-8222-222222222202', 50, 2);

-- r1 записан на все три тренировки недели.
INSERT INTO public.schedule_participants (schedule_id, user_id)
SELECT s.id, :'r1_id' FROM public.schedules s
WHERE s.id IN ('11111111-1111-4111-8111-111111111101','11111111-1111-4111-8111-111111111102','11111111-1111-4111-8111-111111111103');

-- ---------------------------------------------------------------------------
-- Тест 1: 0/3 → 0 баллов, 0 коинов.
-- ---------------------------------------------------------------------------
BEGIN;
SELECT set_config('request.jwt.claims', jsonb_build_object('sub', :'r1_id', 'role', 'authenticated')::text, true);
SELECT (r->>'points_total') AS pts, (r->>'coins_from_awards') AS coins
  FROM (SELECT public.get_resident_rewards_web() AS r) t \gset
COMMIT;
SELECT pg_temp.t_assert('T1 0/3: баллы=0', :'pts', '0');
SELECT pg_temp.t_assert('T1 0/3: коины=0', :'coins', '0');

-- ---------------------------------------------------------------------------
-- Тест 2: 1/3 → +10 баллов, 0 коинов.
-- ---------------------------------------------------------------------------
BEGIN;
SELECT set_config('request.jwt.claims', jsonb_build_object('sub', :'founder_id', 'role', 'authenticated')::text, true);
SELECT (r->>'updated') AS updated, (r->>'skipped') AS skipped, (r->'awards') AS awards
  FROM (SELECT public.founder_confirm_attendance(
    '11111111-1111-4111-8111-111111111101',
    jsonb_build_array(jsonb_build_object('user_id', :'r1_id', 'attended', true))) AS r) t \gset
COMMIT;
SELECT pg_temp.t_assert('T2 подтверждено=1', :'updated', '1');
SELECT pg_temp.t_assert('T2 награда +10', (:'awards' LIKE '%"points_delta": 10%')::text, 'true');

BEGIN;
SELECT set_config('request.jwt.claims', jsonb_build_object('sub', :'r1_id', 'role', 'authenticated')::text, true);
SELECT (r->>'points_total') AS pts, (r->>'coins_from_awards') AS coins, (r->>'trainings_confirmed') AS trn
  FROM (SELECT public.get_resident_rewards_web() AS r) t \gset
COMMIT;
SELECT pg_temp.t_assert('T2 1/3: баллы=10', :'pts', '10');
SELECT pg_temp.t_assert('T2 1/3: коины=0', :'coins', '0');
SELECT pg_temp.t_assert('T2 1/3: тренировок=1', :'trn', '1');

-- ---------------------------------------------------------------------------
-- Тест 3: 2/3 → +20 баллов, 0 коинов.
-- ---------------------------------------------------------------------------
BEGIN;
SELECT set_config('request.jwt.claims', jsonb_build_object('sub', :'founder_id', 'role', 'authenticated')::text, true);
SELECT public.founder_confirm_attendance(
  '11111111-1111-4111-8111-111111111102',
  jsonb_build_array(jsonb_build_object('user_id', :'r1_id', 'attended', true)));
COMMIT;

BEGIN;
SELECT set_config('request.jwt.claims', jsonb_build_object('sub', :'r1_id', 'role', 'authenticated')::text, true);
SELECT (r->>'points_total') AS pts, (r->>'coins_from_awards') AS coins
  FROM (SELECT public.get_resident_rewards_web() AS r) t \gset
COMMIT;
SELECT pg_temp.t_assert('T3 2/3: баллы=20', :'pts', '20');
SELECT pg_temp.t_assert('T3 2/3: коины=0', :'coins', '0');

-- ---------------------------------------------------------------------------
-- Тест 4: 3/3 → +40 баллов, +70 коинов; ровно одна транзакция.
-- ---------------------------------------------------------------------------
BEGIN;
SELECT set_config('request.jwt.claims', jsonb_build_object('sub', :'founder_id', 'role', 'authenticated')::text, true);
SELECT public.founder_confirm_attendance(
  '11111111-1111-4111-8111-111111111103',
  jsonb_build_array(jsonb_build_object('user_id', :'r1_id', 'attended', true)));
COMMIT;

BEGIN;
SELECT set_config('request.jwt.claims', jsonb_build_object('sub', :'r1_id', 'role', 'authenticated')::text, true);
SELECT (r->>'points_total') AS pts, (r->>'coins_from_awards') AS coins, (r->>'week_bonuses') AS bonuses
  FROM (SELECT public.get_resident_rewards_web() AS r) t \gset
COMMIT;
SELECT pg_temp.t_assert('T4 3/3: баллы=40', :'pts', '40');
SELECT pg_temp.t_assert('T4 3/3: коины=70', :'coins', '70');
SELECT pg_temp.t_assert('T4 3/3: бонусов=1', :'bonuses', '1');

SELECT count(*)::text AS tx_cnt, COALESCE(sum(amount),0)::text AS tx_sum
  FROM public.coin_transactions WHERE user_id = :'r1_id' \gset
SELECT pg_temp.t_assert('T4 транзакций=1', :'tx_cnt', '1');
SELECT pg_temp.t_assert('T4 сумма коинов=70', :'tx_sum', '70');
SELECT pg_temp.t_assert('T4 баланс RPC=70', public.get_user_coin_balance(:'r1_id')::text, '70');

-- ---------------------------------------------------------------------------
-- Тест 5: повторное подтверждение → 0 дополнительных начислений.
-- ---------------------------------------------------------------------------
BEGIN;
SELECT set_config('request.jwt.claims', jsonb_build_object('sub', :'founder_id', 'role', 'authenticated')::text, true);
SELECT (r->>'updated') AS updated, (r->>'skipped') AS skipped
  FROM (SELECT public.founder_confirm_attendance(
    '11111111-1111-4111-8111-111111111103',
    jsonb_build_array(jsonb_build_object('user_id', :'r1_id', 'attended', true))) AS r) t \gset
COMMIT;
SELECT pg_temp.t_assert('T5 повтор: updated=0', :'updated', '0');
SELECT pg_temp.t_assert('T5 повтор: skipped=1', :'skipped', '1');

BEGIN;
SELECT set_config('request.jwt.claims', jsonb_build_object('sub', :'r1_id', 'role', 'authenticated')::text, true);
SELECT (r->>'points_total') AS pts, (r->>'coins_from_awards') AS coins
  FROM (SELECT public.get_resident_rewards_web() AS r) t \gset
COMMIT;
SELECT pg_temp.t_assert('T5 баллы остались 40', :'pts', '40');
SELECT pg_temp.t_assert('T5 коины остались 70', :'coins', '70');

-- ---------------------------------------------------------------------------
-- Тест 7: «Был» → «Не был» → компенсация (-10 баллов тренировки, отмена
-- недельного бонуса -10/-70).
-- ---------------------------------------------------------------------------
BEGIN;
SELECT set_config('request.jwt.claims', jsonb_build_object('sub', :'founder_id', 'role', 'authenticated')::text, true);
SELECT (r->>'updated') AS updated
  FROM (SELECT public.founder_confirm_attendance(
    '11111111-1111-4111-8111-111111111103',
    jsonb_build_array(jsonb_build_object('user_id', :'r1_id', 'attended', false))) AS r) t \gset
COMMIT;
SELECT pg_temp.t_assert('T7 исправление применено', :'updated', '1');

BEGIN;
SELECT set_config('request.jwt.claims', jsonb_build_object('sub', :'r1_id', 'role', 'authenticated')::text, true);
SELECT (r->>'points_total') AS pts, (r->>'coins_from_awards') AS coins, (r->>'week_bonuses') AS bonuses
  FROM (SELECT public.get_resident_rewards_web() AS r) t \gset
COMMIT;
SELECT pg_temp.t_assert('T7 баллы=20', :'pts', '20');
SELECT pg_temp.t_assert('T7 коины=0', :'coins', '0');
SELECT pg_temp.t_assert('T7 бонусов=0', :'bonuses', '0');
SELECT pg_temp.t_assert('T7 баланс RPC=0', public.get_user_coin_balance(:'r1_id')::text, '0');

SELECT count(*)::text AS rev_cnt FROM public.resident_reward_awards
 WHERE user_id = :'r1_id' AND status = 'reversed' \gset
SELECT pg_temp.t_assert('T7 обращено записей=2', :'rev_cnt', '2');

-- ---------------------------------------------------------------------------
-- Тест 8: «Не был» → «Был» → корректный итог без двойного начисления.
-- ---------------------------------------------------------------------------
BEGIN;
SELECT set_config('request.jwt.claims', jsonb_build_object('sub', :'founder_id', 'role', 'authenticated')::text, true);
SELECT public.founder_confirm_attendance(
  '11111111-1111-4111-8111-111111111103',
  jsonb_build_array(jsonb_build_object('user_id', :'r1_id', 'attended', true)));
COMMIT;

BEGIN;
SELECT set_config('request.jwt.claims', jsonb_build_object('sub', :'r1_id', 'role', 'authenticated')::text, true);
SELECT (r->>'points_total') AS pts, (r->>'coins_from_awards') AS coins
  FROM (SELECT public.get_resident_rewards_web() AS r) t \gset
COMMIT;
SELECT pg_temp.t_assert('T8 баллы=40', :'pts', '40');
SELECT pg_temp.t_assert('T8 коины=70', :'coins', '70');
SELECT pg_temp.t_assert('T8 баланс RPC=70', public.get_user_coin_balance(:'r1_id')::text, '70');

SELECT count(*)::text AS aw_cnt FROM public.resident_reward_awards WHERE user_id = :'r1_id' \gset
SELECT pg_temp.t_assert('T8 записей наград=4 (3 тренировки + неделя)', :'aw_cnt', '4');

SELECT count(*)::text AS hist_ok FROM public.resident_reward_awards
 WHERE user_id = :'r1_id' AND award_kind = 'week_full' AND jsonb_array_length(history) = 3 \gset
SELECT pg_temp.t_assert('T8 история недели: awarded/reversed/restored', :'hist_ok', '1');

-- ---------------------------------------------------------------------------
-- Тест 9: перенос через границу недели сохраняет исходную неделю зачёта.
-- ---------------------------------------------------------------------------
BEGIN;
SELECT set_config('request.jwt.claims', jsonb_build_object('sub', :'founder_id', 'role', 'authenticated')::text, true);
SELECT (r->>'ok') AS ok FROM (SELECT public.founder_set_event_kind(
  '11111111-1111-4111-8111-111111111101', 'training_bjj', '2026-11-23'::date) AS r) t \gset
COMMIT;
SELECT pg_temp.t_assert('T9 якорь недели сохранён', :'ok', 'true');

-- Перенос занятия на следующий понедельник (как делает форма расписания).
UPDATE public.schedules
   SET start_time = start_time + interval '7 days',
       end_time = end_time + interval '7 days'
 WHERE id = '11111111-1111-4111-8111-111111111101';

BEGIN;
SELECT set_config('request.jwt.claims', jsonb_build_object('sub', :'r1_id', 'role', 'authenticated')::text, true);
SELECT e->>'week_start' AS wk
  FROM (SELECT public.get_resident_checkins_web() AS r) t,
       LATERAL jsonb_array_elements(t.r->'events') e
 WHERE e->>'schedule_id' = '11111111-1111-4111-8111-111111111101' \gset
COMMIT;
SELECT pg_temp.t_assert('T9 неделя зачёта=2026-11-23', :'wk', '2026-11-23');

BEGIN;
SELECT set_config('request.jwt.claims', jsonb_build_object('sub', :'r1_id', 'role', 'authenticated')::text, true);
SELECT (r->>'points_total') AS pts FROM (SELECT public.get_resident_rewards_web() AS r) t \gset
COMMIT;
SELECT pg_temp.t_assert('T9 баллы не изменились (40)', :'pts', '40');

-- ---------------------------------------------------------------------------
-- Тест 10: отмена занятия сохраняет историю и статистику; событие без
-- истории удаляется. Отменённый экземпляр остаётся у резидента в истории.
-- ---------------------------------------------------------------------------
BEGIN;
SELECT set_config('request.jwt.claims', jsonb_build_object('sub', :'founder_id', 'role', 'authenticated')::text, true);
SELECT (r->>'action') AS action FROM (SELECT public.founder_cancel_event_web('11111111-1111-4111-8111-111111111102') AS r) t \gset
COMMIT;
SELECT pg_temp.t_assert('T10 событие с историей деактивировано', :'action', 'deactivated');

SELECT is_active::text AS e2_active FROM public.schedules WHERE id = '11111111-1111-4111-8111-111111111102' \gset
SELECT pg_temp.t_assert('T10 запись события сохранена (is_active=false)', :'e2_active', 'false');

SELECT count(*)::text AS sp_cnt FROM public.schedule_participants
 WHERE schedule_id = '11111111-1111-4111-8111-111111111102' AND attended_marked_at IS NOT NULL \gset
SELECT pg_temp.t_assert('T10 история посещений сохранена', :'sp_cnt', '1');

BEGIN;
SELECT set_config('request.jwt.claims', jsonb_build_object('sub', :'r1_id', 'role', 'authenticated')::text, true);
SELECT count(*)::text AS e2_in_history
  FROM (SELECT public.get_resident_checkins_web() AS r) t,
       LATERAL jsonb_array_elements(t.r->'events') e
 WHERE e->>'schedule_id' = '11111111-1111-4111-8111-111111111102' \gset
COMMIT;
SELECT pg_temp.t_assert('T10 отменённое занятие в истории резидента', :'e2_in_history', '1');

BEGIN;
SELECT set_config('request.jwt.claims', jsonb_build_object('sub', :'r1_id', 'role', 'authenticated')::text, true);
SELECT (r->>'points_total') AS pts, (r->>'coins_from_awards') AS coins
  FROM (SELECT public.get_resident_rewards_web() AS r) t \gset
COMMIT;
SELECT pg_temp.t_assert('T10 баллы сохранены (40)', :'pts', '40');
SELECT pg_temp.t_assert('T10 коины сохранены (70)', :'coins', '70');

BEGIN;
SELECT set_config('request.jwt.claims', jsonb_build_object('sub', :'founder_id', 'role', 'authenticated')::text, true);
SELECT (r->>'action') AS action FROM (SELECT public.founder_cancel_event_web('11111111-1111-4111-8111-111111111104') AS r) t \gset
COMMIT;
SELECT pg_temp.t_assert('T10 событие без истории удалено', :'action', 'deleted');
SELECT pg_temp.t_assert('T10 строка удалена',
  (SELECT count(*)::text FROM public.schedules WHERE id = '11111111-1111-4111-8111-111111111104'), '0');

-- ---------------------------------------------------------------------------
-- Тест 11: ручное начисление коинов не меняет рейтинг и баллы.
-- ---------------------------------------------------------------------------
BEGIN;
SELECT set_config('request.jwt.claims', jsonb_build_object('sub', :'founder_id', 'role', 'authenticated')::text, true);
SELECT public.admin_adjust_coins(:'r1_id', 500, 'Ручная корректировка (тест)');
COMMIT;
SELECT pg_temp.t_assert('T11 баланс=570 (70 бонус + 500 вручную)',
  public.get_user_coin_balance(:'r1_id')::text, '570');

BEGIN;
SELECT set_config('request.jwt.claims', jsonb_build_object('sub', :'r1_id', 'role', 'authenticated')::text, true);
SELECT (r->>'points_total') AS pts FROM (SELECT public.get_resident_rewards_web() AS r) t \gset
COMMIT;
SELECT pg_temp.t_assert('T11 баллы резидента не изменились (40)', :'pts', '40');

-- ---------------------------------------------------------------------------
-- Тест 12: рейтинг резидентов = интенсив (leaderboard) + резидентские баллы;
-- старые баллы интенсива сохранены; коины на рейтинг не влияют.
-- ---------------------------------------------------------------------------
BEGIN;
SELECT set_config('request.jwt.claims', jsonb_build_object('sub', :'r1_id', 'role', 'authenticated')::text, true);
SELECT (r->>'my_position') AS my_pos,
       (SELECT e->>'total_points' FROM jsonb_array_elements(r->'entries') e WHERE (e->>'is_me')::boolean) AS my_points
  FROM (SELECT public.get_resident_rating_web() AS r) t \gset
COMMIT;
SELECT pg_temp.t_assert('T12 мой рейтинг=75 (35 интенсив + 40 резидент)', :'my_points', '75');
SELECT pg_temp.t_assert('T12 моя позиция=1', :'my_pos', '1');

-- ---------------------------------------------------------------------------
-- Тест 13 (доп.): исторические подтверждения до включения системы не
-- порождают наград автоматически (без массового перерасчёта).
-- ---------------------------------------------------------------------------
INSERT INTO public.schedules (id, title, activity_type, start_time, end_time, schedule_type, club_kind, booking_mode, is_active)
VALUES ('11111111-1111-4111-8111-111111111100', 'БЖЖ (старое)', 'БЖЖ', '2026-11-09 06:00:00+03', '2026-11-09 07:30:00+03', 'club', 'training_bjj', 'free', true);
INSERT INTO public.schedule_participants (schedule_id, user_id, attended, attended_marked_at, attended_marked_by)
VALUES ('11111111-1111-4111-8111-111111111100', '22222222-2222-4222-8222-222222222202', true, '2026-11-09 08:00:00+03', :'founder_id');

BEGIN;
SELECT set_config('request.jwt.claims', jsonb_build_object('sub', '22222222-2222-4222-8222-222222222202', 'role', 'authenticated')::text, true);
SELECT (r->>'points_total') AS pts, (r->>'coins_from_awards') AS coins
  FROM (SELECT public.get_resident_rewards_web() AS r) t \gset
COMMIT;
SELECT pg_temp.t_assert('T13 история без перерасчёта: баллы=0', :'pts', '0');
SELECT pg_temp.t_assert('T13 история без перерасчёта: коины=0', :'coins', '0');

-- ---------------------------------------------------------------------------
-- Тест 14 (доступ): резидент не может вызывать founder-функции; RLS скрывает
-- чужие награды.
-- ---------------------------------------------------------------------------
BEGIN;
SELECT set_config('request.jwt.claims', jsonb_build_object('sub', :'r1_id', 'role', 'authenticated')::text, true);
SELECT (r->>'error') AS err FROM (SELECT public.founder_confirm_attendance(
  '11111111-1111-4111-8111-111111111102',
  jsonb_build_array(jsonb_build_object('user_id', :'r1_id', 'attended', true))) AS r) t \gset
COMMIT;
SELECT pg_temp.t_assert('T14 резиденту запрещено подтверждение', :'err', 'forbidden');

BEGIN;
SELECT set_config('request.jwt.claims', jsonb_build_object('sub', :'r1_id', 'role', 'authenticated')::text, true);
SELECT (r->>'error') AS err FROM (SELECT public.founder_cancel_event_web('11111111-1111-4111-8111-111111111101') AS r) t \gset
COMMIT;
SELECT pg_temp.t_assert('T14 резиденту запрещена отмена', :'err', 'forbidden');

-- RLS: резидент видит только свои награды.
BEGIN;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', jsonb_build_object('sub', :'r1_id', 'role', 'authenticated')::text, true);
SELECT count(*)::text AS own_cnt FROM public.resident_reward_awards \gset
COMMIT;
SELECT pg_temp.t_assert('T14 RLS: резидент видит только свои награды (4)', :'own_cnt', '4');

BEGIN;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', jsonb_build_object('sub', '22222222-2222-4222-8222-222222222202', 'role', 'authenticated')::text, true);
SELECT count(*)::text AS other_cnt FROM public.resident_reward_awards WHERE user_id = :'r1_id' \gset
COMMIT;
SELECT pg_temp.t_assert('T14 RLS: чужие награды не видны', :'other_cnt', '0');

DO $$ BEGIN RAISE NOTICE 'ACCEPTANCE OK: все последовательные сценарии пройдены'; END $$;
