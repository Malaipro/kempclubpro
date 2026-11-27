-- ============================================================================
-- sql/resident-rewards/test-fixture.sql — ТОЛЬКО ЛОКАЛЬНЫЙ СТЕНД.
-- НЕ ПРИМЕНЯТЬ к рабочей БД. Не входит в production-миграции.
--
-- Достраивает минимальный синтетический стенд (зеркало amvera@26f12123 +
-- recurring) до контура, необходимого для приёмочных тестов наград:
--   * таблицы геймификации по DDL migration-mira-v5/schema-structure-only.sql
--     (coin_rules, coin_transactions, leaderboard, activity_checkins,
--      user_points);
--   * функции коинов из migration-mira-v5/migrations/04_functions.sql
--     (_internal_get_user_coin_balance, get_user_coin_balance,
--      award_coins_by_rule, admin_adjust_coins);
--   * mask_participant_name из supabase/migrations/20251004095106;
--   * founder_* RPC из main:sql/resident-checkins/up.sql;
--   * is_kemp_founder — ЛОКАЛЬНАЯ подстановка: «основатель» = любой
--     super_admin стенда (в prod функция привязана к конкретному UUID и
--     уже существует; fixture её не переносит в прод).
--   * сид coin_rules по migration-mira-v5/migrations/09_reference_data.sql
--     (training_attendance = 1 коин — как в рабочей БД).
-- ============================================================================
BEGIN;

CREATE TABLE IF NOT EXISTS public.coin_rules (
  id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  coin_amount integer DEFAULT 1 NOT NULL,
  is_active boolean DEFAULT true NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.coin_transactions (
  id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
  user_id uuid NOT NULL,
  amount integer NOT NULL,
  reason text NOT NULL,
  source_type text,
  source_id uuid,
  created_at timestamptz DEFAULT now() NOT NULL,
  created_by uuid,
  rule_id uuid
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_coin_tx_referral_lead
  ON public.coin_transactions(source_id) WHERE source_type = 'referral_lead';

CREATE TABLE IF NOT EXISTS public.leaderboard (
  id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
  user_id uuid NOT NULL UNIQUE,
  total_points integer DEFAULT 0,
  bjj_points integer DEFAULT 0,
  kickboxing_points integer DEFAULT 0,
  ofp_points integer DEFAULT 0,
  theory_points integer DEFAULT 0,
  challenges_points integer DEFAULT 0,
  tactical_points integer DEFAULT 0,
  monthly_points integer DEFAULT 0,
  rank_position integer DEFAULT 0,
  last_updated timestamptz DEFAULT now(),
  kamp_pyramid_points integer DEFAULT 0,
  nutrition_points integer DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public.activity_checkins (
  id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
  user_id uuid NOT NULL,
  activity_type text NOT NULL,
  checked_at date DEFAULT CURRENT_DATE NOT NULL,
  stream_id uuid,
  created_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.user_points (
  id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
  user_id uuid NOT NULL,
  bjj_points integer DEFAULT 0,
  kick_points integer DEFAULT 0,
  ofp_points integer DEFAULT 0,
  pyramid_kemp_points integer DEFAULT 0,
  nutrition_points integer DEFAULT 0,
  tactics_points integer DEFAULT 0,
  total_points integer DEFAULT 0,
  bjj_sessions_total integer DEFAULT 0,
  bjj_sessions_attended integer DEFAULT 0,
  kick_sessions_total integer DEFAULT 0,
  kick_sessions_attended integer DEFAULT 0,
  ofp_sessions_total integer DEFAULT 0,
  ofp_sessions_attended integer DEFAULT 0,
  last_updated timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.coin_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coin_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leaderboard ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_points ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.mask_participant_name(full_name text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  name_parts text[];
  first_name text;
  last_initial text;
BEGIN
  IF full_name IS NULL OR LENGTH(TRIM(full_name)) = 0 THEN
    RETURN 'Участник';
  END IF;
  name_parts := string_to_array(TRIM(full_name), ' ');
  first_name := name_parts[1];
  IF array_length(name_parts, 1) > 1 THEN
    last_initial := LEFT(name_parts[2], 1) || '.';
    RETURN first_name || ' ' || last_initial;
  ELSE
    RETURN first_name;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public._internal_get_user_coin_balance(p_user_id uuid)
 RETURNS integer
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN (
    SELECT COALESCE(SUM(amount), 0)::INTEGER
    FROM public.coin_transactions
    WHERE user_id = p_user_id
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_user_coin_balance(p_user_id uuid)
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(SUM(amount), 0)::INTEGER
  FROM public.coin_transactions
  WHERE user_id = p_user_id;
$$;

CREATE OR REPLACE FUNCTION public.award_coins_by_rule(p_user_id uuid, p_rule_code text, p_source_type text DEFAULT NULL::text, p_source_id uuid DEFAULT NULL::uuid, p_reason text DEFAULT NULL::text, p_amount_override integer DEFAULT NULL::integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_rule       public.coin_rules%ROWTYPE;
  v_amount     INTEGER;
  v_existing   UUID;
  v_tx_id      UUID;
  v_balance    INTEGER;
  v_is_service BOOLEAN;
BEGIN
  v_is_service := (current_setting('role', true) = 'service_role')
                  OR (auth.role() = 'service_role');

  IF NOT (v_is_service OR public.is_admin(auth.uid())) THEN
    RAISE EXCEPTION 'Недостаточно прав для начисления монет';
  END IF;

  SELECT * INTO v_rule FROM public.coin_rules WHERE code = p_rule_code;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Правило начисления не найдено: %', p_rule_code;
  END IF;

  IF NOT v_rule.is_active THEN
    RAISE EXCEPTION 'Правило начисления неактивно: %', p_rule_code;
  END IF;

  v_amount := COALESCE(p_amount_override, v_rule.coin_amount);

  IF v_amount IS NULL OR v_amount = 0 THEN
    RAISE EXCEPTION 'Сумма начисления должна быть отличной от нуля';
  END IF;

  IF p_source_type IS NOT NULL AND p_source_id IS NOT NULL THEN
    SELECT id INTO v_existing
    FROM public.coin_transactions
    WHERE user_id = p_user_id
      AND source_type = p_source_type
      AND source_id = p_source_id
      AND rule_id = v_rule.id
    LIMIT 1;

    IF v_existing IS NOT NULL THEN
      v_balance := public._internal_get_user_coin_balance(p_user_id);
      RETURN jsonb_build_object(
        'awarded', false,
        'duplicate', true,
        'transaction_id', v_existing,
        'balance', v_balance,
        'rule_id', v_rule.id,
        'amount', 0
      );
    END IF;
  END IF;

  INSERT INTO public.coin_transactions (user_id, amount, reason, source_type, source_id, rule_id, created_by)
  VALUES (
    p_user_id,
    v_amount,
    COALESCE(p_reason, v_rule.name),
    p_source_type,
    p_source_id,
    v_rule.id,
    auth.uid()
  )
  RETURNING id INTO v_tx_id;

  v_balance := public._internal_get_user_coin_balance(p_user_id);

  RETURN jsonb_build_object(
    'awarded', true,
    'duplicate', false,
    'transaction_id', v_tx_id,
    'balance', v_balance,
    'rule_id', v_rule.id,
    'amount', v_amount
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.admin_adjust_coins(p_user_id uuid, p_amount integer, p_reason text)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_new_balance integer;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Недостаточно прав для изменения баланса коинов';
  END IF;

  IF p_reason IS NULL OR length(trim(p_reason)) = 0 THEN
    RAISE EXCEPTION 'Причина операции обязательна';
  END IF;

  IF p_amount IS NULL OR p_amount = 0 THEN
    RAISE EXCEPTION 'Сумма операции должна быть отличной от нуля';
  END IF;

  INSERT INTO public.coin_transactions (user_id, amount, reason, source_type, created_by)
  VALUES (p_user_id, p_amount, trim(p_reason), 'admin_manual', auth.uid());

  v_new_balance := public._internal_get_user_coin_balance(p_user_id);

  RETURN v_new_balance;
END;
$function$;

-- is_kemp_founder — ЛОКАЛЬНАЯ подстановка для стенда (в prod — фиксированный
-- UUID + is_super_admin; здесь «основатель» = super_admin стенда).
CREATE OR REPLACE FUNCTION public.is_kemp_founder(p_uid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.is_super_admin(p_uid)
$$;

-- founder_get_event_attendance / founder_set_event_kind — копии из
-- main:sql/resident-checkins/up.sql (на стенде отсутствовали).
CREATE OR REPLACE FUNCTION public.founder_get_event_attendance(p_schedule_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_event public.schedules%ROWTYPE;
BEGIN
  IF NOT public.is_kemp_founder(auth.uid()) THEN RETURN jsonb_build_object('ok',false,'error','forbidden'); END IF;
  SELECT * INTO v_event FROM public.schedules WHERE id = p_schedule_id;
  IF NOT FOUND OR v_event.schedule_type <> 'club' THEN RETURN jsonb_build_object('ok',false,'error','not_club_event'); END IF;
  RETURN jsonb_build_object('ok',true,
    'club_kind', v_event.club_kind,
    'week_anchor', v_event.week_anchor,
    'week_start', public.club_week_start(v_event.start_time, v_event.week_anchor),
    'participants', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'user_id', sp.user_id,
        'name', COALESCE(NULLIF(p.display_name,''), NULLIF(trim(COALESCE(p.first_name,'')||' '||COALESCE(p.last_name,'')),''), 'Без имени'),
        'is_resident', COALESCE(p.participant_status = 'club_resident' AND p.approved, false),
        'registered_at', sp.registered_at,
        'attended', sp.attended,
        'self_marked_at', sp.self_marked_at,
        'attended_marked_at', sp.attended_marked_at,
        'history_count', jsonb_array_length(sp.attendance_history)
      ) ORDER BY sp.registered_at)
      FROM public.schedule_participants sp
      LEFT JOIN public.profiles p ON p.user_id = sp.user_id
      WHERE sp.schedule_id = p_schedule_id
    ), '[]'::jsonb));
END $$;

CREATE OR REPLACE FUNCTION public.founder_set_event_kind(p_schedule_id uuid, p_club_kind text, p_week_anchor date DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_kemp_founder(auth.uid()) THEN RETURN jsonb_build_object('ok',false,'error','forbidden'); END IF;
  UPDATE public.schedules SET club_kind = NULLIF(p_club_kind,''), week_anchor = COALESCE(p_week_anchor, week_anchor, public.club_week_start(start_time, NULL))
   WHERE id = p_schedule_id AND schedule_type = 'club';
  IF NOT FOUND THEN RETURN jsonb_build_object('ok',false,'error','not_club_event'); END IF;
  RETURN jsonb_build_object('ok',true);
END $$;

-- Сид правил по 09_reference_data.sql (training_attendance = 1 — как в prod).
INSERT INTO public.coin_rules (code, name, description, coin_amount, is_active)
SELECT * FROM (VALUES
  ('training_attendance', 'Посещение тренировки', 'Начисление за посещение тренировки', 1, true),
  ('referral_confirmed', 'Подтверждённый реферал', 'Начисление за подтверждённого реферала', 10, true),
  ('homework_submission', 'Сдача ДЗ', 'Начисляется участнику при сдаче домашнего задания через Telegram Mini App.', 1, true)
) v(code, name, description, coin_amount, is_active)
WHERE NOT EXISTS (SELECT 1 FROM public.coin_rules cr WHERE cr.code = v.code);

COMMIT;
