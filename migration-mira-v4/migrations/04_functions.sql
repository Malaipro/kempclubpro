-- 04_functions.sql (v3): всем функциям задан SET search_path = public
-- 04_functions.sql — 92 функции схемы public (90 SECURITY DEFINER).
-- Секретов и персональных данных не содержит.

CREATE OR REPLACE FUNCTION public.admin_adjust_coins(p_user_id uuid, p_amount integer, p_reason text)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_new_balance integer;
BEGIN
  -- Только администраторы / суперадмины
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Недостаточно прав для изменения баланса коинов';
  END IF;

  -- Причина обязательна
  IF p_reason IS NULL OR length(trim(p_reason)) = 0 THEN
    RAISE EXCEPTION 'Причина операции обязательна';
  END IF;

  -- Сумма не может быть нулевой
  IF p_amount IS NULL OR p_amount = 0 THEN
    RAISE EXCEPTION 'Сумма операции должна быть отличной от нуля';
  END IF;

  -- Запись в журнал транзакций (баланс никогда не меняется напрямую)
  INSERT INTO public.coin_transactions (user_id, amount, reason, source_type, created_by)
  VALUES (p_user_id, p_amount, trim(p_reason), 'admin_manual', auth.uid());

  -- Пересчёт баланса через существующую логику
  v_new_balance := public.get_user_coin_balance(p_user_id);

  RETURN v_new_balance;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.admin_confirm_referral(p_lead_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_lead public.referral_leads%ROWTYPE;
  v_award jsonb;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Только администратор может подтверждать рефералов';
  END IF;

  SELECT * INTO v_lead FROM public.referral_leads WHERE id = p_lead_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Заявка не найдена';
  END IF;

  -- Award coins by rule; award_coins_by_rule guards against duplicates
  v_award := public.award_coins_by_rule(
    p_user_id      => v_lead.referrer_user_id,
    p_rule_code    => 'referral_confirmed',
    p_source_type  => 'referral_lead',
    p_source_id    => v_lead.id,
    p_reason       => 'Подтверждённый реферал'
  );

  -- Update lead state
  UPDATE public.referral_leads
  SET status = 'rewarded',
      reward_issued = true,
      bonus_awarded = true,
      bonus_amount = COALESCE((v_award->>'amount')::int, bonus_amount),
      confirmed_at = COALESCE(confirmed_at, now()),
      processed_by = auth.uid()
  WHERE id = p_lead_id;

  RETURN jsonb_build_object(
    'lead_id', p_lead_id,
    'award', v_award
  );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.admin_list_coin_balances()
 RETURNS TABLE(user_id uuid, display_name text, first_name text, last_name text, email text, participant_status text, stream_name text, balance integer, tx_count bigint, last_tx_at timestamp with time zone)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Только администратор может просматривать балансы';
  END IF;

  RETURN QUERY
  SELECT
    p.user_id,
    p.display_name,
    p.first_name,
    p.last_name,
    p.email,
    p.participant_status::text,
    s.name AS stream_name,
    COALESCE(ct.balance, 0)::integer AS balance,
    COALESCE(ct.tx_count, 0) AS tx_count,
    ct.last_tx_at
  FROM public.profiles p
  LEFT JOIN public.intensive_streams s ON s.id = p.current_stream_id
  LEFT JOIN (
    SELECT user_id,
           SUM(amount) AS balance,
           COUNT(*) AS tx_count,
           MAX(created_at) AS last_tx_at
    FROM public.coin_transactions
    GROUP BY user_id
  ) ct ON ct.user_id = p.user_id
  ORDER BY COALESCE(ct.balance, 0) DESC, p.display_name ASC;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.admin_set_approval(p_user_id uuid, p_approved boolean)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_rows_updated integer := 0;
begin
  -- Only admins can approve/unapprove participants
  if not public.is_admin(auth.uid()) then
    raise exception 'Only admins can approve/unapprove participants';
  end if;

  -- Update approval fields
  update public.profiles
  set 
    approved = p_approved,
    approved_at = case when p_approved then now() else null end,
    approved_by = case when p_approved then auth.uid() else null end,
    updated_at = now()
  where user_id = p_user_id;

  get diagnostics v_rows_updated = row_count;
  if v_rows_updated = 0 then
    raise exception 'Profile for user % not found', p_user_id;
  end if;

  -- Recalculate leaderboard/ranks for visibility changes
  perform public.update_user_leaderboard(p_user_id);
  perform public.recalculate_all_ranks();

  -- Audit
  insert into public.audit_log(action, table_name, record_id, user_id)
  values ('ADMIN_ACTION', 'profiles', p_user_id, auth.uid());
end;
$function$
;

CREATE OR REPLACE FUNCTION public.auto_cleanup_contact_submissions()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Delete contact submissions older than 90 days
  DELETE FROM contact_submissions 
  WHERE created_at < NOW() - INTERVAL '90 days';
  
  -- Log cleanup action
  INSERT INTO audit_log (action, table_name, user_id)
  VALUES ('DATA_CLEANUP', 'contact_submissions', NULL);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.auto_delete_old_contact_submissions()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Delete contact submissions older than 90 days
  DELETE FROM public.contact_submissions 
  WHERE created_at < NOW() - INTERVAL '90 days';
  RETURN NULL;
END;
$function$
;

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

  -- Проверка суммы
  IF v_amount IS NULL OR v_amount = 0 THEN
    RAISE EXCEPTION 'Сумма начисления должна быть отличной от нуля';
  END IF;

  -- Дубль-защита только когда заданы source_type И source_id (и есть rule_id)
  IF p_source_type IS NOT NULL AND p_source_id IS NOT NULL THEN
    SELECT id INTO v_existing
    FROM public.coin_transactions
    WHERE user_id = p_user_id
      AND source_type = p_source_type
      AND source_id = p_source_id
      AND rule_id = v_rule.id
    LIMIT 1;

    IF v_existing IS NOT NULL THEN
      v_balance := public.get_user_coin_balance(p_user_id);
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

  -- Только запись в журнал. Баланс напрямую не меняем.
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

  v_balance := public.get_user_coin_balance(p_user_id);

  RETURN jsonb_build_object(
    'awarded', true,
    'duplicate', false,
    'transaction_id', v_tx_id,
    'balance', v_balance,
    'rule_id', v_rule.id,
    'amount', v_amount
  );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.book_schedule_session(p_telegram_id text, p_schedule_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id       UUID;
  v_max_part      INT;
  v_current_count BIGINT;
  v_rows_inserted INT;
BEGIN
  SELECT user_id INTO v_user_id
  FROM   profiles
  WHERE  telegram_id = p_telegram_id
  LIMIT  1;

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('booked', false, 'reason', 'not_linked');
  END IF;

  SELECT max_participants INTO v_max_part
  FROM   schedules
  WHERE  id = p_schedule_id
    AND  is_active = true
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('booked', false, 'reason', 'schedule_not_found');
  END IF;

  IF v_max_part IS NOT NULL THEN
    SELECT COUNT(*) INTO v_current_count
    FROM   schedule_participants
    WHERE  schedule_id = p_schedule_id;

    IF v_current_count >= v_max_part THEN
      RETURN jsonb_build_object(
        'booked',           false,
        'reason',           'session_full',
        'current_count',    v_current_count,
        'max_participants', v_max_part
      );
    END IF;
  END IF;

  INSERT INTO schedule_participants (schedule_id, user_id)
  VALUES (p_schedule_id, v_user_id)
  ON CONFLICT (schedule_id, user_id) DO NOTHING;

  GET DIAGNOSTICS v_rows_inserted = ROW_COUNT;

  IF v_rows_inserted = 0 THEN
    RETURN jsonb_build_object('booked', false, 'reason', 'already_booked');
  END IF;

  RETURN jsonb_build_object('booked', true);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.calculate_cooper_fitness_level(total_seconds integer)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Fitness levels based on total time for 4 exercises
  IF total_seconds IS NULL THEN
    RETURN 'unknown';
  ELSIF total_seconds <= 600 THEN -- 10 minutes or less
    RETURN 'excellent';
  ELSIF total_seconds <= 900 THEN -- 15 minutes or less
    RETURN 'good';
  ELSIF total_seconds <= 1200 THEN -- 20 minutes or less
    RETURN 'satisfactory';
  ELSE
    RETURN 'poor';
  END IF;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.calculate_cooper_fitness_level_minutes(total_minutes integer)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF total_minutes IS NULL THEN
    RETURN 'unknown';
  ELSIF total_minutes <= 3 THEN -- 3 minutes or less
    RETURN 'excellent';
  ELSIF total_minutes <= 4 THEN -- 4 minutes or less
    RETURN 'good';
  ELSIF total_minutes <= 5 THEN -- 5 minutes or less
    RETURN 'satisfactory';
  ELSE
    RETURN 'poor';
  END IF;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.check_in_activity(p_telegram_id text, p_activity_type text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id       UUID;
  v_stream_id     UUID;
  v_rows_inserted INT;
BEGIN
  SELECT p.user_id, p.current_stream_id
  INTO   v_user_id, v_stream_id
  FROM   profiles p
  WHERE  p.telegram_id = p_telegram_id
  LIMIT  1;

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'checked_in',      false,
      'already_checked', false,
      'date',            NULL,
      'reason',          'not_linked'
    );
  END IF;

  INSERT INTO activity_checkins (user_id, activity_type, stream_id)
  VALUES (v_user_id, p_activity_type, v_stream_id)
  ON CONFLICT (user_id, activity_type, checked_at) DO NOTHING;

  GET DIAGNOSTICS v_rows_inserted = ROW_COUNT;

  RETURN jsonb_build_object(
    'checked_in',      v_rows_inserted > 0,
    'already_checked', v_rows_inserted = 0,
    'date',            CURRENT_DATE
  );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.checkin_ascetic(p_telegram_id text, p_ascetic_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id UUID;
  v_row     RECORD;
  v_streak  INT;
BEGIN
  SELECT p.user_id INTO v_user_id
  FROM   profiles p
  WHERE  p.telegram_id = p_telegram_id
  LIMIT  1;

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_linked');
  END IF;

  -- FOR UPDATE — блокируем строку на время подсчёта стрика (та же защита от
  -- гонки, что и в book_schedule_session)
  SELECT streak, last_checkin_date
  INTO   v_row
  FROM   public.ascetic_activities
  WHERE  id = p_ascetic_id
    AND  user_id = v_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_found');
  END IF;

  IF v_row.last_checkin_date = CURRENT_DATE THEN
    RETURN jsonb_build_object(
      'ok',              true,
      'checked_in',      false,
      'already_checked', true,
      'streak',          v_row.streak
    );
  END IF;

  -- Стрик продолжается только если вчера уже был чекин, иначе стартует заново
  IF v_row.last_checkin_date = CURRENT_DATE - 1 THEN
    v_streak := v_row.streak + 1;
  ELSE
    v_streak := 1;
  END IF;

  UPDATE public.ascetic_activities
  SET streak = v_streak,
      last_checkin_date = CURRENT_DATE
  WHERE id = p_ascetic_id;

  RETURN jsonb_build_object(
    'ok',              true,
    'checked_in',      true,
    'already_checked', false,
    'streak',          v_streak
  );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.cleanup_expired_bot_sessions()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  DELETE FROM public.telegram_bot_sessions
  WHERE expires_at < now();

  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.cleanup_expired_sessions()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE admin_sessions 
  SET is_active = false 
  WHERE expires_at < now() AND is_active = true;
  
  DELETE FROM admin_sessions 
  WHERE expires_at < now() - interval '7 days';
END;
$function$
;

CREATE OR REPLACE FUNCTION public.cleanup_old_audit_logs()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Delete audit logs older than 1 year
  DELETE FROM public.audit_log 
  WHERE timestamp < NOW() - INTERVAL '1 year';
  
  -- Log the cleanup action
  INSERT INTO public.audit_log (action, table_name, user_id)
  VALUES ('AUDIT_LOG_CLEANUP', 'audit_log', NULL);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.confirm_referral_lead(_lead_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_lead public.referral_leads%ROWTYPE;
  v_bonus integer;
  v_enabled boolean;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Only admins can confirm referral leads';
  END IF;

  SELECT * INTO v_lead FROM public.referral_leads WHERE id = _lead_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Lead not found';
  END IF;

  IF v_lead.bonus_awarded THEN
    RAISE EXCEPTION 'Bonus already awarded for this lead';
  END IF;

  SELECT enabled, bonus_amount INTO v_enabled, v_bonus
  FROM public.referral_settings
  ORDER BY updated_at DESC
  LIMIT 1;

  IF NOT COALESCE(v_enabled, false) THEN
    RAISE EXCEPTION 'Referral program is disabled';
  END IF;

  -- Обновляем заявку
  UPDATE public.referral_leads
  SET status = 'confirmed',
      bonus_awarded = true,
      bonus_amount = v_bonus,
      confirmed_at = now(),
      processed_by = auth.uid()
  WHERE id = _lead_id;

  -- Обновляем баланс приглашающего
  UPDATE public.profiles
  SET referral_coins = COALESCE(referral_coins, 0) + v_bonus
  WHERE user_id = v_lead.referrer_user_id;

  -- Журнал транзакций (UNIQUE по source_id защитит от дубля)
  INSERT INTO public.coin_transactions (user_id, amount, reason, source_type, source_id, created_by)
  VALUES (v_lead.referrer_user_id, v_bonus, 'Реферальный бонус за приглашение', 'referral_lead', _lead_id, auth.uid());
END;
$function$
;

CREATE OR REPLACE FUNCTION public.create_reward_request(p_reward_id uuid, p_user_comment text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id UUID := auth.uid();
  v_status participant_status_type;
  v_cost INTEGER;
  v_active BOOLEAN;
  v_stock INTEGER;
  v_balance INTEGER;
  v_request_id UUID;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT participant_status INTO v_status
  FROM public.profiles WHERE user_id = v_user_id;

  -- Магазин доступен участникам интенсива и резидентам клуба
  IF v_status NOT IN ('intensive_active'::participant_status_type,
                      'club_resident'::participant_status_type) THEN
    RAISE EXCEPTION 'Магазин доступен участникам интенсива и резидентам клуба';
  END IF;

  SELECT cost_coins, is_active, stock
    INTO v_cost, v_active, v_stock
  FROM public.rewards WHERE id = p_reward_id FOR UPDATE;

  IF NOT FOUND OR NOT v_active THEN
    RAISE EXCEPTION 'Награда недоступна';
  END IF;

  IF v_stock IS NOT NULL AND v_stock <= 0 THEN
    RAISE EXCEPTION 'Награда закончилась';
  END IF;

  v_balance := public.get_user_coin_balance(v_user_id);
  IF v_balance < v_cost THEN
    RAISE EXCEPTION 'Недостаточно коинов (баланс: %, требуется: %)', v_balance, v_cost;
  END IF;

  INSERT INTO public.reward_requests (user_id, reward_id, cost_coins, user_comment)
  VALUES (v_user_id, p_reward_id, v_cost, p_user_comment)
  RETURNING id INTO v_request_id;

  INSERT INTO public.coin_transactions (user_id, amount, reason, source_type, source_id, created_by)
  VALUES (v_user_id, -v_cost, 'Заказ награды (резерв)', 'reward_request', v_request_id, v_user_id);

  IF v_stock IS NOT NULL THEN
    UPDATE public.rewards SET stock = stock - 1 WHERE id = p_reward_id;
  END IF;

  RETURN v_request_id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.decrypt_phone(encrypted_phone text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF encrypted_phone IS NULL OR length(trim(encrypted_phone)) = 0 THEN
    RETURN encrypted_phone;
  END IF;
  
  -- Decode base64 encryption
  BEGIN
    RETURN convert_from(
      decode(encrypted_phone, 'base64'), 
      'UTF8'
    );
  EXCEPTION WHEN OTHERS THEN
    -- Return original if decryption fails (for backward compatibility)
    RETURN encrypted_phone;
  END;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.encrypt_phone(phone_text text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF phone_text IS NULL OR length(trim(phone_text)) = 0 THEN
    RETURN phone_text;
  END IF;
  
  -- Simple XOR encryption with a fixed key for demo
  -- In production, use proper encryption with Supabase Vault
  RETURN encode(
    convert_to(phone_text, 'UTF8'), 
    'base64'
  );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.enhanced_contact_rate_limit(p_ip_address inet DEFAULT NULL::inet)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  current_ip inet;
  window_len interval := INTERVAL '15 minutes';
  max_per_window integer := 3;
  rec public.contact_rate_limit%ROWTYPE;
BEGIN
  current_ip := COALESCE(p_ip_address, inet_client_addr());

  -- Без определяемого IP не блокируем (иначе теряем реальные заявки)
  IF current_ip IS NULL THEN
    RETURN true;
  END IF;

  DELETE FROM public.contact_rate_limit
  WHERE window_start < NOW() - (window_len * 4);

  SELECT * INTO rec
  FROM public.contact_rate_limit
  WHERE ip_address = current_ip
    AND window_start > NOW() - window_len
  ORDER BY window_start DESC
  LIMIT 1;

  IF rec.id IS NULL THEN
    INSERT INTO public.contact_rate_limit (ip_address, submission_count, window_start)
    VALUES (current_ip, 1, NOW());
    RETURN true;
  END IF;

  IF rec.submission_count >= max_per_window THEN
    PERFORM public.log_security_event('RATE_LIMIT_EXCEEDED', NULL,
      jsonb_build_object(
        'ip', current_ip,
        'count', rec.submission_count,
        'window_minutes', 15,
        'limit', max_per_window
      ));
    RETURN false;
  END IF;

  UPDATE public.contact_rate_limit
  SET submission_count = submission_count + 1
  WHERE id = rec.id;

  RETURN true;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.enhanced_rate_limit_check(p_ip_address inet DEFAULT NULL::inet, p_action text DEFAULT 'contact_form'::text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  submission_count integer;
  current_ip inet;
  rate_limit integer;
  time_window interval;
BEGIN
  current_ip := COALESCE(p_ip_address, inet_client_addr());
  
  -- Set limits based on action type
  CASE p_action
    WHEN 'contact_form' THEN
      rate_limit := 3;
      time_window := INTERVAL '15 minutes';
    WHEN 'login_attempt' THEN
      rate_limit := 5;
      time_window := INTERVAL '5 minutes';
    ELSE
      rate_limit := 10;
      time_window := INTERVAL '10 minutes';
  END CASE;
  
  -- Count recent submissions from this IP
  SELECT COUNT(*) INTO submission_count
  FROM public.contact_submissions
  WHERE created_at > NOW() - time_window;
  
  -- Log if limit exceeded
  IF submission_count >= rate_limit THEN
    PERFORM public.log_security_event('RATE_LIMIT_EXCEEDED', NULL, 
      jsonb_build_object(
        'ip', current_ip, 
        'action', p_action,
        'count', submission_count,
        'limit', rate_limit
      ));
    RETURN false;
  END IF;
  
  RETURN true;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.enroll_application(p_submission_id uuid, p_stream_id uuid, p_user_id uuid DEFAULT NULL::uuid, p_new_status participant_status_type DEFAULT 'intensive_active'::participant_status_type)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_sub        contact_submissions%rowtype;
  v_lead       referral_leads%rowtype;
  v_referrer   uuid;
  v_award      json;
  v_ref_award  boolean := false;
  v_user_id    uuid := p_user_id;
  v_norm_phone text;
  v_link_code  text;
  v_created    boolean := false;
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'forbidden: admin only';
  end if;
  select * into v_sub
    from contact_submissions
   where id = p_submission_id
   for update;
  if not found then
    raise exception 'submission_not_found';
  end if;
  if v_sub.status = 'enrolled' then
    return json_build_object('ok', true, 'duplicate', true,
                             'message', 'Заявка уже зачислена',
                             'user_id', v_sub.enrolled_user_id);
  end if;
  v_norm_phone := public.normalize_phone(v_sub.phone);
  if v_user_id is null and v_norm_phone is not null then
    select user_id into v_user_id
      from profiles
     where public.normalize_phone(phone) = v_norm_phone
       and (telegram_id is null or telegram_id = '')
     order by updated_at desc nulls last
     limit 1;
  end if;
  if v_user_id is null then
    v_user_id := gen_random_uuid();
    insert into profiles (
      user_id, first_name, display_name, phone,
      participant_status, current_stream_id, stream_start_date
    ) values (
      v_user_id,
      coalesce(nullif(trim(v_sub.name), ''), 'Участник'),
      coalesce(nullif(trim(v_sub.name), ''), 'Участник'),
      v_sub.phone,
      p_new_status,
      p_stream_id,
      current_date
    );
    v_created := true;
    begin
      v_link_code := public.generate_telegram_link_code(v_user_id);
    exception when others then
      v_link_code := null;
    end;
  else
    update profiles
       set participant_status = p_new_status,
           current_stream_id  = p_stream_id,
           stream_start_date  = coalesce(stream_start_date, current_date)
     where user_id = v_user_id;
    if not found then
      raise exception 'profile_not_found';
    end if;
  end if;
  update contact_submissions
     set status           = 'enrolled',
         stream_id        = p_stream_id,
         enrolled_user_id = v_user_id,
         processed        = true,
         processed_at     = now(),
         processed_by     = auth.uid()
   where id = p_submission_id;
  if v_sub.referral_code is not null and length(trim(v_sub.referral_code)) > 0 then
    select * into v_lead
      from referral_leads
     where referral_code = v_sub.referral_code
       and reward_issued = false
       and (phone = v_sub.phone or name = v_sub.name)
     order by created_at desc
     limit 1
     for update;
    if not found then
      select user_id into v_referrer
        from profiles
       where referral_code = v_sub.referral_code
       limit 1;
      if v_referrer is not null then
        insert into referral_leads
               (name, phone, referral_code, referrer_user_id, status)
        values (v_sub.name, v_sub.phone, v_sub.referral_code,
                v_referrer, 'confirmed')
        returning * into v_lead;
      end if;
    end if;
    if v_lead.id is not null then
      v_award := award_coins_by_rule(
        p_user_id     => v_lead.referrer_user_id,
        p_rule_code   => 'referral_confirmed',
        p_source_type => 'referral_lead',
        p_source_id   => v_lead.id,
        p_reason      => 'Подтверждённый реферал (зачисление в интенсив)'
      );
      update referral_leads
         set status        = 'rewarded',
             reward_issued = true,
             bonus_awarded = true,
             confirmed_at  = coalesce(confirmed_at, now()),
             processed_by  = auth.uid()::text
       where id = v_lead.id;
      v_ref_award := true;
    end if;
  end if;
  return json_build_object(
    'ok', true,
    'user_id', v_user_id,
    'profile_created', v_created,
    'link_code', v_link_code,
    'referral_awarded', v_ref_award,
    'award', v_award
  );
end;
$function$
;

CREATE OR REPLACE FUNCTION public.ensure_referral_code(_user_id uuid)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_code text;
BEGIN
  IF auth.uid() <> _user_id AND NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  SELECT referral_code INTO v_code FROM public.profiles WHERE user_id = _user_id;

  IF v_code IS NULL OR length(v_code) = 0 THEN
    v_code := public.generate_referral_code();
    UPDATE public.profiles SET referral_code = v_code WHERE user_id = _user_id;
  END IF;

  RETURN v_code;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.generate_display_name()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Auto-generate display_name if not provided
  IF NEW.display_name IS NULL OR NEW.display_name = '' THEN
    NEW.display_name := public.mask_participant_name(NEW.participant_name);
  END IF;
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.generate_referral_code()
 RETURNS trigger
 LANGUAGE plpgsql
SET search_path = public
AS $function$
BEGIN
  IF NEW.referral_code IS NULL THEN
    NEW.referral_code := upper(substring(md5(random()::text), 1, 8));
  END IF;
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.generate_telegram_link_code(p_user_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_code text;
  v_exists boolean;
  v_attempts int := 0;
  v_max_attempts int := 30;
  v_found boolean := false;
  v_expires_at timestamptz := now() + interval '15 minutes';
BEGIN
  IF auth.uid() <> p_user_id AND NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Недостаточно прав для генерации кода привязки Telegram';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE user_id = p_user_id) THEN
    RAISE EXCEPTION 'Профиль не найден';
  END IF;

  WHILE v_attempts < v_max_attempts LOOP
    v_code := upper(
      substring(
        md5(random()::text || clock_timestamp()::text || p_user_id::text)
        FROM 1 FOR 8
      )
    );

    SELECT EXISTS(
      SELECT 1 FROM public.profiles
      WHERE telegram_link_code = v_code
        AND COALESCE(telegram_link_code_expires_at, now()) > now()
    ) INTO v_exists;

    IF NOT v_exists THEN
      v_found := true;
      EXIT;
    END IF;

    v_attempts := v_attempts + 1;
  END LOOP;

  IF NOT v_found THEN
    RAISE EXCEPTION 'Не удалось сгенерировать уникальный код привязки Telegram, попробуйте ещё раз';
  END IF;

  UPDATE public.profiles
  SET telegram_link_code = v_code,
      telegram_link_code_expires_at = v_expires_at,
      updated_at = now()
  WHERE user_id = p_user_id;

  RETURN jsonb_build_object('code', v_code, 'expires_at', v_expires_at);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_ascetic_for_user(p_telegram_id text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id UUID;
  v_row     RECORD;
BEGIN
  SELECT p.user_id INTO v_user_id
  FROM   profiles p
  WHERE  p.telegram_id = p_telegram_id
  LIMIT  1;

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('found', false, 'error', 'not_linked');
  END IF;

  -- Текущая аскеза — последняя по completed_at запись пользователя
  SELECT a.id, a.notes, a.streak, a.last_checkin_date
  INTO   v_row
  FROM   public.ascetic_activities a
  WHERE  a.user_id = v_user_id
  ORDER BY a.completed_at DESC
  LIMIT  1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('found', true, 'has_ascetic', false);
  END IF;

  RETURN jsonb_build_object(
    'found',           true,
    'has_ascetic',     true,
    'id',              v_row.id,
    'text',            v_row.notes,
    'streak',          v_row.streak,
    'checked_in_today', v_row.last_checkin_date = CURRENT_DATE
  );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_broadcast_audience(filter_json jsonb)
 RETURNS TABLE(total_count bigint, user_ids uuid[])
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_statuses   text[];
  v_stream_ids uuid[];
  v_tag_ids    uuid[];
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied: admin only';
  END IF;

  v_statuses   := array(SELECT jsonb_array_elements_text(COALESCE(filter_json->'statuses',   '[]'::jsonb)));
  v_stream_ids := array(SELECT jsonb_array_elements_text(COALESCE(filter_json->'stream_ids', '[]'::jsonb)));
  v_tag_ids    := array(SELECT jsonb_array_elements_text(COALESCE(filter_json->'tag_ids',    '[]'::jsonb)));

  RETURN QUERY
  WITH filtered_profiles AS (
    SELECT DISTINCT p.user_id
    FROM profiles p
    LEFT JOIN profile_tags pt ON pt.profile_user_id = p.user_id
    WHERE p.telegram_id IS NOT NULL
      AND p.approved = true
      AND (array_length(v_statuses, 1) IS NULL
           OR p.participant_status::text = ANY(v_statuses))
      AND (array_length(v_stream_ids, 1) IS NULL
           OR p.current_stream_id = ANY(v_stream_ids::uuid[]))
      AND (array_length(v_tag_ids, 1) IS NULL
           OR pt.tag_id = ANY(v_tag_ids::uuid[]))
  )
  SELECT COUNT(*)::bigint, array_agg(user_id)
  FROM filtered_profiles;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_homework_for_user(p_telegram_id text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id   UUID;
  v_stream_id UUID;
  v_homework  JSONB;
BEGIN
  SELECT p.user_id, p.current_stream_id
  INTO   v_user_id, v_stream_id
  FROM   profiles p
  WHERE  p.telegram_id = p_telegram_id
  LIMIT  1;

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('found', false, 'error', 'not_linked');
  END IF;

  SELECT jsonb_agg(
    jsonb_build_object(
      'id', a.id,
      'title', a.title,
      'theme', a.theme,
      'content', a.content,
      'deadline', a.deadline,
      'points_reward', a.points_reward,
      'file_url', a.file_url,
      'status', s.status,
      'submission_content', s.content,
      'admin_comment', s.admin_comment
    )
    ORDER BY a.created_at DESC
  )
  INTO v_homework
  FROM   public.homework_assignments a
  LEFT JOIN LATERAL (
    SELECT hs.status, hs.content, hs.admin_comment
    FROM   public.homework_submissions hs
    WHERE  hs.assignment_id = a.id
      AND  hs.user_id = v_user_id
    ORDER BY hs.created_at DESC
    LIMIT  1
  ) s ON true
  WHERE  a.is_active = true
    AND  (
      a.target_user_id = v_user_id
      OR (v_stream_id IS NOT NULL AND a.stream_id = v_stream_id)
    );

  RETURN jsonb_build_object('found', true, 'homework', COALESCE(v_homework, '[]'::jsonb));
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_journal_for_user(p_telegram_id text, p_date date DEFAULT CURRENT_DATE)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id  UUID;
  v_day_type TEXT;
  v_prompts  JSONB;
  v_entry_id UUID;
  v_entry    JSONB;
BEGIN
  SELECT p.user_id INTO v_user_id
  FROM   profiles p
  WHERE  p.telegram_id = p_telegram_id
  LIMIT  1;

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('found', false, 'error', 'not_linked');
  END IF;

  -- EXTRACT(DOW): 0=вс, 1=пн, 2=вт, 3=ср, 4=чт, 5=пт, 6=сб
  v_day_type := CASE EXTRACT(DOW FROM p_date)
                  WHEN 1 THEN 'monday'
                  WHEN 3 THEN 'wednesday'
                  WHEN 5 THEN 'friday'
                  WHEN 6 THEN 'saturday'
                  WHEN 0 THEN 'sunday'
                  ELSE 'monday'
                END;

  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id',            jp.id,
      'question_text', jp.question_text,
      'sort_order',    jp.sort_order
    )
    ORDER BY jp.sort_order
  ), '[]'::jsonb)
  INTO v_prompts
  FROM   public.journal_prompts jp
  WHERE  jp.day_type = v_day_type
    AND  jp.is_active = true;

  SELECT je.id INTO v_entry_id
  FROM   public.journal_entries je
  WHERE  je.user_id = v_user_id
    AND  je.entry_date = p_date
  LIMIT  1;

  IF v_entry_id IS NOT NULL THEN
    SELECT jsonb_build_object(
      'id',         je.id,
      'entry_date', je.entry_date,
      'day_type',   je.day_type,
      'emotions', (
        SELECT COALESCE(jsonb_agg(
          jsonb_build_object('emotion_name', em.emotion_name, 'intensity', em.intensity)
        ), '[]'::jsonb)
        FROM public.journal_emotions em
        WHERE em.entry_id = je.id
      ),
      'answers', (
        SELECT COALESCE(jsonb_agg(
          jsonb_build_object('prompt_id', a.prompt_id, 'answer_text', a.answer_text)
        ), '[]'::jsonb)
        FROM public.journal_answers a
        WHERE a.entry_id = je.id
      )
    )
    INTO v_entry
    FROM   public.journal_entries je
    WHERE  je.id = v_entry_id;
  END IF;

  RETURN jsonb_build_object(
    'found',    true,
    'date',     p_date,
    'day_type', v_day_type,
    'prompts',  v_prompts,
    'entry',    v_entry
  );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_participant_full_state(p_user_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_profile       public.profiles%ROWTYPE;
  v_result        JSONB;
  v_current_totem JSONB;
BEGIN
  IF NOT (
    auth.uid() = p_user_id
    OR public.is_admin(auth.uid())
    OR auth.role() = 'service_role'
    OR current_setting('role', true) = 'service_role'
  ) THEN
    RAISE EXCEPTION 'Нет доступа к данным участника';
  END IF;

  SELECT * INTO v_profile FROM public.profiles WHERE user_id = p_user_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'profile_not_found', 'user_id', p_user_id);
  END IF;

  -- Текущий тотем — только из актуальных user_totems + totems
  SELECT jsonb_build_object(
    'totem_id', t.id,
    'name', t.name,
    'totem_type', t.totem_type,
    'icon_name', t.icon_name,
    'icon_color', t.icon_color,
    'assigned_at', ut.assigned_at
  )
  INTO v_current_totem
  FROM public.user_totems ut
  JOIN public.totems t ON t.id = ut.totem_id
  WHERE ut.user_id = p_user_id
  ORDER BY ut.assigned_at DESC
  LIMIT 1;

  v_result := jsonb_build_object(
    'profile', jsonb_build_object(
      'user_id', v_profile.user_id,
      'display_name', v_profile.display_name,
      'first_name', v_profile.first_name,
      'last_name', v_profile.last_name,
      'avatar_url', v_profile.avatar_url,
      'telegram', v_profile.telegram,
      'total_points', COALESCE(v_profile.total_points, 0),
      'rank_position', COALESCE(v_profile.rank_position, 0),
      'referral_code', v_profile.referral_code
    ),
    'status', v_profile.participant_status,
    'approved', COALESCE(v_profile.approved, false),
    'stream', (
      SELECT jsonb_build_object('id', s.id, 'name', s.name, 'start_date', s.start_date, 'end_date', s.end_date)
      FROM public.intensive_streams s WHERE s.id = v_profile.current_stream_id
    ),
    'coins_balance', public.get_user_coin_balance(p_user_id),
    'total_points', COALESCE(v_profile.total_points, 0),
    'current_totem', v_current_totem,
    'totems_count', (SELECT COUNT(*) FROM public.user_totems WHERE user_id = p_user_id),
    'upcoming_homework', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('id', ha.id, 'title', ha.title, 'theme', ha.theme, 'deadline', ha.deadline, 'points_reward', ha.points_reward))
      FROM public.homework_assignments ha
      WHERE ha.is_active = true
        AND (ha.stream_id = v_profile.current_stream_id OR ha.target_user_id = p_user_id OR (ha.stream_id IS NULL AND ha.target_user_id IS NULL))
        AND (ha.deadline IS NULL OR ha.deadline >= now())
    ), '[]'::jsonb),
    'referrals_count', (SELECT COUNT(*) FROM public.referral_leads WHERE referrer_user_id = p_user_id),
    'referrals_confirmed', (SELECT COUNT(*) FROM public.referral_leads WHERE referrer_user_id = p_user_id AND status = 'confirmed'),
    'reward_requests', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('id', rr.id, 'reward_id', rr.reward_id, 'cost_coins', rr.cost_coins, 'status', rr.status, 'created_at', rr.created_at))
      FROM public.reward_requests rr WHERE rr.user_id = p_user_id
    ), '[]'::jsonb),
    'available_materials', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('id', m.id, 'title', m.title, 'block_type', m.block_type, 'theme', m.theme))
      FROM public.materials m
      WHERE m.is_active = true
        AND (m.open_date IS NULL OR m.open_date <= now())
        AND (m.stream_id IS NULL OR m.stream_id = v_profile.current_stream_id)
        AND (
          m.available_to = 'all'
          OR (m.available_to = 'intensive' AND v_profile.participant_status = 'intensive_active'::participant_status_type)
          OR (m.available_to = 'club'      AND v_profile.participant_status = 'club_resident'::participant_status_type)
        )
    ), '[]'::jsonb)
  );

  RETURN v_result;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_participant_full_state_by_telegram(p_telegram_id text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id uuid;
  v_is_service boolean;
BEGIN
  v_is_service := (current_setting('role', true) = 'service_role')
                  OR (auth.role() = 'service_role');

  IF NOT v_is_service THEN
    RAISE EXCEPTION 'get_participant_full_state_by_telegram доступна только серверу (service_role)';
  END IF;

  SELECT user_id INTO v_user_id
  FROM public.profiles
  WHERE telegram_id = p_telegram_id
  LIMIT 1;

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('linked', false, 'reason', 'telegram_not_linked');
  END IF;

  RETURN jsonb_build_object(
    'linked', true,
    'state', public.get_participant_full_state(v_user_id)
  );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_participant_timeline(_user_id uuid)
 RETURNS TABLE(event_type text, event_time timestamp with time zone, actor_id uuid, payload jsonb)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _rows int;
  _current_status text;
  _updated_at timestamptz;
BEGIN
  IF NOT (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin') OR public.is_super_admin(auth.uid())) THEN
    RAISE EXCEPTION 'Access denied: admin only';
  END IF;

  RETURN QUERY
  SELECT * FROM (
    SELECT
      'status_change'::text AS event_type,
      h.changed_at AS event_time,
      h.changed_by AS actor_id,
      jsonb_build_object(
        'old_status', h.old_status,
        'new_status', h.new_status,
        'stream_id',  h.stream_id
      ) AS payload
    FROM participant_status_history h
    WHERE h.profile_user_id = _user_id

    UNION ALL
    SELECT 'note'::text, n.created_at, n.author_id,
      jsonb_build_object('note', n.note)
    FROM participant_notes n
    WHERE n.profile_user_id = _user_id

    UNION ALL
    SELECT 'audit'::text, a.timestamp, a.user_id,
      jsonb_build_object('action', a.action, 'table_name', a.table_name, 'record_id', a.record_id)
    FROM audit_log a
    WHERE a.record_id = _user_id

    UNION ALL
    SELECT 'application'::text, cs.created_at, cs.processed_by,
      jsonb_build_object(
        'phone', cs.phone, 'name', cs.name, 'course', cs.course, 'social', cs.social,
        'referral_code', COALESCE(cs.referral_code, cs.ref_code),
        'status', cs.status, 'stream_id', cs.stream_id, 'submission_id', cs.id
      )
    FROM contact_submissions cs
    WHERE cs.enrolled_user_id = _user_id
  ) t
  ORDER BY t.event_time DESC;

  GET DIAGNOSTICS _rows = ROW_COUNT;

  IF _rows = 0 THEN
    SELECT p.participant_status::text, p.updated_at
      INTO _current_status, _updated_at
    FROM profiles p
    WHERE p.user_id = _user_id
    LIMIT 1;

    IF _current_status IS NOT NULL THEN
      RETURN QUERY SELECT
        'current_status'::text,
        COALESCE(_updated_at, now()),
        NULL::uuid,
        jsonb_build_object('status', _current_status);
    END IF;
  END IF;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_profile_for_user(p_telegram_id text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id UUID;
  v_profile JSONB;
  v_cooper  JSONB;
  v_totems  JSONB;
BEGIN
  SELECT p.user_id INTO v_user_id
  FROM   profiles p
  WHERE  p.telegram_id = p_telegram_id
  LIMIT  1;

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('found', false, 'error', 'not_linked');
  END IF;

  SELECT jsonb_build_object(
    'first_name',    p.first_name,
    'last_name',     p.last_name,
    'avatar_url',    p.avatar_url,
    'weight_kg',     p.weight_kg,
    'height_cm',     p.height_cm,
    'date_of_birth', p.date_of_birth
  )
  INTO v_profile
  FROM   profiles p
  WHERE  p.user_id = v_user_id;

  -- Последний тест Купера (текущая схема — время прохождения, не дистанция)
  SELECT jsonb_build_object(
    'test_date',     c.test_date,
    'total_minutes', c.total_minutes,
    'total_seconds', c.total_seconds,
    'fitness_level', c.fitness_level
  )
  INTO v_cooper
  FROM   cooper_test_results c
  WHERE  c.user_id = v_user_id
  ORDER BY c.test_date DESC
  LIMIT  1;

  -- Тотемы участника
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id',          t.id,
      'name',        t.name,
      'discipline',  t.discipline,
      'icon_name',   t.icon_name,
      'icon_color',  t.icon_color,
      'assigned_at', ut.assigned_at
    )
    ORDER BY ut.assigned_at DESC
  ), '[]'::jsonb)
  INTO v_totems
  FROM   user_totems ut
  JOIN   totems t ON t.id = ut.totem_id
  WHERE  ut.user_id = v_user_id;

  RETURN jsonb_build_object(
    'found',       true,
    'profile',     v_profile,
    'cooper_test', v_cooper,
    'totems',      v_totems
  );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_pyramid_for_user(p_telegram_id text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id UUID;
  v_levels  JSONB;
BEGIN
  SELECT p.user_id INTO v_user_id
  FROM   profiles p
  WHERE  p.telegram_id = p_telegram_id
  LIMIT  1;

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('found', false, 'error', 'not_linked');
  END IF;

  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id',               l.id,
      'level_number',     l.level_number,
      'title',            l.title,
      'description',      l.description,
      'presentation_url', l.presentation_url,
      'is_unlocked',      l.is_unlocked
    )
    ORDER BY l.level_number ASC
  ), '[]'::jsonb)
  INTO v_levels
  FROM   public.pyramid_levels l;

  RETURN jsonb_build_object('found', true, 'levels', v_levels);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_rating_for_user(p_telegram_id text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id   UUID;
  v_stream_id UUID;
  v_my        JSONB;
  v_board     JSONB;
BEGIN
  SELECT p.user_id, p.current_stream_id
  INTO   v_user_id, v_stream_id
  FROM   profiles p
  WHERE  p.telegram_id = p_telegram_id
  LIMIT  1;

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('found', false, 'error', 'not_linked');
  END IF;

  -- Моя статистика: очки/разбивка из leaderboard, позиция из profiles
  SELECT jsonb_build_object(
    'rank_position', p.rank_position,
    'total_points',  COALESCE(l.total_points, p.total_points, 0),
    'breakdown', jsonb_build_object(
      'bjj',          COALESCE(l.bjj_points, 0),
      'kickboxing',   COALESCE(l.kickboxing_points, 0),
      'ofp',          COALESCE(l.ofp_points, 0),
      'theory',       COALESCE(l.theory_points, 0),
      'tactical',     COALESCE(l.tactical_points, 0),
      'nutrition',    COALESCE(l.nutrition_points, 0),
      'kamp_pyramid', COALESCE(l.kamp_pyramid_points, 0),
      'challenges',   COALESCE(l.challenges_points, 0)
    ),
    'attendance', (
      SELECT jsonb_build_object(
        'total',   COALESCE(SUM(t.cnt), 0),
        'by_type', COALESCE(jsonb_agg(
                     jsonb_build_object('activity_type', t.activity_type, 'count', t.cnt)
                     ORDER BY t.activity_type
                   ), '[]'::jsonb)
      )
      FROM (
        SELECT activity_type, COUNT(*) AS cnt
        FROM   public.activity_checkins
        WHERE  user_id = v_user_id
        GROUP BY activity_type
      ) t
    )
  )
  INTO v_my
  FROM   profiles p
  LEFT JOIN leaderboard l ON l.user_id = p.user_id
  WHERE  p.user_id = v_user_id;

  -- Топ-10 потока
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'user_id',       x.user_id,
      'display_name',  x.display_name,
      'first_name',    x.first_name,
      'last_name',     x.last_name,
      'avatar_url',    x.avatar_url,
      'rank_position', x.rank_position,
      'total_points',  x.total_points,
      'is_me',         x.user_id = v_user_id
    )
    ORDER BY x.rank_position ASC
  ), '[]'::jsonb)
  INTO v_board
  FROM (
    SELECT p2.user_id, p2.display_name, p2.first_name, p2.last_name, p2.avatar_url,
           p2.rank_position, COALESCE(l2.total_points, p2.total_points, 0) AS total_points
    FROM   profiles p2
    LEFT JOIN leaderboard l2 ON l2.user_id = p2.user_id
    WHERE  p2.current_stream_id = v_stream_id
      AND  p2.approved = true
      AND  COALESCE(p2.leaderboard_visible, true) = true
      AND  COALESCE(p2.profile_private, false) = false
      AND  p2.rank_position IS NOT NULL
      AND  p2.user_id NOT IN (
             SELECT ur.user_id FROM user_roles ur WHERE ur.role IN ('admin', 'super_admin')
           )
    ORDER BY p2.rank_position ASC
    LIMIT 10
  ) x;

  RETURN jsonb_build_object(
    'found',       true,
    'stream_id',   v_stream_id,
    'my',          v_my,
    'leaderboard', v_board
  );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_schedule_for_user(p_telegram_id text, p_from timestamp with time zone DEFAULT now(), p_days integer DEFAULT 7)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id   UUID;
  v_stream_id UUID;
  v_status    TEXT;
BEGIN
  SELECT p.user_id,
         p.current_stream_id,
         p.participant_status::TEXT
  INTO   v_user_id, v_stream_id, v_status
  FROM   profiles p
  WHERE  p.telegram_id = p_telegram_id
  LIMIT  1;

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('found', false, 'error', 'not_linked');
  END IF;

  RETURN jsonb_build_object(
    'found',     true,
    'stream_id', v_stream_id,
    'status',    v_status,
    'schedule',  (
      SELECT COALESCE(
        jsonb_agg(
          jsonb_build_object(
            'id',               s.id,
            'title',            s.title,
            'activity_type',    s.activity_type,
            'description',      s.description,
            'start_time',       s.start_time,
            'end_time',         s.end_time,
            'location',         s.location,
            'color',            s.color,
            'max_participants', s.max_participants,
            'booked_count',     (
              SELECT COUNT(*)
              FROM   schedule_participants sp2
              WHERE  sp2.schedule_id = s.id
            ),
            'instructor', CASE
              WHEN t.id IS NULL THEN NULL
              ELSE jsonb_build_object('id', t.id, 'name', t.name, 'role', t.role)
            END,
            'booked', EXISTS (
              SELECT 1
              FROM   schedule_participants sp
              WHERE  sp.schedule_id = s.id
                AND  sp.user_id     = v_user_id
            ),
            'attended', (
              SELECT sp.attended
              FROM   schedule_participants sp
              WHERE  sp.schedule_id = s.id
                AND  sp.user_id     = v_user_id
              LIMIT  1
            )
          )
          ORDER BY s.start_time
        ),
        '[]'::jsonb
      )
      FROM   schedules s
      LEFT JOIN trainers t ON t.id = s.instructor_id
      WHERE  s.is_active = true
        AND  s.start_time >= p_from
        AND  s.start_time <  p_from + (p_days || ' days')::INTERVAL
        AND  (
          (     v_status IN ('intensive_active', 'intensive_completed')
            AND s.schedule_type = 'intensive'
            AND (s.stream_id = v_stream_id OR s.stream_id IS NULL)
          )
          OR
          (     v_status IN ('club_resident', 'alumni')
            AND s.schedule_type = 'club'
          )
        )
    )
  );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_user_coin_balance(p_user_id uuid)
 RETURNS integer
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- v4: только собственный баланс, администратор или service_role
  IF auth.uid() IS NOT NULL
     AND current_user NOT IN ('service_role','postgres','supabase_admin')
     AND p_user_id IS DISTINCT FROM auth.uid()
     AND NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'access denied: own balance or admin role required';
  END IF;

  RETURN (
    SELECT COALESCE(SUM(amount), 0)::INTEGER
    FROM public.coin_transactions
    WHERE user_id = p_user_id
  );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (user_id, first_name, last_name, display_name, email)
  VALUES (
    NEW.id, 
    NEW.raw_user_meta_data->>'first_name',
    NEW.raw_user_meta_data->>'last_name',
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email),
    NEW.email
  );
  
  -- Initialize leaderboard entry
  INSERT INTO public.leaderboard (user_id)
  VALUES (NEW.id);
  
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.handle_new_user_participant()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public."участники" (user_id, name, last_name, points)
  VALUES (
    NEW.id, 
    COALESCE(NEW.raw_user_meta_data->>'name', 'Новый участник'),
    COALESCE(NEW.raw_user_meta_data->>'lastName', ''),
    0
  );
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role user_role)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  );
$function$
;

CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('admin', 'super_admin')
  );
$function$
;

CREATE OR REPLACE FUNCTION public.is_club_resident(_user_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE user_id = _user_id
      AND participant_status = 'club_resident'
      AND approved = true
  );
$function$
;

CREATE OR REPLACE FUNCTION public.is_public_participant(_user_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE user_id = _user_id
      AND approved = true
      AND leaderboard_visible = true
      AND profile_private = false
  );
$function$
;

CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = 'super_admin'
  );
$function$
;

CREATE OR REPLACE FUNCTION public.link_or_create_telegram_profile(p_telegram_id text, p_telegram_username text DEFAULT NULL::text, p_telegram_first_name text DEFAULT NULL::text, p_telegram_last_name text DEFAULT NULL::text, p_phone text DEFAULT NULL::text, p_referral_code text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_is_service boolean;
  v_norm_phone text;
  v_user_id uuid;
  v_lead_id uuid;
BEGIN
  v_is_service := (current_setting('role', true) = 'service_role')
                  OR (auth.role() = 'service_role');

  IF NOT v_is_service THEN
    RAISE EXCEPTION 'link_or_create_telegram_profile доступна только серверу (service_role)';
  END IF;

  IF p_telegram_id IS NULL OR length(trim(p_telegram_id)) = 0 THEN
    RAISE EXCEPTION 'telegram_id обязателен';
  END IF;

  -- 1) Telegram уже привязан
  SELECT user_id INTO v_user_id
  FROM public.profiles
  WHERE telegram_id = p_telegram_id
  LIMIT 1;

  IF v_user_id IS NOT NULL THEN
    RETURN jsonb_build_object(
      'status', 'linked',
      'linked', true,
      'state', public.get_participant_full_state(v_user_id)
    );
  END IF;

  v_norm_phone := public.normalize_phone(p_phone);

  -- 2) Поиск профиля по телефону
  IF v_norm_phone IS NOT NULL THEN
    SELECT user_id INTO v_user_id
    FROM public.profiles
    WHERE public.normalize_phone(phone) = v_norm_phone
      AND (telegram_id IS NULL OR telegram_id = '')
    ORDER BY updated_at DESC NULLS LAST
    LIMIT 1;
  END IF;

  IF v_user_id IS NOT NULL THEN
    UPDATE public.profiles
    SET telegram_id = p_telegram_id,
        telegram_username = COALESCE(p_telegram_username, telegram_username),
        telegram_first_name = COALESCE(p_telegram_first_name, telegram_first_name),
        telegram_last_name = COALESCE(p_telegram_last_name, telegram_last_name),
        telegram_linked_at = now(),
        updated_at = now()
    WHERE user_id = v_user_id;

    RETURN jsonb_build_object(
      'status', 'linked',
      'linked', true,
      'state', public.get_participant_full_state(v_user_id)
    );
  END IF;

  -- 3) Профиль не найден — заявка
  SELECT id INTO v_lead_id
  FROM public.telegram_leads
  WHERE telegram_id = p_telegram_id
    AND status IN ('new', 'waiting_admin_approval')
  LIMIT 1;

  IF v_lead_id IS NOT NULL THEN
    UPDATE public.telegram_leads
    SET telegram_username = COALESCE(p_telegram_username, telegram_username),
        telegram_first_name = COALESCE(p_telegram_first_name, telegram_first_name),
        telegram_last_name = COALESCE(p_telegram_last_name, telegram_last_name),
        phone = COALESCE(p_phone, phone),
        normalized_phone = COALESCE(v_norm_phone, normalized_phone),
        referral_code = COALESCE(p_referral_code, referral_code),
        updated_at = now()
    WHERE id = v_lead_id;
  ELSE
    INSERT INTO public.telegram_leads (
      telegram_id,
      telegram_username,
      telegram_first_name,
      telegram_last_name,
      phone,
      normalized_phone,
      referral_code,
      status
    ) VALUES (
      p_telegram_id,
      p_telegram_username,
      p_telegram_first_name,
      p_telegram_last_name,
      p_phone,
      v_norm_phone,
      p_referral_code,
      'waiting_admin_approval'
    )
    RETURNING id INTO v_lead_id;
  END IF;

  RETURN jsonb_build_object(
    'status', 'application_created',
    'linked', false,
    'reason', 'waiting_admin_approval',
    'lead_id', v_lead_id
  );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.link_telegram_lead_to_profile(p_lead_id uuid, p_profile_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_lead            public.telegram_leads%ROWTYPE;
  v_referrer_id     uuid;
  v_award           jsonb := NULL;
  v_now             timestamptz := now();
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Only admins can link telegram leads';
  END IF;

  SELECT * INTO v_lead
  FROM public.telegram_leads
  WHERE id = p_lead_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Telegram lead not found: %', p_lead_id;
  END IF;

  IF v_lead.status = 'linked' THEN
    RAISE EXCEPTION 'Telegram lead is already linked';
  END IF;

  UPDATE public.profiles
  SET
    telegram_id         = v_lead.telegram_id,
    telegram_username   = v_lead.telegram_username,
    telegram_first_name = v_lead.telegram_first_name,
    telegram_last_name  = v_lead.telegram_last_name,
    telegram_linked_at  = v_now,
    updated_at          = v_now
  WHERE user_id = p_profile_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profile not found: %', p_profile_id;
  END IF;

  UPDATE public.telegram_leads
  SET
    status       = 'linked',
    processed_by = auth.uid(),
    processed_at = v_now,
    updated_at   = v_now
  WHERE id = p_lead_id;

  IF v_lead.referral_code IS NOT NULL THEN
    SELECT user_id INTO v_referrer_id
    FROM public.profiles
    WHERE referral_code = v_lead.referral_code
    LIMIT 1;

    IF v_referrer_id IS NOT NULL THEN
      v_award := public.award_coins_by_rule(
        p_user_id     => v_referrer_id,
        p_rule_code   => 'referral_telegram_signup',
        p_source_type => 'telegram_lead',
        p_source_id   => p_lead_id,
        p_reason      => 'Реферал через Telegram-бот'
      );
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'linked',          true,
    'lead_id',         p_lead_id,
    'profile_id',      p_profile_id,
    'referral_code',   v_lead.referral_code,
    'referrer_id',     v_referrer_id,
    'referral_award',  v_award
  );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.link_telegram_profile(p_link_code text, p_telegram_id text, p_telegram_username text DEFAULT NULL::text, p_telegram_first_name text DEFAULT NULL::text, p_telegram_last_name text DEFAULT NULL::text, p_telegram_photo_url text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_profile public.profiles%ROWTYPE;
  v_is_service boolean;
BEGIN
  v_is_service := (current_setting('role', true) = 'service_role')
                  OR (auth.role() = 'service_role');

  IF NOT v_is_service THEN
    RAISE EXCEPTION 'link_telegram_profile доступна только серверу (service_role)';
  END IF;

  IF p_link_code IS NULL OR length(trim(p_link_code)) = 0 THEN
    RAISE EXCEPTION 'Не указан код привязки';
  END IF;

  IF p_telegram_id IS NULL OR length(trim(p_telegram_id)) = 0 THEN
    RAISE EXCEPTION 'Не указан telegram_id';
  END IF;

  SELECT * INTO v_profile
  FROM public.profiles
  WHERE telegram_link_code = upper(trim(p_link_code))
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('linked', false, 'reason', 'invalid_code');
  END IF;

  IF v_profile.telegram_link_code_expires_at IS NULL
     OR v_profile.telegram_link_code_expires_at < now() THEN
    RETURN jsonb_build_object('linked', false, 'reason', 'code_expired');
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.profiles
    WHERE telegram_id = p_telegram_id
      AND user_id <> v_profile.user_id
  ) THEN
    RETURN jsonb_build_object('linked', false, 'reason', 'telegram_already_linked');
  END IF;

  UPDATE public.profiles
  SET telegram_id = p_telegram_id,
      telegram_username = p_telegram_username,
      telegram_first_name = p_telegram_first_name,
      telegram_last_name = p_telegram_last_name,
      telegram_photo_url = p_telegram_photo_url,
      telegram_linked_at = now(),
      telegram_link_code = NULL,
      telegram_link_code_expires_at = NULL,
      updated_at = now()
  WHERE user_id = v_profile.user_id;

  RETURN jsonb_build_object(
    'linked', true,
    'user_id', v_profile.user_id,
    'profile', jsonb_build_object(
      'display_name', v_profile.display_name,
      'first_name', v_profile.first_name,
      'last_name', v_profile.last_name,
      'participant_status', v_profile.participant_status
    )
  );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.log_contact_form_access()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Log when contact form data is accessed by admins
  IF TG_OP = 'SELECT' AND auth.uid() IS NOT NULL THEN
    INSERT INTO public.audit_log (
      user_id, 
      action, 
      table_name, 
      record_id, 
      timestamp
    ) VALUES (
      auth.uid(), 
      'CONTACT_FORM_ACCESS', 
      'contact_submissions', 
      NEW.id, 
      NOW()
    );
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.log_participant_status_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.participant_status IS DISTINCT FROM OLD.participant_status THEN
    INSERT INTO public.participant_status_history
      (profile_user_id, old_status, new_status, stream_id, changed_by)
    VALUES
      (NEW.user_id, OLD.participant_status, NEW.participant_status,
       NEW.current_stream_id, auth.uid());
  END IF;
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.log_role_changes()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.role_audit_log (user_id, role_assigned, assigned_by, action, notes)
    VALUES (NEW.user_id, NEW.role, NEW.assigned_by, 'GRANTED', 'Role granted via trigger');
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.role_audit_log (user_id, role_assigned, assigned_by, action, notes)
    VALUES (OLD.user_id, OLD.role, auth.uid(), 'REVOKED', 'Role revoked via trigger');
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.log_security_access(p_action text, p_table_name text DEFAULT NULL::text, p_record_id uuid DEFAULT NULL::uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO audit_log (
    user_id, 
    action, 
    table_name,
    record_id,
    ip_address
  ) VALUES (
    auth.uid(), 
    p_action, 
    p_table_name,
    p_record_id,
    inet_client_addr()
  );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.log_security_event(event_type text, user_id_param uuid DEFAULT NULL::uuid, details jsonb DEFAULT NULL::jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Validate event type before logging
  IF NOT (event_type = ANY(ARRAY[
    'LOGIN', 'LOGOUT', 'CONTACT_FORM_ACCESS', 'RATE_LIMIT_EXCEEDED',
    'ROLE_CHANGE', 'DATA_EXPORT', 'ADMIN_ACTION', 'SECURITY_EVENT',
    'DATA_CLEANUP', 'SESSION_EXPIRED', 'PARTICIPANT_STATUS_CHANGE'
  ])) THEN
    RAISE EXCEPTION 'Invalid security event type: %', event_type;
  END IF;

  INSERT INTO public.audit_log (
    user_id, 
    action, 
    table_name, 
    record_id, 
    ip_address, 
    user_agent
  ) VALUES (
    COALESCE(user_id_param, auth.uid()),
    event_type,
    'security_events',
    NULL,
    inet_client_addr(),
    NULL
  );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.mask_email_secure(email_address text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  at_pos integer;
  local_part text;
  domain_part text;
BEGIN
  IF email_address IS NULL OR email_address !~ '^[^@]+@[^@]+\.[^@]+$' THEN
    RETURN email_address;
  END IF;
  
  at_pos := POSITION('@' IN email_address);
  local_part := LEFT(email_address, at_pos - 1);
  domain_part := SUBSTRING(email_address FROM at_pos);
  
  -- Mask local part: show first 2 chars, mask middle, show last char before @
  IF LENGTH(local_part) <= 3 THEN
    RETURN LEFT(local_part, 1) || '***' || domain_part;
  ELSE
    RETURN LEFT(local_part, 2) || 
           REPEAT('*', GREATEST(1, LENGTH(local_part) - 3)) || 
           RIGHT(local_part, 1) || domain_part;
  END IF;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.mask_participant_name(full_name text)
 RETURNS text
 LANGUAGE plpgsql
 IMMUTABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  name_parts text[];
  first_name text;
  last_initial text;
BEGIN
  IF full_name IS NULL OR LENGTH(TRIM(full_name)) = 0 THEN
    RETURN 'Участник';
  END IF;
  
  -- Split name by spaces
  name_parts := string_to_array(TRIM(full_name), ' ');
  
  -- Get first name
  first_name := name_parts[1];
  
  -- Get last name initial if exists
  IF array_length(name_parts, 1) > 1 THEN
    last_initial := LEFT(name_parts[2], 1) || '.';
    RETURN first_name || ' ' || last_initial;
  ELSE
    RETURN first_name;
  END IF;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.mask_phone_number(phone_number text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF phone_number IS NULL OR LENGTH(phone_number) < 6 THEN
    RETURN phone_number;
  END IF;
  
  -- Mask middle digits, keep first 2 and last 2
  RETURN SUBSTRING(phone_number FROM 1 FOR 2) || 
         REPEAT('*', GREATEST(0, LENGTH(phone_number) - 4)) || 
         RIGHT(phone_number, 2);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.mask_phone_secure(phone_number text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF phone_number IS NULL OR LENGTH(phone_number) < 6 THEN
    RETURN phone_number;
  END IF;
  
  -- Enhanced masking: show country code and last 2 digits only
  IF phone_number LIKE '+%' THEN
    -- For international numbers like +1234567890 -> +12*****90
    RETURN SUBSTRING(phone_number FROM 1 FOR 3) || 
           REPEAT('*', GREATEST(0, LENGTH(phone_number) - 5)) || 
           RIGHT(phone_number, 2);
  ELSE
    -- For local numbers, mask middle section
    RETURN LEFT(phone_number, 2) || 
           REPEAT('*', GREATEST(0, LENGTH(phone_number) - 4)) || 
           RIGHT(phone_number, 2);
  END IF;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.normalize_phone(p_phone text)
 RETURNS text
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO 'public'
AS $function$
DECLARE
  v_digits text;
BEGIN
  IF p_phone IS NULL THEN
    RETURN NULL;
  END IF;

  v_digits := regexp_replace(p_phone, '\D', '', 'g');

  IF v_digits IS NULL OR length(v_digits) = 0 THEN
    RETURN NULL;
  END IF;

  IF length(v_digits) = 11 AND left(v_digits, 1) IN ('7', '8') THEN
    RETURN right(v_digits, 10);
  END IF;

  IF length(v_digits) = 10 THEN
    RETURN v_digits;
  END IF;

  RETURN v_digits;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.recalculate_all_ranks()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Сбрасываем все ранги в 0
  UPDATE leaderboard SET rank_position = 0 WHERE TRUE;
  
  -- Пересчитываем ранги отдельно для каждого потока
  WITH visible_admins AS (
    SELECT user_id FROM user_roles 
    WHERE role IN ('admin', 'super_admin')
  ),
  ranked_users AS (
    SELECT 
      l.user_id,
      ROW_NUMBER() OVER (
        PARTITION BY p.current_stream_id 
        ORDER BY l.total_points DESC, l.last_updated ASC
      ) as new_rank
    FROM leaderboard l
    INNER JOIN profiles p ON p.user_id = l.user_id
    WHERE l.total_points > 0
      AND p.approved = true
      AND COALESCE(p.leaderboard_visible, true) = true
      AND COALESCE(p.profile_private, false) = false
      AND l.user_id NOT IN (SELECT user_id FROM visible_admins)
  )
  UPDATE leaderboard 
  SET rank_position = ranked_users.new_rank
  FROM ranked_users
  WHERE leaderboard.user_id = ranked_users.user_id;
  
  -- Обновляем rank_position в таблице profiles
  UPDATE profiles p
  SET rank_position = COALESCE((SELECT rank_position FROM leaderboard WHERE user_id = p.user_id), 0)
  WHERE TRUE;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.review_homework_submission(p_submission_id uuid, p_status text, p_admin_comment text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_submission public.homework_submissions%ROWTYPE;
  v_points INTEGER := 0;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Only admins can review homework';
  END IF;

  IF p_status NOT IN ('accepted', 'rework') THEN
    RAISE EXCEPTION 'Invalid status: %', p_status;
  END IF;

  SELECT * INTO v_submission FROM public.homework_submissions WHERE id = p_submission_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Submission not found';
  END IF;

  IF p_status = 'accepted' AND v_submission.assignment_id IS NOT NULL THEN
    SELECT points_reward INTO v_points FROM public.homework_assignments WHERE id = v_submission.assignment_id;
    v_points := COALESCE(v_points, 10);
  END IF;

  UPDATE public.homework_submissions
  SET status = p_status,
      admin_comment = p_admin_comment,
      reviewed_at = now(),
      reviewed_by = auth.uid(),
      verified = (p_status = 'accepted'),
      points_earned = CASE WHEN p_status = 'accepted' THEN v_points ELSE 0 END
  WHERE id = p_submission_id;

  PERFORM public.update_user_leaderboard(v_submission.user_id);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.review_reward_request(p_request_id uuid, p_new_status text, p_admin_comment text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_admin UUID := auth.uid();
  v_req RECORD;
BEGIN
  IF NOT is_admin(v_admin) THEN
    RAISE EXCEPTION 'Только админ';
  END IF;

  IF p_new_status NOT IN ('approved','rejected','fulfilled','cancelled') THEN
    RAISE EXCEPTION 'Недопустимый статус';
  END IF;

  SELECT * INTO v_req FROM public.reward_requests WHERE id = p_request_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Заявка не найдена';
  END IF;

  -- Refund on reject/cancel if not already refunded
  IF p_new_status IN ('rejected','cancelled') AND v_req.status NOT IN ('rejected','cancelled') THEN
    INSERT INTO public.coin_transactions (user_id, amount, reason, source_type, source_id, created_by)
    VALUES (v_req.user_id, v_req.cost_coins, 'Возврат коинов (отмена награды)', 'reward_request', v_req.id, v_admin);

    -- Restore stock if tracked
    UPDATE public.rewards SET stock = stock + 1
    WHERE id = v_req.reward_id AND stock IS NOT NULL;
  END IF;

  UPDATE public.reward_requests
  SET status = p_new_status,
      admin_comment = COALESCE(p_admin_comment, admin_comment),
      reviewed_by = v_admin,
      reviewed_at = now(),
      fulfilled_at = CASE WHEN p_new_status = 'fulfilled' THEN now() ELSE fulfilled_at END
  WHERE id = p_request_id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.save_journal_entry(p_telegram_id text, p_entry_date date, p_day_type text, p_emotions jsonb, p_answers jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id  UUID;
  v_entry_id UUID;
BEGIN
  SELECT p.user_id INTO v_user_id
  FROM   profiles p
  WHERE  p.telegram_id = p_telegram_id
  LIMIT  1;

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_linked');
  END IF;

  IF p_day_type NOT IN ('monday', 'wednesday', 'friday', 'saturday', 'sunday', 'weekday') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_day_type');
  END IF;

  INSERT INTO public.journal_entries (user_id, entry_date, day_type)
  VALUES (v_user_id, p_entry_date, p_day_type)
  ON CONFLICT (user_id, entry_date) DO NOTHING
  RETURNING id INTO v_entry_id;

  IF v_entry_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'already_exists');
  END IF;

  INSERT INTO public.journal_emotions (entry_id, emotion_name, intensity)
  SELECT v_entry_id, elem->>'name', (elem->>'intensity')::int
  FROM   jsonb_array_elements(COALESCE(p_emotions, '[]'::jsonb)) elem;

  INSERT INTO public.journal_answers (entry_id, prompt_id, answer_text)
  SELECT v_entry_id, (elem->>'prompt_id')::uuid, elem->>'text'
  FROM   jsonb_array_elements(COALESCE(p_answers, '[]'::jsonb)) elem;

  RETURN jsonb_build_object(
    'ok', true,
    'entry', jsonb_build_object(
      'id',         v_entry_id,
      'entry_date', p_entry_date,
      'day_type',   p_day_type,
      'emotions', (
        SELECT COALESCE(jsonb_agg(
          jsonb_build_object('emotion_name', em.emotion_name, 'intensity', em.intensity)
        ), '[]'::jsonb)
        FROM public.journal_emotions em
        WHERE em.entry_id = v_entry_id
      ),
      'answers', (
        SELECT COALESCE(jsonb_agg(
          jsonb_build_object('prompt_id', a.prompt_id, 'answer_text', a.answer_text)
        ), '[]'::jsonb)
        FROM public.journal_answers a
        WHERE a.entry_id = v_entry_id
      )
    )
  );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.server_challenge_checkin(p_user_id uuid, p_challenge_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_challenge RECORD;
  v_today DATE := CURRENT_DATE;
  v_existing UUID;
  v_entry_id UUID;
  v_total_tickets INT;
BEGIN
  SELECT * INTO v_challenge FROM challenges WHERE id = p_challenge_id AND is_active = true;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Челлендж не найден');
  END IF;

  IF v_today < v_challenge.start_date::date OR v_today > v_challenge.end_date::date THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Челлендж не активен');
  END IF;

  SELECT id INTO v_existing FROM challenge_entries
  WHERE challenge_id = p_challenge_id AND user_id = p_user_id AND entry_date = v_today;

  IF FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Сегодня уже отмечался');
  END IF;

  INSERT INTO challenge_entries (challenge_id, user_id, entry_date)
  VALUES (p_challenge_id, p_user_id, v_today)
  RETURNING id INTO v_entry_id;

  SELECT COUNT(*) INTO v_total_tickets FROM challenge_entries
  WHERE challenge_id = p_challenge_id AND user_id = p_user_id;

  RETURN jsonb_build_object('ok', true, 'entry_id', v_entry_id, 'total_tickets', v_total_tickets);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.server_complete_mastermind_task(p_user_id uuid, p_task_id uuid, p_comment text DEFAULT NULL::text, p_file_url text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_member_id UUID;
BEGIN
  IF p_comment IS NULL OR trim(p_comment) = '' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Напишите результат выполнения задачи');
  END IF;

  SELECT mm.id INTO v_member_id
  FROM mastermind_members mm
  JOIN mastermind_tasks mt ON mt.member_id = mm.id
  WHERE mm.user_id = p_user_id AND mt.id = p_task_id AND mm.is_active = true;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Задача не найдена');
  END IF;

  UPDATE mastermind_tasks
  SET is_completed = true,
      completed_at = now(),
      participant_comment = trim(p_comment),
      file_url = COALESCE(p_file_url, file_url)
  WHERE id = p_task_id;

  RETURN jsonb_build_object('ok', true);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.server_create_mastermind_task(p_user_id uuid, p_title text, p_description text DEFAULT NULL::text, p_deadline date DEFAULT NULL::date)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_member_id UUID;
  v_task_id UUID;
BEGIN
  IF p_title IS NULL OR trim(p_title) = '' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Укажите название задачи');
  END IF;

  SELECT id INTO v_member_id
  FROM mastermind_members
  WHERE user_id = p_user_id AND is_active = true;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Вы не участник мастермайнда');
  END IF;

  INSERT INTO mastermind_tasks (member_id, title, description, deadline, created_by, approval_status)
  VALUES (v_member_id, trim(p_title), trim(p_description), p_deadline, p_user_id, 'pending')
  RETURNING id INTO v_task_id;

  RETURN jsonb_build_object('ok', true, 'task_id', v_task_id);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.server_create_reward_request(p_user_id uuid, p_reward_id uuid, p_user_comment text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_status participant_status_type;
  v_cost INTEGER;
  v_active BOOLEAN;
  v_stock INTEGER;
  v_balance INTEGER;
  v_request_id UUID;
BEGIN
  -- Проверяем статус участника
  SELECT participant_status INTO v_status
  FROM public.profiles WHERE user_id = p_user_id;

  IF v_status NOT IN ('intensive_active'::participant_status_type,
                      'club_resident'::participant_status_type) THEN
    RAISE EXCEPTION 'Магазин доступен участникам интенсива и резидентам клуба';
  END IF;

  -- Получаем награду с блокировкой строки
  SELECT cost_coins, is_active, stock
    INTO v_cost, v_active, v_stock
  FROM public.rewards WHERE id = p_reward_id FOR UPDATE;

  IF NOT FOUND OR NOT v_active THEN
    RAISE EXCEPTION 'Награда недоступна';
  END IF;

  IF v_stock IS NOT NULL AND v_stock <= 0 THEN
    RAISE EXCEPTION 'Награда закончилась';
  END IF;

  -- Проверяем баланс
  v_balance := public.get_user_coin_balance(p_user_id);
  IF v_balance < v_cost THEN
    RAISE EXCEPTION 'Недостаточно коинов (баланс: %, требуется: %)', v_balance, v_cost;
  END IF;

  -- Создаём заявку
  INSERT INTO public.reward_requests (user_id, reward_id, cost_coins, user_comment)
  VALUES (p_user_id, p_reward_id, v_cost, p_user_comment)
  RETURNING id INTO v_request_id;

  -- Резервируем коины
  INSERT INTO public.coin_transactions (user_id, amount, reason, source_type, source_id, created_by)
  VALUES (p_user_id, -v_cost, 'Заказ награды (резерв)', 'reward_request', v_request_id, p_user_id);

  -- Уменьшаем остаток
  IF v_stock IS NOT NULL THEN
    UPDATE public.rewards SET stock = stock - 1 WHERE id = p_reward_id;
  END IF;

  RETURN v_request_id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.server_register_for_event(p_user_id uuid, p_schedule_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_event RECORD;
  v_existing UUID;
  v_current_count INT;
BEGIN
  SELECT * INTO v_event FROM schedules WHERE id = p_schedule_id AND is_active = true;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Событие не найдено');
  END IF;

  SELECT id INTO v_existing FROM schedule_participants
  WHERE schedule_id = p_schedule_id AND user_id = p_user_id;

  IF FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Уже записан');
  END IF;

  IF v_event.max_participants IS NOT NULL THEN
    SELECT COUNT(*) INTO v_current_count FROM schedule_participants WHERE schedule_id = p_schedule_id;
    IF v_current_count >= v_event.max_participants THEN
      RETURN jsonb_build_object('ok', false, 'error', 'Мест нет');
    END IF;
  END IF;

  INSERT INTO schedule_participants (schedule_id, user_id)
  VALUES (p_schedule_id, p_user_id);

  RETURN jsonb_build_object('ok', true);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.server_submit_mastermind_entry(p_user_id uuid, p_summary text, p_my_tasks text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_member_id UUID;
  v_entry_id UUID;
BEGIN
  SELECT id INTO v_member_id
  FROM mastermind_members
  WHERE user_id = p_user_id AND is_active = true;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Вы не участник мастермайнда');
  END IF;

  INSERT INTO mastermind_entries (member_id, summary, my_tasks)
  VALUES (v_member_id, p_summary, p_my_tasks)
  RETURNING id INTO v_entry_id;

  RETURN jsonb_build_object('ok', true, 'entry_id', v_entry_id);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.server_unregister_from_event(p_user_id uuid, p_schedule_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  DELETE FROM schedule_participants
  WHERE schedule_id = p_schedule_id AND user_id = p_user_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Запись не найдена');
  END IF;

  RETURN jsonb_build_object('ok', true);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.submit_homework(p_telegram_id text, p_assignment_id uuid, p_content text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id      UUID;
  v_stream_id    UUID;
  v_assignment   public.homework_assignments%ROWTYPE;
  v_submission   public.homework_submissions%ROWTYPE;
BEGIN
  SELECT p.user_id, p.current_stream_id
  INTO   v_user_id, v_stream_id
  FROM   profiles p
  WHERE  p.telegram_id = p_telegram_id
  LIMIT  1;

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_linked');
  END IF;

  SELECT * INTO v_assignment
  FROM   public.homework_assignments
  WHERE  id = p_assignment_id
    AND  is_active = true
    AND  (
      target_user_id = v_user_id
      OR (v_stream_id IS NOT NULL AND stream_id = v_stream_id)
    );

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_found');
  END IF;

  SELECT * INTO v_submission
  FROM   public.homework_submissions
  WHERE  assignment_id = p_assignment_id
    AND  user_id = v_user_id
  ORDER BY created_at DESC
  LIMIT  1
  FOR UPDATE;

  IF NOT FOUND THEN
    INSERT INTO public.homework_submissions (user_id, assignment_id, homework_type, content, status)
    VALUES (v_user_id, p_assignment_id, 'assignment', p_content, 'submitted');
    RETURN jsonb_build_object('ok', true, 'status', 'submitted');
  END IF;

  IF v_submission.status <> 'rework' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'already_submitted');
  END IF;

  UPDATE public.homework_submissions
  SET content = p_content,
      status = 'submitted',
      admin_comment = NULL,
      reviewed_at = NULL,
      reviewed_by = NULL,
      verified = false,
      points_earned = 0
  WHERE id = v_submission.id;

  RETURN jsonb_build_object('ok', true, 'status', 'submitted');
END;
$function$
;

CREATE OR REPLACE FUNCTION public.submit_homework(p_telegram_id text, p_assignment_id uuid, p_content text, p_file_url text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id       UUID;
  v_stream_id     UUID;
  v_assignment    public.homework_assignments%ROWTYPE;
  v_submission    public.homework_submissions%ROWTYPE;
  v_submission_id UUID;
  v_content       TEXT := NULLIF(BTRIM(COALESCE(p_content, '')), '');
  v_file_url      TEXT := NULLIF(BTRIM(COALESCE(p_file_url, '')), '');
BEGIN
  IF v_content IS NULL AND v_file_url IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'empty_submission');
  END IF;

  SELECT p.user_id, p.current_stream_id
  INTO   v_user_id, v_stream_id
  FROM   profiles p
  WHERE  p.telegram_id = p_telegram_id
  LIMIT  1;

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_linked');
  END IF;

  SELECT * INTO v_assignment
  FROM   public.homework_assignments
  WHERE  id = p_assignment_id
    AND  is_active = true
    AND  (
      target_user_id = v_user_id
      OR (v_stream_id IS NOT NULL AND stream_id = v_stream_id)
    );

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_found');
  END IF;

  SELECT * INTO v_submission
  FROM   public.homework_submissions
  WHERE  assignment_id = p_assignment_id
    AND  user_id = v_user_id
  ORDER BY created_at DESC
  LIMIT  1
  FOR UPDATE;

  IF NOT FOUND THEN
    INSERT INTO public.homework_submissions
      (user_id, assignment_id, homework_type, content, file_url, status)
    VALUES
      (v_user_id, p_assignment_id, 'assignment', v_content, v_file_url, 'submitted')
    RETURNING id INTO v_submission_id;

    RETURN jsonb_build_object(
      'ok',            true,
      'status',        'submitted',
      'submission_id', v_submission_id,
      'user_id',       v_user_id
    );
  END IF;

  IF v_submission.status <> 'rework' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'already_submitted');
  END IF;

  UPDATE public.homework_submissions
  SET content = v_content,
      file_url = v_file_url,
      status = 'submitted',
      admin_comment = NULL,
      reviewed_at = NULL,
      reviewed_by = NULL,
      verified = false,
      points_earned = 0
  WHERE id = v_submission.id;

  RETURN jsonb_build_object(
    'ok',            true,
    'status',        'submitted',
    'submission_id', v_submission.id,
    'user_id',       v_user_id
  );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.sync_public_profiles()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- On DELETE from profiles: remove from public_profiles
  IF TG_OP = 'DELETE' THEN
    DELETE FROM public.public_profiles WHERE id = OLD.id;
    RETURN OLD;
  END IF;

  -- Check visibility conditions on NEW row
  IF COALESCE(NEW.approved, false) = true
     AND COALESCE(NEW.leaderboard_visible, true) = true
     AND COALESCE(NEW.profile_private, false) = false THEN
    -- Upsert with new fields
    INSERT INTO public.public_profiles (
      id, user_id, display_name, first_name, last_name, 
      total_points, rank_position, participant_status, current_stream_id,
      created_at, updated_at
    ) VALUES (
      NEW.id, NEW.user_id, NEW.display_name, NEW.first_name, NEW.last_name,
      COALESCE(NEW.total_points, 0), COALESCE(NEW.rank_position, 0),
      NEW.participant_status, NEW.current_stream_id,
      now(), now()
    )
    ON CONFLICT (id) DO UPDATE SET
      user_id = EXCLUDED.user_id,
      display_name = EXCLUDED.display_name,
      first_name = EXCLUDED.first_name,
      last_name = EXCLUDED.last_name,
      total_points = EXCLUDED.total_points,
      rank_position = EXCLUDED.rank_position,
      participant_status = EXCLUDED.participant_status,
      current_stream_id = EXCLUDED.current_stream_id,
      updated_at = now();
  ELSE
    -- If no longer eligible, remove
    DELETE FROM public.public_profiles WHERE id = NEW.id;
  END IF;

  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.sync_public_profiles_from_leaderboard()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_profile public.profiles%ROWTYPE;
BEGIN
  -- Get profile to check visibility flags
  SELECT * INTO v_profile FROM public.profiles WHERE user_id = COALESCE(NEW.user_id, OLD.user_id);

  IF v_profile IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  IF COALESCE(v_profile.approved, false) = true
     AND COALESCE(v_profile.leaderboard_visible, true) = true
     AND COALESCE(v_profile.profile_private, false) = false THEN
    UPDATE public.public_profiles
    SET total_points = COALESCE(NEW.total_points, 0),
        rank_position = COALESCE(NEW.rank_position, 0),
        updated_at = now()
    WHERE user_id = v_profile.user_id;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.sync_testimonial_display_name()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Копируем полное имя из participant_name в display_name
  IF NEW.participant_name IS NOT NULL THEN
    NEW.display_name := NEW.participant_name;
  END IF;
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.sync_to_public_testimonials()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP = 'DELETE' THEN
    DELETE FROM public.public_testimonials WHERE id = OLD.id;
    RETURN OLD;
  END IF;

  -- Синхронизируем только активные записи
  IF NEW.is_active = true THEN
    INSERT INTO public.public_testimonials (
      id, display_name, participant_title, content, 
      video_url, image_url, is_active, sort_order, 
      created_at, updated_at
    ) VALUES (
      NEW.id, NEW.display_name, NEW.participant_title, NEW.content,
      NEW.video_url, NEW.image_url, NEW.is_active, NEW.sort_order,
      NEW.created_at, NEW.updated_at
    )
    ON CONFLICT (id) DO UPDATE SET
      display_name = EXCLUDED.display_name,
      participant_title = EXCLUDED.participant_title,
      content = EXCLUDED.content,
      video_url = EXCLUDED.video_url,
      image_url = EXCLUDED.image_url,
      is_active = EXCLUDED.is_active,
      sort_order = EXCLUDED.sort_order,
      updated_at = EXCLUDED.updated_at;
  ELSE
    -- Если запись стала неактивной, удаляем из публичной таблицы
    DELETE FROM public.public_testimonials WHERE id = NEW.id;
  END IF;

  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.take_ascetic(p_telegram_id text, p_text text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id UUID;
  v_id      UUID;
BEGIN
  SELECT p.user_id INTO v_user_id
  FROM   profiles p
  WHERE  p.telegram_id = p_telegram_id
  LIMIT  1;

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_linked');
  END IF;

  INSERT INTO public.ascetic_activities (user_id, activity_type, notes, streak, last_checkin_date)
  VALUES (v_user_id, 'ascetic_vow', p_text, 0, NULL)
  RETURNING id INTO v_id;

  RETURN jsonb_build_object(
    'ok',               true,
    'id',               v_id,
    'text',             p_text,
    'streak',           0,
    'checked_in_today', false
  );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.trigger_recalculate_ranks()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Проверяем, изменились ли поля, влияющие на видимость
  IF (TG_OP = 'UPDATE' AND (
    OLD.approved IS DISTINCT FROM NEW.approved OR
    OLD.leaderboard_visible IS DISTINCT FROM NEW.leaderboard_visible OR
    OLD.profile_private IS DISTINCT FROM NEW.profile_private
  )) THEN
    -- Вызываем полный пересчет рангов
    PERFORM recalculate_all_ranks();
  END IF;
  
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.trigger_update_leaderboard()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Обновляем рейтинг для затронутого пользователя
  IF TG_OP = 'DELETE' THEN
    PERFORM update_user_leaderboard(OLD.user_id);
    RETURN OLD;
  ELSE
    PERFORM update_user_leaderboard(NEW.user_id);
    RETURN NEW;
  END IF;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.unlink_telegram_profile(p_user_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Только администратор может отвязать Telegram';
  END IF;

  UPDATE public.profiles
  SET telegram_id = NULL,
      telegram_username = NULL,
      telegram_first_name = NULL,
      telegram_last_name = NULL,
      telegram_photo_url = NULL,
      telegram_linked_at = NULL,
      telegram_link_code = NULL,
      telegram_link_code_expires_at = NULL,
      updated_at = now()
  WHERE user_id = p_user_id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_avatar_for_user(p_telegram_id text, p_avatar_url text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id UUID;
BEGIN
  SELECT p.user_id INTO v_user_id
  FROM   profiles p
  WHERE  p.telegram_id = p_telegram_id
  LIMIT  1;

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_linked');
  END IF;

  UPDATE profiles
  SET    avatar_url = p_avatar_url
  WHERE  user_id = v_user_id;

  RETURN jsonb_build_object('ok', true, 'avatar_url', p_avatar_url);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_habit_completed_days()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Обновляем количество выполненных дней
  UPDATE public.participant_habits 
  SET completed_days = (
    SELECT COUNT(*) 
    FROM public.habit_progress 
    WHERE habit_id = NEW.habit_id AND completed = true
  ),
  is_completed = (
    SELECT COUNT(*) 
    FROM public.habit_progress 
    WHERE habit_id = NEW.habit_id AND completed = true
  ) >= (
    SELECT target_days 
    FROM public.participant_habits 
    WHERE id = NEW.habit_id
  )
  WHERE id = NEW.habit_id;
  
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_leaderboard_on_ascetic()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Only update when verification status changes to true
  IF TG_OP = 'UPDATE' AND NEW.verified = true AND (OLD.verified IS NULL OR OLD.verified = false) THEN
    PERFORM update_user_leaderboard(NEW.user_id);
  ELSIF TG_OP = 'UPDATE' AND NEW.verified = false AND OLD.verified = true THEN
    PERFORM update_user_leaderboard(NEW.user_id);
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_participant_status(p_user_id uuid, p_new_status participant_status_type)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- v4: проверка роли внутри тела (UI-скрытие кнопки не является защитой)
  IF auth.uid() IS NOT NULL AND current_user NOT IN ('service_role','postgres','supabase_admin')
     AND NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'access denied: admin role required for update_participant_status';
  END IF;

  -- Обновляем статус участника
  UPDATE profiles
  SET 
    participant_status = p_new_status,
    -- Устанавливаем intensive_completed_at если переводим в "intensive_completed" или "club_resident"
    intensive_completed_at = CASE 
      WHEN p_new_status IN ('intensive_completed', 'club_resident', 'alumni') 
           AND intensive_completed_at IS NULL 
      THEN now()
      ELSE intensive_completed_at
    END,
    -- Устанавливаем club_joined_at если переводим в "club_resident"
    club_joined_at = CASE 
      WHEN p_new_status = 'club_resident' AND club_joined_at IS NULL 
      THEN now()
      ELSE club_joined_at
    END,
    updated_at = now()
  WHERE user_id = p_user_id;

  -- Обновляем leaderboard
  PERFORM update_user_leaderboard(p_user_id);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_profile_for_user(p_telegram_id text, p_weight_kg integer, p_height_cm integer, p_date_of_birth date)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id UUID;
BEGIN
  SELECT p.user_id INTO v_user_id
  FROM   profiles p
  WHERE  p.telegram_id = p_telegram_id
  LIMIT  1;

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_linked');
  END IF;

  UPDATE profiles
  SET    weight_kg     = p_weight_kg,
         height_cm     = p_height_cm,
         date_of_birth = p_date_of_birth
  WHERE  user_id = v_user_id;

  RETURN jsonb_build_object(
    'ok',            true,
    'weight_kg',     p_weight_kg,
    'height_cm',     p_height_cm,
    'date_of_birth', p_date_of_birth
  );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_timestamp_public_profiles()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_user_leaderboard(user_uuid uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_training_points INTEGER := 0;
  v_tactical_points INTEGER := 0;
  v_theory_points INTEGER := 0;
  v_challenge_points INTEGER := 0;
  v_bjj_points INTEGER := 0;
  v_kick_points INTEGER := 0;
  v_ofp_points INTEGER := 0;
  v_nutrition_points INTEGER := 0;
  v_kamp_pyramid_points INTEGER := 0;
  v_total_points INTEGER := 0;
  v_other_points INTEGER := 0;
  v_crash_bjj INTEGER := 0;
  v_crash_kick INTEGER := 0;
  v_crash_ofp INTEGER := 0;
  v_stream_id UUID;
BEGIN
  -- v4: пересчёт разрешён только для себя, администратору или service_role
  IF auth.uid() IS NOT NULL
     AND current_user NOT IN ('service_role','postgres','supabase_admin')
     AND user_uuid IS DISTINCT FROM auth.uid()
     AND NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'access denied: own leaderboard or admin role required';
  END IF;

  -- Get user's stream_id
  SELECT current_stream_id INTO v_stream_id FROM profiles WHERE user_id = user_uuid;

  -- Баллы из тренировочных сессий (только подтвержденные)
  SELECT COALESCE(SUM(points_earned), 0) INTO v_training_points
  FROM training_sessions 
  WHERE user_id = user_uuid AND verified = true;
  
  -- Разбивка по типам активности в тренировочных сессиях  
  SELECT 
    COALESCE(SUM(CASE WHEN session_type = 'bjj' OR activity_type = 'bjj' THEN points_earned ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN session_type = 'kickboxing' OR activity_type = 'kickboxing' THEN points_earned ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN session_type = 'physical' OR activity_type = 'ofp' THEN points_earned ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN session_type = 'theory' OR activity_type = 'theory' THEN points_earned ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN session_type = 'tactics' OR activity_type = 'tactics' THEN points_earned ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN session_type = 'nutrition' OR activity_type = 'nutrition' THEN points_earned ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN session_type = 'kamp_pyramid' OR activity_type = 'kamp_pyramid' THEN points_earned ELSE 0 END), 0)
  INTO v_bjj_points, v_kick_points, v_ofp_points, v_theory_points, v_tactical_points, v_nutrition_points, v_kamp_pyramid_points
  FROM training_sessions 
  WHERE user_id = user_uuid AND verified = true;

  -- Баллы из краш-тестов по дисциплинам
  SELECT 
    COALESCE(SUM(CASE WHEN LOWER(test_type) = 'bjj' THEN points_earned ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN LOWER(test_type) = 'kickboxing' THEN points_earned ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN LOWER(test_type) = 'ofp' THEN points_earned ELSE 0 END), 0)
  INTO v_crash_bjj, v_crash_kick, v_crash_ofp
  FROM crash_tests 
  WHERE user_id = user_uuid AND verified = true AND passed = true;

  -- Добавляем краш-тесты к соответствующим категориям
  v_bjj_points := v_bjj_points + v_crash_bjj;
  v_kick_points := v_kick_points + v_crash_kick;
  v_ofp_points := v_ofp_points + v_crash_ofp;

  -- Баллы из тактических сессий
  SELECT COALESCE(SUM(points_earned), 0) INTO v_other_points
  FROM tactical_sessions 
  WHERE user_id = user_uuid AND verified = true;
  
  v_tactical_points := v_tactical_points + v_other_points;
  
  -- Баллы из других активностей
  SELECT 
    COALESCE(SUM(points_earned), 0) INTO v_other_points
  FROM (
    SELECT points_earned FROM hero_races WHERE user_id = user_uuid AND verified = true
    UNION ALL
    SELECT points_earned FROM homework_submissions WHERE user_id = user_uuid AND verified = true
    UNION ALL
    SELECT points_earned FROM lectures WHERE user_id = user_uuid AND verified = true
    UNION ALL
    SELECT points_earned FROM ascetic_activities WHERE user_id = user_uuid AND verified = true
  ) all_activities;

  v_tactical_points := v_tactical_points + v_other_points;
  v_total_points := v_training_points + v_tactical_points + v_other_points + v_crash_bjj + v_crash_kick + v_crash_ofp;

  -- Обновляем или вставляем запись в leaderboard
  INSERT INTO leaderboard (
    user_id, 
    total_points, 
    bjj_points, 
    kickboxing_points, 
    ofp_points, 
    theory_points, 
    tactical_points,
    nutrition_points,
    kamp_pyramid_points,
    challenges_points,
    monthly_points,
    last_updated
  ) VALUES (
    user_uuid,
    v_total_points,
    v_bjj_points,
    v_kick_points,
    v_ofp_points, 
    v_theory_points,
    v_tactical_points,
    v_nutrition_points,
    v_kamp_pyramid_points,
    v_challenge_points,
    0,
    now()
  )
  ON CONFLICT (user_id) 
  DO UPDATE SET
    total_points = EXCLUDED.total_points,
    bjj_points = EXCLUDED.bjj_points,
    kickboxing_points = EXCLUDED.kickboxing_points,
    ofp_points = EXCLUDED.ofp_points,
    theory_points = EXCLUDED.theory_points,
    tactical_points = EXCLUDED.tactical_points,
    nutrition_points = EXCLUDED.nutrition_points,
    kamp_pyramid_points = EXCLUDED.kamp_pyramid_points,
    challenges_points = EXCLUDED.challenges_points,
    last_updated = now();

  -- Пересчитываем позиции в рейтинге по потокам
  WITH visible_admins AS (
    SELECT user_id FROM user_roles 
    WHERE role IN ('admin', 'super_admin')
  ),
  ranked_users AS (
    SELECT 
      l.user_id,
      ROW_NUMBER() OVER (
        PARTITION BY p.current_stream_id 
        ORDER BY l.total_points DESC, l.last_updated ASC
      ) as new_rank
    FROM leaderboard l
    INNER JOIN profiles p ON p.user_id = l.user_id
    WHERE l.total_points > 0
      AND p.current_stream_id = v_stream_id
      AND p.approved = true
      AND COALESCE(p.leaderboard_visible, true) = true
      AND COALESCE(p.profile_private, false) = false
      AND l.user_id NOT IN (SELECT user_id FROM visible_admins)
  )
  UPDATE leaderboard 
  SET rank_position = ranked_users.new_rank
  FROM ranked_users
  WHERE leaderboard.user_id = ranked_users.user_id;

  -- Update profiles table with latest points and rank
  UPDATE profiles 
  SET 
    total_points = v_total_points,
    rank_position = COALESCE((SELECT rank_position FROM leaderboard WHERE user_id = user_uuid), 0)
  WHERE user_id = user_uuid;

END;
$function$
;

CREATE OR REPLACE FUNCTION public.validate_audit_entry()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Validate that audit entries have required fields
  IF NEW.action IS NULL OR trim(NEW.action) = '' THEN
    RAISE EXCEPTION 'Audit log action cannot be empty';
  END IF;
  
  -- Validate action types against allowed list
  IF NOT (NEW.action = ANY(ARRAY[
    'LOGIN', 'LOGOUT', 'CONTACT_FORM_ACCESS', 'RATE_LIMIT_EXCEEDED',
    'ROLE_CHANGE', 'DATA_EXPORT', 'ADMIN_ACTION', 'SECURITY_EVENT',
    'DATA_CLEANUP', 'SESSION_EXPIRED', 'AUDIT_LOG_CLEANUP', 
    'PHONE_ENCRYPTION', 'CONSENT_UPDATE', 'PARTICIPANT_STATUS_CHANGE'
  ])) THEN
    RAISE EXCEPTION 'Invalid audit log action type: %', NEW.action;
  END IF;
  
  -- Set timestamp if not provided
  IF NEW.timestamp IS NULL THEN
    NEW.timestamp = now();
  END IF;
  
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.validate_audit_log_entry(p_action text, p_table_name text, p_user_id uuid DEFAULT NULL::uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Validate action type
  IF p_action IS NULL OR length(trim(p_action)) = 0 THEN
    RETURN false;
  END IF;
  
  -- Validate action is from allowed list
  IF NOT (p_action = ANY(ARRAY[
    'LOGIN', 'LOGOUT', 'CONTACT_FORM_ACCESS', 'RATE_LIMIT_EXCEEDED',
    'ROLE_CHANGE', 'DATA_EXPORT', 'ADMIN_ACTION', 'SECURITY_EVENT',
    'DATA_CLEANUP', 'SESSION_EXPIRED', 'PARTICIPANT_STATUS_CHANGE'
  ])) THEN
    RETURN false;
  END IF;
  
  -- Validate table name if provided
  IF p_table_name IS NOT NULL AND length(trim(p_table_name)) = 0 THEN
    RETURN false;
  END IF;
  
  RETURN true;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.validate_contact_submission(p_name text, p_phone text, p_course text, p_social text DEFAULT NULL::text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Validate name (2-100 chars, letters, spaces, hyphens only)
  IF p_name IS NULL OR length(trim(p_name)) < 2 OR length(trim(p_name)) > 100 THEN
    RETURN false;
  END IF;
  
  IF NOT (trim(p_name) ~ '^[А-Яа-яA-Za-z\s\-'']+$') THEN
    RETURN false;
  END IF;
  
  -- Validate phone (10-20 chars, numbers, +, -, spaces, parentheses only)
  IF p_phone IS NULL OR length(trim(p_phone)) < 10 OR length(trim(p_phone)) > 20 THEN
    RETURN false;
  END IF;
  
  IF NOT (trim(p_phone) ~ '^[\+\d\s\-\(\)]+$') THEN
    RETURN false;
  END IF;
  
  -- Validate course (not empty, max 100 chars)
  IF p_course IS NULL OR length(trim(p_course)) = 0 OR length(trim(p_course)) > 100 THEN
    RETURN false;
  END IF;
  
  -- Validate social if provided (max 200 chars)
  IF p_social IS NOT NULL AND length(trim(p_social)) > 200 THEN
    RETURN false;
  END IF;
  
  RETURN true;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.validate_referral_code(p_code text)
 RETURNS TABLE(user_id uuid)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT p.user_id
  FROM public.profiles p
  WHERE p.referral_code = p_code
  LIMIT 1;
$function$
;

CREATE OR REPLACE FUNCTION public.validate_security_event_type()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Validate security event types
  IF NEW.action NOT IN (
    'LOGIN', 'LOGOUT', 'CONTACT_FORM_ACCESS', 'RATE_LIMIT_EXCEEDED',
    'ROLE_CHANGE', 'DATA_EXPORT', 'ADMIN_ACTION', 'SECURITY_EVENT',
    'DATA_CLEANUP', 'SESSION_EXPIRED', 'AUDIT_LOG_CLEANUP', 
    'PHONE_ENCRYPTION', 'CONSENT_UPDATE'
  ) THEN
    RAISE EXCEPTION 'Invalid security event type: %', NEW.action;
  END IF;
  
  RETURN NEW;
END;
$function$
;
