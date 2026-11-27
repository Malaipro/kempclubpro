-- ============================================================================
-- sql/resident-rewards/up.sql — КЭМП: награды резидентов за клубные тренировки.
-- СТАТУС: STAGING. НЕ ПРИМЕНЯТЬ к рабочей БД без отдельного APPROVE владельца.
--
-- Правила (KEMP-CHECKINS-REWARDS-01):
--   * Каждая подтверждённая основателем клубная тренировка: +10 рейтинговых
--     баллов резидента (по событию и участнику, идемпотентно).
--   * Подтверждены БЖЖ + ОФП + кикбоксинг одной недели зачёта: дополнительно
--     +10 баллов и +70 коинов (один раз на неделю).
--   * Неподтверждённые/отсутствующие/отменённые без решения — без наград.
--   * Повторная тренировка того же вида не заменяет недостающий вид для 3/3.
--   * Перенос сохраняет исходную неделю зачёта (week_anchor, уже есть).
--   * Исправление решения основателя обращает награды без удаления истории.
--   * Ручные операции с коинами не влияют на рейтинг.
--
-- Принципы:
--   * Реестр resident_reward_awards — отдельный источник истины; leaderboard
--     интенсива НЕ перезаписывается (update_user_leaderboard пересчитывает его
--     из активностей интенсива и обнулил бы ручные добавления).
--   * Существующее правило coin_rules 'training_attendance' (1 коин) не
--     используется и не изменяется; недельный бонус — отдельное правило
--     'resident_week_full'.
--   * Коины — только append-only записи в coin_transactions (баланс = сумма);
--     обращение = компенсирующая запись, история не удаляется.
--   * Атомарность: всё внутри транзакции founder_confirm_attendance; неделя
--     сериализуется advisory-lock'ом; уникальные индексы — последняя линия.
-- ============================================================================
BEGIN;

-- ----------------------------------------------------------------------------
-- 0. Правило коинов недельного бонуса (идемпотентный сид).
-- ----------------------------------------------------------------------------
INSERT INTO public.coin_rules (code, name, description, coin_amount, is_active)
SELECT 'resident_week_full',
       'Полная тренировочная неделя резидента',
       'Подтверждены БЖЖ, ОФП и кикбоксинг одной недели зачёта',
       70,
       true
WHERE NOT EXISTS (SELECT 1 FROM public.coin_rules WHERE code = 'resident_week_full');

-- ----------------------------------------------------------------------------
-- 1. Реестр наград резидентов.
--    schedule_id без FK намеренно: событие может быть удалено/деактивировано,
--    запись награды и её история обязаны сохраниться (риск R1).
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.resident_reward_awards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  award_kind text NOT NULL CHECK (award_kind IN ('training', 'week_full')),
  schedule_id uuid,
  week_start date,
  points integer NOT NULL DEFAULT 0,
  coins integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'reversed')),
  history jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now(),
  reversed_at timestamptz,
  reversed_by uuid
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_resident_reward_training
  ON public.resident_reward_awards (user_id, schedule_id)
  WHERE award_kind = 'training';
CREATE UNIQUE INDEX IF NOT EXISTS uq_resident_reward_week
  ON public.resident_reward_awards (user_id, week_start)
  WHERE award_kind = 'week_full';
CREATE INDEX IF NOT EXISTS idx_resident_reward_user_status
  ON public.resident_reward_awards (user_id, status);

ALTER TABLE public.resident_reward_awards ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Residents read own reward awards" ON public.resident_reward_awards;
CREATE POLICY "Residents read own reward awards"
  ON public.resident_reward_awards FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins read reward awards" ON public.resident_reward_awards;
CREATE POLICY "Admins read reward awards"
  ON public.resident_reward_awards FOR SELECT
  TO authenticated
  USING (public.is_admin(auth.uid()));

-- Записей INSERT/UPDATE/DELETE для клиентских ролей нет намеренно:
-- все изменения идут через SECURITY DEFINER RPC ниже.
GRANT SELECT ON public.resident_reward_awards TO authenticated;

-- ----------------------------------------------------------------------------
-- 2. Внутренняя: применить/обратить награду за тренировку и пересчитать неделю.
--    Вызывается только из founder_confirm_attendance (та же транзакция).
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public._resident_apply_training_award(
  p_schedule_id uuid,
  p_user_id uuid,
  p_attended boolean,
  p_actor uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_event public.schedules%ROWTYPE;
  v_award public.resident_reward_awards%ROWTYPE;
  v_week date;
  v_kinds integer;
  v_week_award public.resident_reward_awards%ROWTYPE;
  v_week_found boolean;
  v_rule_id uuid;
  v_points_delta integer := 0;
  v_coins_delta integer := 0;
BEGIN
  SELECT * INTO v_event FROM public.schedules WHERE id = p_schedule_id;
  IF NOT FOUND
     OR v_event.schedule_type <> 'club'
     OR v_event.club_kind NOT IN ('training_bjj', 'training_ofp', 'training_kick') THEN
    RETURN jsonb_build_object('changed', false, 'points_delta', 0, 'coins_delta', 0);
  END IF;

  v_week := public.club_week_start(v_event.start_time, v_event.week_anchor);

  -- Сериализация всех пересчётов пары (участник, неделя) в этой транзакции.
  PERFORM pg_advisory_xact_lock(hashtextextended(p_user_id::text || ':' || v_week::text, 42));

  -- 2.1. Награда за конкретное занятие (+10 баллов, без коинов).
  SELECT * INTO v_award FROM public.resident_reward_awards
   WHERE award_kind = 'training' AND user_id = p_user_id AND schedule_id = p_schedule_id
   FOR UPDATE;

  IF p_attended THEN
    IF NOT FOUND THEN
      INSERT INTO public.resident_reward_awards
        (user_id, award_kind, schedule_id, week_start, points, coins, created_by, history)
      VALUES
        (p_user_id, 'training', p_schedule_id, v_week, 10, 0, p_actor,
         jsonb_build_array(jsonb_build_object('at', now(), 'by', p_actor, 'action', 'awarded', 'points', 10)));
      v_points_delta := v_points_delta + 10;
    ELSIF v_award.status = 'reversed' THEN
      UPDATE public.resident_reward_awards
         SET status = 'active', points = 10,
             updated_at = now(), reversed_at = NULL, reversed_by = NULL,
             history = history || jsonb_build_array(jsonb_build_object('at', now(), 'by', p_actor, 'action', 'restored', 'points', 10))
       WHERE id = v_award.id;
      v_points_delta := v_points_delta + 10;
    END IF;
    -- status='active' при повторном подтверждении: no-op (идемпотентность).
  ELSE
    IF FOUND AND v_award.status = 'active' THEN
      UPDATE public.resident_reward_awards
         SET status = 'reversed', points = 0,
             updated_at = now(), reversed_at = now(), reversed_by = p_actor,
             history = history || jsonb_build_array(jsonb_build_object('at', now(), 'by', p_actor, 'action', 'reversed', 'points', -10))
       WHERE id = v_award.id;
      v_points_delta := v_points_delta - 10;
    END IF;
  END IF;

  -- 2.2. Пересчёт недели зачёта: подтверждены ли все три разных вида.
  -- Деактивированные события (is_active=false) сохраняют вклад: их история
  -- подтверждений не уничтожается отменой (R1).
  SELECT count(DISTINCT s.club_kind) INTO v_kinds
    FROM public.schedule_participants sp
    JOIN public.schedules s ON s.id = sp.schedule_id
   WHERE sp.user_id = p_user_id
     AND sp.attended = true
     AND sp.attended_marked_at IS NOT NULL
     AND s.schedule_type = 'club'
     AND s.club_kind IN ('training_bjj', 'training_ofp', 'training_kick')
     AND public.club_week_start(s.start_time, s.week_anchor) = v_week;

  SELECT * INTO v_week_award FROM public.resident_reward_awards
   WHERE award_kind = 'week_full' AND user_id = p_user_id AND week_start = v_week
   FOR UPDATE;
  v_week_found := FOUND;

  SELECT id INTO v_rule_id FROM public.coin_rules WHERE code = 'resident_week_full';

  IF v_kinds = 3 THEN
    IF NOT v_week_found THEN
      INSERT INTO public.resident_reward_awards
        (user_id, award_kind, week_start, points, coins, created_by, history)
      VALUES
        (p_user_id, 'week_full', v_week, 10, 70, p_actor,
         jsonb_build_array(jsonb_build_object('at', now(), 'by', p_actor, 'action', 'awarded', 'points', 10, 'coins', 70)))
      RETURNING id INTO v_week_award.id;
      INSERT INTO public.coin_transactions (user_id, amount, reason, source_type, source_id, rule_id, created_by)
      VALUES (p_user_id, 70, 'Полная тренировочная неделя (3/3)', 'resident_week_full', v_week_award.id, v_rule_id, p_actor);
      v_points_delta := v_points_delta + 10;
      v_coins_delta := v_coins_delta + 70;
    ELSIF v_week_award.status = 'reversed' THEN
      UPDATE public.resident_reward_awards
         SET status = 'active', points = 10, coins = 70,
             updated_at = now(), reversed_at = NULL, reversed_by = NULL,
             history = history || jsonb_build_array(jsonb_build_object('at', now(), 'by', p_actor, 'action', 'restored', 'points', 10, 'coins', 70))
       WHERE id = v_week_award.id;
      INSERT INTO public.coin_transactions (user_id, amount, reason, source_type, source_id, rule_id, created_by)
      VALUES (p_user_id, 70, 'Полная тренировочная неделя (3/3), восстановление', 'resident_week_full', v_week_award.id, v_rule_id, p_actor);
      v_points_delta := v_points_delta + 10;
      v_coins_delta := v_coins_delta + 70;
    END IF;
  ELSE
    IF FOUND AND v_week_award.status = 'active' THEN
      UPDATE public.resident_reward_awards
         SET status = 'reversed', points = 0, coins = 0,
             updated_at = now(), reversed_at = now(), reversed_by = p_actor,
             history = history || jsonb_build_array(jsonb_build_object('at', now(), 'by', p_actor, 'action', 'reversed', 'points', -10, 'coins', -70))
       WHERE id = v_week_award.id;
      INSERT INTO public.coin_transactions (user_id, amount, reason, source_type, source_id, rule_id, created_by)
      VALUES (p_user_id, -70, 'Отмена бонуса полной недели (3/3)', 'resident_week_full_reversal', v_week_award.id, v_rule_id, p_actor);
      v_points_delta := v_points_delta - 10;
      v_coins_delta := v_coins_delta - 70;
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'changed', v_points_delta <> 0 OR v_coins_delta <> 0,
    'points_delta', v_points_delta,
    'coins_delta', v_coins_delta,
    'week_start', v_week,
    'week_kinds_confirmed', v_kinds
  );
END;
$$;

REVOKE ALL ON FUNCTION public._resident_apply_training_award(uuid, uuid, boolean, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public._resident_apply_training_award(uuid, uuid, boolean, uuid) TO service_role;

-- ----------------------------------------------------------------------------
-- 3. founder_confirm_attendance — прежний контракт + начисления.
--    Базовая логика (блокировка события, идемпотентный UPDATE, история
--    посещений) сохранена без изменений; добавлен вызов наград и сводка.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.founder_confirm_attendance(p_schedule_id uuid, p_marks jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_event public.schedules%ROWTYPE;
  v_mark jsonb;
  v_updated int := 0;
  v_skipped int := 0;
  v_n int;
  v_award jsonb;
  v_awards jsonb := '[]'::jsonb;
BEGIN
  IF NOT public.is_kemp_founder(v_uid) THEN RETURN jsonb_build_object('ok',false,'error','forbidden'); END IF;
  SELECT * INTO v_event FROM public.schedules WHERE id = p_schedule_id FOR UPDATE;
  IF NOT FOUND OR v_event.schedule_type <> 'club' THEN RETURN jsonb_build_object('ok',false,'error','not_club_event'); END IF;
  IF v_event.start_time > now() THEN RETURN jsonb_build_object('ok',false,'error','event_not_started'); END IF;
  IF p_marks IS NULL OR jsonb_typeof(p_marks) <> 'array' THEN RETURN jsonb_build_object('ok',false,'error','invalid_marks'); END IF;
  FOR v_mark IN SELECT * FROM jsonb_array_elements(p_marks) LOOP
    IF jsonb_typeof(v_mark->'attended') <> 'boolean' OR NOT (v_mark ? 'user_id') THEN
      v_skipped := v_skipped + 1; CONTINUE;
    END IF;
    UPDATE public.schedule_participants sp SET
      attendance_history = sp.attendance_history || jsonb_build_array(jsonb_build_object(
        'at', now(), 'by', v_uid,
        'from', CASE WHEN sp.attended_marked_at IS NULL THEN NULL ELSE sp.attended END,
        'to', (v_mark->>'attended')::boolean)),
      attended = (v_mark->>'attended')::boolean,
      attended_marked_at = now(),
      attended_marked_by = v_uid
    WHERE sp.schedule_id = p_schedule_id AND sp.user_id = (v_mark->>'user_id')::uuid
      AND (sp.attended_marked_at IS NULL OR sp.attended IS DISTINCT FROM (v_mark->>'attended')::boolean);
    GET DIAGNOSTICS v_n = ROW_COUNT;
    IF v_n = 0 THEN
      v_skipped := v_skipped + 1;
    ELSE
      v_updated := v_updated + 1;
      v_award := public._resident_apply_training_award(p_schedule_id, (v_mark->>'user_id')::uuid, (v_mark->>'attended')::boolean, v_uid);
      IF COALESCE((v_award->>'changed')::boolean, false) THEN
        v_awards := v_awards || jsonb_build_array(jsonb_build_object(
          'user_id', (v_mark->>'user_id')::uuid,
          'points_delta', (v_award->>'points_delta')::integer,
          'coins_delta', (v_award->>'coins_delta')::integer));
      END IF;
    END IF;
  END LOOP;
  RETURN jsonb_build_object('ok',true,'updated',v_updated,'skipped',v_skipped,'awards',v_awards);
END $$;

REVOKE ALL ON FUNCTION public.founder_confirm_attendance(uuid, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.founder_confirm_attendance(uuid, jsonb) TO authenticated;

-- ----------------------------------------------------------------------------
-- 4. founder_cancel_event_web — безопасная отмена (R1).
--    Событие с историей посещений/броней/наград деактивируется (is_active=false),
--    история и связи сохраняются; событие без истории удаляется как раньше.
--    Регулярная серия не пересоздаёт отменённый экземпляр: гарантирует
--    club_recurring_occurrences (ON CONFLICT DO NOTHING, запись переживает
--    деактивацию со статусом 'cancelled').
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.founder_cancel_event_web(p_schedule_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_event public.schedules%ROWTYPE;
  v_has_history boolean;
BEGIN
  IF NOT public.is_kemp_founder(auth.uid()) THEN RETURN jsonb_build_object('ok',false,'error','forbidden'); END IF;
  SELECT * INTO v_event FROM public.schedules WHERE id = p_schedule_id FOR UPDATE;
  IF NOT FOUND OR v_event.schedule_type <> 'club' THEN RETURN jsonb_build_object('ok',false,'error','not_club_event'); END IF;

  SELECT EXISTS (
           SELECT 1 FROM public.schedule_participants sp
            WHERE sp.schedule_id = p_schedule_id
              AND (sp.self_marked_at IS NOT NULL OR sp.attended_marked_at IS NOT NULL OR sp.attended = true OR sp.paid_booking_id IS NOT NULL)
         ) OR EXISTS (
           SELECT 1 FROM public.paid_bookings pb WHERE pb.schedule_id = p_schedule_id
         ) OR EXISTS (
           SELECT 1 FROM public.resident_reward_awards ra WHERE ra.schedule_id = p_schedule_id
         )
    INTO v_has_history;

  IF v_has_history THEN
    UPDATE public.schedules SET is_active = false, updated_at = now() WHERE id = p_schedule_id;
    RETURN jsonb_build_object('ok', true, 'action', 'deactivated');
  END IF;

  DELETE FROM public.schedules WHERE id = p_schedule_id;
  RETURN jsonb_build_object('ok', true, 'action', 'deleted');
END $$;

REVOKE ALL ON FUNCTION public.founder_cancel_event_web(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.founder_cancel_event_web(uuid) TO authenticated;

-- ----------------------------------------------------------------------------
-- 5. get_resident_checkins_web — деактивированные события с отметками
--    резидента остаются в истории (R1). Активность по-прежнему обязательна
--    для самоотметки на клиенте и в request_attendance_web.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_resident_checkins_web(p_weeks integer DEFAULT 12)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_from timestamptz := now() - make_interval(weeks => LEAST(GREATEST(COALESCE(p_weeks,12),1),52));
BEGIN
  IF v_uid IS NULL THEN RETURN jsonb_build_object('ok',false,'error','not_authenticated'); END IF;
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE user_id=v_uid AND participant_status='club_resident' AND approved=true) THEN RETURN jsonb_build_object('ok',false,'error','not_resident'); END IF;
  RETURN jsonb_build_object(
    'ok', true,
    'now', now(),
    'current_week', public.club_week_start(now(), NULL),
    'events', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'schedule_id', s.id,
        'title', s.activity_type,
        'theme', NULLIF(trim(split_part(COALESCE(s.description,''),'|||',1)),''),
        'start_time', s.start_time,
        'club_kind', s.club_kind,
        'week_start', public.club_week_start(s.start_time, s.week_anchor),
        'registered', sp.id IS NOT NULL,
        'booking_mode', s.booking_mode,
        'schedule_type', s.schedule_type,
        'is_active', s.is_active,
        'attended', COALESCE(sp.attended,false),
        'self_marked_at', sp.self_marked_at,
        'attended_marked_at', sp.attended_marked_at,
        'booking_id', pb.id,
        'booking_status', CASE WHEN sp.id IS NOT NULL AND pb.id IS NULL THEN 'registered' ELSE pb.booking_status END
      ) ORDER BY s.start_time DESC)
      FROM public.schedules s
      LEFT JOIN public.schedule_participants sp ON sp.schedule_id = s.id AND sp.user_id = v_uid
      LEFT JOIN LATERAL (
        SELECT b.id,b.booking_status FROM public.paid_bookings b
        WHERE b.schedule_id=s.id AND b.user_id=v_uid
        ORDER BY b.created_at DESC,b.id DESC LIMIT 1
      ) pb ON true
      WHERE s.schedule_type = 'club'
        AND (s.is_active OR sp.self_marked_at IS NOT NULL OR sp.attended_marked_at IS NOT NULL)
        AND s.start_time >= v_from AND s.start_time <= now() + interval '14 days'
        AND (sp.id IS NOT NULL OR pb.id IS NOT NULL OR s.club_kind IN ('training_bjj','training_ofp','training_kick'))
    ), '[]'::jsonb)
  );
END $function$;

REVOKE ALL ON FUNCTION public.get_resident_checkins_web(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_resident_checkins_web(integer) TO authenticated;

-- ----------------------------------------------------------------------------
-- 6. get_resident_rewards_web — кабинет резидента: баллы/бонусы из реестра.
--    Суммы не зависят от 12-недельного окна посещаемости.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_resident_rewards_web()
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_points integer;
  v_trainings integer;
  v_week_bonuses integer;
  v_coins integer;
  v_awards jsonb;
BEGIN
  IF v_uid IS NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'not_authenticated'); END IF;
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE user_id = v_uid AND participant_status = 'club_resident' AND approved = true)
  THEN RETURN jsonb_build_object('ok', false, 'error', 'not_resident'); END IF;

  SELECT COALESCE(sum(points), 0)::integer,
         COALESCE(sum(CASE WHEN award_kind = 'training' THEN 1 ELSE 0 END), 0)::integer,
         COALESCE(sum(CASE WHEN award_kind = 'week_full' THEN 1 ELSE 0 END), 0)::integer,
         COALESCE(sum(coins), 0)::integer
    INTO v_points, v_trainings, v_week_bonuses, v_coins
    FROM public.resident_reward_awards
   WHERE user_id = v_uid AND status = 'active';

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
           'id', t.id,
           'award_kind', t.award_kind,
           'week_start', t.week_start,
           'points', t.points,
           'coins', t.coins,
           'status', t.status,
           'created_at', t.created_at
         ) ORDER BY t.created_at DESC), '[]'::jsonb)
    INTO v_awards
    FROM (SELECT * FROM public.resident_reward_awards WHERE user_id = v_uid ORDER BY created_at DESC LIMIT 50) t;

  RETURN jsonb_build_object(
    'ok', true,
    'points_total', v_points,
    'trainings_confirmed', v_trainings,
    'week_bonuses', v_week_bonuses,
    'coins_from_awards', v_coins,
    'awards', v_awards
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_resident_rewards_web() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_resident_rewards_web() TO authenticated;

-- ----------------------------------------------------------------------------
-- 7. get_resident_rating_web — рейтинг резидентов = баллы интенсива
--    (leaderboard.total_points, не изменяются) + активные баллы резидентов.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_resident_rating_web()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_entries jsonb;
  v_my_position int;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_authenticated');
  END IF;

  WITH resident_points AS (
    SELECT user_id, sum(points)::integer AS pts
      FROM public.resident_reward_awards
     WHERE status = 'active'
     GROUP BY user_id
  ),
  ranked AS (
    SELECT p.user_id,
           (COALESCE(l.total_points, 0) + COALESCE(rp.pts, 0)) AS total_points,
           ROW_NUMBER() OVER (ORDER BY (COALESCE(l.total_points, 0) + COALESCE(rp.pts, 0)) DESC) AS pos
      FROM profiles p
      LEFT JOIN leaderboard l ON l.user_id = p.user_id
      LEFT JOIN resident_points rp ON rp.user_id = p.user_id
     WHERE p.participant_status = 'club_resident'
  )
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
           'user_id', r.user_id,
           'display_name', mask_participant_name(trim(pr.first_name || ' ' || pr.last_name)),
           'total_points', r.total_points,
           'position', r.pos,
           'is_me', r.user_id = v_uid
         ) ORDER BY r.pos), '[]'::jsonb),
         (SELECT r2.pos FROM ranked AS r2 WHERE r2.user_id = v_uid)
    INTO v_entries, v_my_position
    FROM ranked r
    JOIN profiles pr ON pr.user_id = r.user_id;

  RETURN jsonb_build_object(
    'ok', true,
    'entries', v_entries,
    'my_position', v_my_position
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_resident_rating_web() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_resident_rating_web() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_resident_rating_web() TO service_role;

COMMIT;
