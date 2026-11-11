-- КЭМП / E1 paid-bookings (UP). НЕ ПРИМЕНЕНО. Только после отдельного APPROVE production.
-- Зависимость: сначала sql/resident-checkins/up.sql (public.is_kemp_founder, поля attendance).
-- Принципы: брони (hold/pending) хранятся отдельно от schedule_participants; запись в
-- schedule_participants для платного события возможна ТОЛЬКО со ссылкой на подтверждённую
-- основателем бронь — независимо от роли (service_role/бот, admin, RLS, server_register_for_event).
BEGIN;

DO $$ BEGIN
  IF to_regprocedure('public.is_kemp_founder(uuid)') IS NULL THEN
    RAISE EXCEPTION 'apply sql/resident-checkins/up.sql first (is_kemp_founder missing)';
  END IF;
END $$;

-- 1. Настройки события (defaults = free; существующие события не меняются)
ALTER TABLE public.schedules
  ADD COLUMN IF NOT EXISTS booking_mode text NOT NULL DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS price_total_rub integer,
  ADD COLUMN IF NOT EXISTS prepay_rub integer,
  ADD COLUMN IF NOT EXISTS cash_rub integer,
  ADD COLUMN IF NOT EXISTS payment_window_minutes integer NOT NULL DEFAULT 120,
  ADD COLUMN IF NOT EXISTS cancellation_terms text,
  ADD COLUMN IF NOT EXISTS payment_qr_url text,
  ADD COLUMN IF NOT EXISTS payment_link text;
ALTER TABLE public.schedules ADD CONSTRAINT schedules_booking_mode_chk CHECK (booking_mode IN ('free','paid'));
ALTER TABLE public.schedules ADD CONSTRAINT schedules_paid_prices_chk CHECK (
  booking_mode = 'free' OR (
    price_total_rub > 0 AND prepay_rub > 0 AND cash_rub >= 0
    AND prepay_rub + cash_rub = price_total_rub
    AND payment_window_minutes BETWEEN 10 AND 1440
    AND (payment_qr_url IS NOT NULL OR payment_link IS NOT NULL)
    AND (payment_qr_url IS NULL OR payment_qr_url ~ '^https://')
    AND (payment_link IS NULL OR payment_link ~ '^https://')
    AND schedule_type = 'club'
    AND max_participants IS NOT NULL AND max_participants > 0));

-- 2. Брони и финансовый журнал
CREATE TABLE public.paid_bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id uuid NOT NULL REFERENCES public.schedules(id) ON DELETE RESTRICT,
  user_id uuid NOT NULL,
  booking_status text NOT NULL DEFAULT 'hold'
    CHECK (booking_status IN ('hold','pending_review','confirmed','cancelled','expired','rejected')),
  payment_status text NOT NULL DEFAULT 'unpaid'
    CHECK (payment_status IN ('unpaid','reported','verified','not_received','refund_pending','partially_refunded','refunded')),
  price_total_rub integer NOT NULL CHECK (price_total_rub > 0),
  prepay_rub integer NOT NULL CHECK (prepay_rub > 0),
  cash_rub integer NOT NULL CHECK (cash_rub >= 0),
  hold_expires_at timestamptz NOT NULL,
  idempotency_key text,
  reported_at timestamptz,
  decided_at timestamptz,
  decided_by uuid,
  cash_received_rub integer,
  cash_received_at timestamptz,
  cash_received_by uuid,
  schedule_participant_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (prepay_rub + cash_rub = price_total_rub),
  CHECK (booking_status <> 'confirmed' OR (payment_status IN ('verified','refund_pending','partially_refunded','refunded') AND decided_by IS NOT NULL))
);
CREATE UNIQUE INDEX paid_bookings_one_active ON public.paid_bookings(schedule_id, user_id)
  WHERE booking_status IN ('hold','pending_review','confirmed');
CREATE UNIQUE INDEX paid_bookings_idem ON public.paid_bookings(user_id, idempotency_key) WHERE idempotency_key IS NOT NULL;
CREATE INDEX paid_bookings_schedule ON public.paid_bookings(schedule_id, booking_status);

CREATE TABLE public.paid_booking_ledger (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  booking_id uuid NOT NULL REFERENCES public.paid_bookings(id) ON DELETE RESTRICT,
  kind text NOT NULL CHECK (kind IN ('hold_created','prepay_reported','prepay_verified','prepay_not_received',
    'cancelled_by_user','cancelled_by_founder','expired','cash_received','refund_marked_pending','refund_issued','late_prepay_received')),
  amount_rub integer,
  actor uuid,
  note text,
  request_key text,
  created_at timestamptz NOT NULL DEFAULT now()
);
-- Одноразовые кнопки основателя: один request_key = одна финансовая операция
CREATE UNIQUE INDEX paid_booking_ledger_request_uniq ON public.paid_booking_ledger(booking_id, request_key) WHERE request_key IS NOT NULL;

-- Клиентам: только чтение собственных броней. Записей нет ни у кого, кроме функций-владельцев.
-- service_role получает только SELECT: бот не может подделать подтверждённую бронь.
REVOKE ALL ON public.paid_bookings, public.paid_booking_ledger FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT ON public.paid_bookings TO authenticated, service_role;
GRANT SELECT ON public.paid_booking_ledger TO service_role;
ALTER TABLE public.paid_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.paid_booking_ledger ENABLE ROW LEVEL SECURITY;
CREATE POLICY paid_bookings_own_or_founder ON public.paid_bookings FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_kemp_founder(auth.uid()));
CREATE POLICY paid_booking_ledger_service_read ON public.paid_booking_ledger FOR SELECT TO service_role USING (true);

CREATE FUNCTION public.paid_booking_ledger_append_only() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'paid_booking_ledger is append-only'; END $$;
CREATE TRIGGER paid_booking_ledger_no_change BEFORE UPDATE OR DELETE ON public.paid_booking_ledger
  FOR EACH ROW EXECUTE FUNCTION public.paid_booking_ledger_append_only();
CREATE TRIGGER paid_bookings_updated_at BEFORE UPDATE ON public.paid_bookings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE FUNCTION public.paid_bookings_no_delete() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'paid_bookings history cannot be deleted'; END $$;
CREATE TRIGGER paid_bookings_keep_history BEFORE DELETE ON public.paid_bookings
  FOR EACH ROW EXECUTE FUNCTION public.paid_bookings_no_delete();

-- 3. Жёсткий инвариант на schedule_participants (любая роль, включая service_role)
ALTER TABLE public.schedule_participants ADD COLUMN IF NOT EXISTS paid_booking_id uuid REFERENCES public.paid_bookings(id) ON DELETE RESTRICT;
CREATE UNIQUE INDEX IF NOT EXISTS schedule_participants_paid_booking_uniq ON public.schedule_participants(paid_booking_id) WHERE paid_booking_id IS NOT NULL;

CREATE FUNCTION public.enforce_paid_participation() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_mode text;
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.paid_booking_id IS NOT NULL AND EXISTS (SELECT 1 FROM paid_bookings b WHERE b.id = OLD.paid_booking_id AND b.booking_status = 'confirmed') THEN
      RAISE EXCEPTION 'paid_registration_cancel_via_founder' USING ERRCODE = 'P0001';
    END IF;
    RETURN OLD;
  END IF;
  IF TG_OP = 'UPDATE' AND NEW.schedule_id IS NOT DISTINCT FROM OLD.schedule_id AND NEW.user_id IS NOT DISTINCT FROM OLD.user_id
     AND NEW.paid_booking_id IS NOT DISTINCT FROM OLD.paid_booking_id THEN
    RETURN NEW;  -- attendance и прочие поля: прежние правила
  END IF;
  SELECT booking_mode INTO v_mode FROM schedules WHERE id = NEW.schedule_id;
  IF v_mode = 'paid' THEN
    IF NEW.paid_booking_id IS NULL OR NOT EXISTS (
      SELECT 1 FROM paid_bookings b WHERE b.id = NEW.paid_booking_id AND b.schedule_id = NEW.schedule_id
        AND b.user_id = NEW.user_id AND b.booking_status = 'confirmed' AND b.payment_status = 'verified'
        AND b.decided_by IS NOT NULL AND public.is_kemp_founder(b.decided_by)) THEN
      RAISE EXCEPTION 'paid_event_requires_verified_booking' USING ERRCODE = 'P0001';
    END IF;
  ELSIF NEW.paid_booking_id IS NOT NULL THEN
    RAISE EXCEPTION 'paid_booking_on_free_event' USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER schedule_participants_paid_guard BEFORE INSERT OR UPDATE OR DELETE ON public.schedule_participants
  FOR EACH ROW EXECUTE FUNCTION public.enforce_paid_participation();

-- Платным событием полностью управляет только конкретный founder+super_admin.
-- Free-события сохраняют прежние admin/trainer ACL. Free -> paid запрещён,
-- если уже есть любые schedule_participants: старые бесплатные записи не становятся paid.
CREATE FUNCTION public.guard_paid_schedule_settings() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_seats_used integer;
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.booking_mode = 'paid' AND NOT public.is_kemp_founder(auth.uid()) THEN RAISE EXCEPTION 'paid_settings_founder_only'; END IF;
    RETURN NEW;
  END IF;
  IF TG_OP = 'DELETE' THEN
    IF OLD.booking_mode = 'paid' AND NOT public.is_kemp_founder(auth.uid()) THEN
      RAISE EXCEPTION 'paid_event_founder_only';
    END IF;
    RETURN OLD;
  END IF;
  -- Все текущие и будущие поля paid-события (кроме технического updated_at)
  -- защищены одной проверкой; новое столбцовое поле не окажется незащищённым по умолчанию.
  IF (OLD.booking_mode = 'paid' OR NEW.booking_mode = 'paid')
     AND (to_jsonb(NEW) - 'updated_at') IS DISTINCT FROM (to_jsonb(OLD) - 'updated_at')
     AND NOT public.is_kemp_founder(auth.uid()) THEN
    RAISE EXCEPTION 'paid_event_founder_only';
  END IF;
  IF OLD.booking_mode = 'free' AND NEW.booking_mode = 'paid'
     AND EXISTS (SELECT 1 FROM public.schedule_participants WHERE schedule_id = OLD.id) THEN
    RAISE EXCEPTION 'paid_event_has_legacy_registrations';
  END IF;
  IF NEW.booking_mode = 'paid' AND NEW.max_participants IS DISTINCT FROM OLD.max_participants THEN
    SELECT
      (SELECT count(*) FROM public.schedule_participants WHERE schedule_id = OLD.id)
      + (SELECT count(*) FROM public.paid_bookings
          WHERE schedule_id = OLD.id
            AND ((booking_status = 'hold' AND hold_expires_at > now()) OR booking_status = 'pending_review'))
      INTO v_seats_used;
    IF NEW.max_participants < v_seats_used THEN
      RAISE EXCEPTION 'paid_event_capacity_below_reserved';
    END IF;
  END IF;
  IF OLD.booking_mode = 'paid' AND NEW.booking_mode = 'free'
     AND EXISTS (SELECT 1 FROM paid_bookings WHERE schedule_id = OLD.id AND booking_status IN ('hold','pending_review','confirmed')) THEN
    RAISE EXCEPTION 'paid_event_has_active_bookings';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER schedules_paid_settings_guard BEFORE INSERT OR UPDATE OR DELETE ON public.schedules
  FOR EACH ROW EXECUTE FUNCTION public.guard_paid_schedule_settings();

-- 4. Внутренние помощники (не выдаются клиентам)
CREATE FUNCTION public.paid_expire_stale_holds(p_schedule_id uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r record;
BEGIN
  FOR r IN UPDATE paid_bookings SET booking_status = 'expired'
    WHERE schedule_id = p_schedule_id AND booking_status = 'hold' AND hold_expires_at <= now() RETURNING id
  LOOP INSERT INTO paid_booking_ledger(booking_id, kind) VALUES (r.id, 'expired'); END LOOP;
END $$;
CREATE FUNCTION public.paid_seats_used(p_schedule_id uuid) RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT (SELECT count(*) FROM schedule_participants WHERE schedule_id = p_schedule_id)::int
       + (SELECT count(*) FROM paid_bookings WHERE schedule_id = p_schedule_id
            AND ((booking_status = 'hold' AND hold_expires_at > now()) OR booking_status = 'pending_review'))::int
$$;
-- Деньги считаются ТОЛЬКО по подтверждённым основателем поступлениям в журнале (не по сообщению участника)
CREATE FUNCTION public.paid_booking_money(p_booking_id uuid, OUT received_rub integer, OUT refunded_rub integer)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(sum(amount_rub) FILTER (WHERE kind IN ('prepay_verified','late_prepay_received','cash_received')),0)::int,
         COALESCE(sum(amount_rub) FILTER (WHERE kind = 'refund_issued'),0)::int
  FROM paid_booking_ledger WHERE booking_id = p_booking_id
$$;
REVOKE ALL ON FUNCTION public.paid_booking_money(uuid) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.paid_expire_stale_holds(uuid), public.paid_seats_used(uuid),
  public.enforce_paid_participation(), public.guard_paid_schedule_settings() FROM PUBLIC, anon, authenticated, service_role;

-- 5. Резидент
CREATE FUNCTION public.paid_events_web() RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL OR NOT public.is_club_resident(v_uid) THEN RETURN jsonb_build_object('ok',false,'error','forbidden'); END IF;
  RETURN jsonb_build_object('ok', true,
    -- режим КАЖДОГО активного события клуба: клиент блокирует запись для событий без известного режима
    'modes', COALESCE((SELECT jsonb_object_agg(id, booking_mode) FROM schedules WHERE schedule_type = 'club' AND is_active), '{}'::jsonb),
    'events', COALESCE((
    SELECT jsonb_agg(jsonb_build_object(
      'schedule_id', s.id, 'price_total_rub', s.price_total_rub, 'prepay_rub', s.prepay_rub, 'cash_rub', s.cash_rub,
      'payment_window_minutes', s.payment_window_minutes, 'cancellation_terms', s.cancellation_terms,
      'payment_qr_url', s.payment_qr_url, 'payment_link', s.payment_link, 'max_participants', s.max_participants,
      'seats_left', GREATEST(s.max_participants - public.paid_seats_used(s.id), 0),
      'legacy_registered', EXISTS (SELECT 1 FROM schedule_participants p WHERE p.schedule_id = s.id AND p.user_id = v_uid AND p.paid_booking_id IS NULL),
      'booking', (SELECT jsonb_build_object('id', b.id, 'booking_status',
                    CASE WHEN b.booking_status = 'hold' AND b.hold_expires_at <= now() THEN 'expired' ELSE b.booking_status END,
                    'payment_status', b.payment_status, 'hold_expires_at', b.hold_expires_at, 'cash_received_rub', b.cash_received_rub)
                  FROM paid_bookings b WHERE b.schedule_id = s.id AND b.user_id = v_uid ORDER BY b.created_at DESC LIMIT 1)))
    FROM schedules s WHERE s.schedule_type = 'club' AND s.is_active AND s.booking_mode = 'paid' AND s.start_time > now() - interval '1 day'), '[]'::jsonb));
END $$;

CREATE FUNCTION public.paid_booking_create_hold(p_schedule_id uuid, p_idempotency_key text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid(); s schedules%ROWTYPE; b paid_bookings%ROWTYPE;
BEGIN
  IF v_uid IS NULL OR NOT public.is_club_resident(v_uid) THEN RETURN jsonb_build_object('ok',false,'error','forbidden'); END IF;
  IF p_idempotency_key IS NULL OR length(p_idempotency_key) NOT BETWEEN 8 AND 100 THEN RETURN jsonb_build_object('ok',false,'error','idempotency_key_required'); END IF;
  SELECT * INTO b FROM paid_bookings WHERE user_id = v_uid AND idempotency_key = p_idempotency_key;
  IF FOUND THEN
    -- тот же ключ + то же событие = тот же результат; ключ от другого события — конфликт
    IF b.schedule_id <> p_schedule_id THEN RETURN jsonb_build_object('ok',false,'error','idempotency_conflict'); END IF;
    RETURN jsonb_build_object('ok', true, 'booking_id', b.id, 'replayed', true, 'hold_expires_at', b.hold_expires_at,
      'booking_status', CASE WHEN b.booking_status = 'hold' AND b.hold_expires_at <= now() THEN 'expired' ELSE b.booking_status END);
  END IF;
  SELECT * INTO s FROM schedules WHERE id = p_schedule_id FOR UPDATE;  -- сериализует конкурентные брони события
  IF NOT FOUND OR s.schedule_type <> 'club' OR NOT s.is_active THEN RETURN jsonb_build_object('ok',false,'error','not_club_event'); END IF;
  IF s.booking_mode <> 'paid' THEN RETURN jsonb_build_object('ok',false,'error','not_paid_event'); END IF;
  IF s.start_time <= now() THEN RETURN jsonb_build_object('ok',false,'error','event_started'); END IF;
  PERFORM public.paid_expire_stale_holds(s.id);
  IF EXISTS (SELECT 1 FROM schedule_participants WHERE schedule_id = s.id AND user_id = v_uid) THEN RETURN jsonb_build_object('ok',false,'error','already_registered'); END IF;
  SELECT * INTO b FROM paid_bookings WHERE schedule_id = s.id AND user_id = v_uid AND booking_status IN ('hold','pending_review','confirmed');
  IF FOUND THEN RETURN jsonb_build_object('ok',true,'booking_id',b.id,'booking_status',b.booking_status,'hold_expires_at',b.hold_expires_at,'replayed',true); END IF;
  IF public.paid_seats_used(s.id) >= s.max_participants THEN RETURN jsonb_build_object('ok',false,'error','no_seats'); END IF;
  INSERT INTO paid_bookings(schedule_id, user_id, price_total_rub, prepay_rub, cash_rub, hold_expires_at, idempotency_key)
    VALUES (s.id, v_uid, s.price_total_rub, s.prepay_rub, s.cash_rub, LEAST(now() + make_interval(mins => s.payment_window_minutes), s.start_time), p_idempotency_key)
    RETURNING * INTO b;
  INSERT INTO paid_booking_ledger(booking_id, kind, actor) VALUES (b.id, 'hold_created', v_uid);
  RETURN jsonb_build_object('ok',true,'booking_id',b.id,'booking_status',b.booking_status,'hold_expires_at',b.hold_expires_at);
END $$;

CREATE FUNCTION public.paid_booking_report_paid(p_booking_id uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid(); b paid_bookings%ROWTYPE;
BEGIN
  IF v_uid IS NULL OR NOT public.is_club_resident(v_uid) THEN RETURN jsonb_build_object('ok',false,'error','forbidden'); END IF;
  SELECT * INTO b FROM paid_bookings WHERE id = p_booking_id AND user_id = v_uid FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok',false,'error','not_found'); END IF;
  IF b.booking_status = 'pending_review' THEN RETURN jsonb_build_object('ok',true,'booking_status','pending_review','replayed',true); END IF;
  IF b.booking_status <> 'hold' THEN RETURN jsonb_build_object('ok',false,'error','invalid_status','booking_status',b.booking_status); END IF;
  IF b.hold_expires_at <= now() THEN
    UPDATE paid_bookings SET booking_status = 'expired' WHERE id = b.id;
    INSERT INTO paid_booking_ledger(booking_id, kind) VALUES (b.id, 'expired');
    RETURN jsonb_build_object('ok',false,'error','hold_expired');
  END IF;
  UPDATE paid_bookings SET booking_status = 'pending_review', payment_status = 'reported', reported_at = now() WHERE id = b.id;
  -- Сообщение участника НЕ является поступлением денег: amount = NULL
  INSERT INTO paid_booking_ledger(booking_id, kind, actor, note) VALUES (b.id, 'prepay_reported', v_uid, 'participant report, not a receipt');
  RETURN jsonb_build_object('ok',true,'booking_status','pending_review');
END $$;

CREATE FUNCTION public.paid_booking_cancel_own(p_booking_id uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid(); b paid_bookings%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN RETURN jsonb_build_object('ok',false,'error','forbidden'); END IF;
  SELECT * INTO b FROM paid_bookings WHERE id = p_booking_id AND user_id = v_uid FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok',false,'error','not_found'); END IF;
  IF b.booking_status IN ('cancelled','expired','rejected') THEN RETURN jsonb_build_object('ok',true,'booking_status',b.booking_status,'replayed',true); END IF;
  IF b.booking_status = 'confirmed' THEN RETURN jsonb_build_object('ok',false,'error','contact_founder'); END IF;
  -- после «Я оплатил» деньги могли уйти: отмена только через решение основателя
  IF b.booking_status = 'pending_review' THEN RETURN jsonb_build_object('ok',false,'error','under_review'); END IF;
  UPDATE paid_bookings SET booking_status = 'cancelled' WHERE id = b.id;
  INSERT INTO paid_booking_ledger(booking_id, kind, actor) VALUES (b.id, 'cancelled_by_user', v_uid);
  RETURN jsonb_build_object('ok',true,'booking_status','cancelled','payment_status',b.payment_status);
END $$;

-- 6. Основатель (конкретный аккаунт + super_admin; profiles.approved не проверяется)
CREATE FUNCTION public.paid_bookings_admin_list(p_schedule_id uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_kemp_founder(auth.uid()) THEN RETURN jsonb_build_object('ok',false,'error','forbidden'); END IF;
  PERFORM public.paid_expire_stale_holds(p_schedule_id);
  RETURN jsonb_build_object('ok',true,'bookings', COALESCE((SELECT jsonb_agg(jsonb_build_object(
    'id', b.id, 'user_id', b.user_id, 'name', COALESCE(NULLIF(trim(concat_ws(' ', p.first_name, p.last_name)),''), p.display_name, 'Участник'),
    'booking_status', b.booking_status, 'payment_status', b.payment_status, 'price_total_rub', b.price_total_rub,
    'prepay_rub', b.prepay_rub, 'cash_rub', b.cash_rub, 'cash_received_rub', b.cash_received_rub,
    'hold_expires_at', b.hold_expires_at, 'reported_at', b.reported_at, 'created_at', b.created_at,
    'received_rub', (public.paid_booking_money(b.id)).received_rub, 'refunded_rub', (public.paid_booking_money(b.id)).refunded_rub,
    'ledger', (SELECT jsonb_agg(jsonb_build_object('kind', l.kind, 'amount_rub', l.amount_rub, 'note', l.note, 'at', l.created_at) ORDER BY l.id)
               FROM paid_booking_ledger l WHERE l.booking_id = b.id)) ORDER BY b.created_at)
    FROM paid_bookings b LEFT JOIN profiles p ON p.user_id = b.user_id WHERE b.schedule_id = p_schedule_id), '[]'::jsonb));
END $$;

-- Одноразовое решение по предоплате: повторный вызов (двойной callback) не меняет состояние
CREATE FUNCTION public.paid_booking_decide(p_booking_id uuid, p_received boolean, p_note text DEFAULT NULL) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid(); b paid_bookings%ROWTYPE; v_sp uuid;
BEGIN
  IF NOT public.is_kemp_founder(v_uid) THEN RETURN jsonb_build_object('ok',false,'error','forbidden'); END IF;
  SELECT * INTO b FROM paid_bookings WHERE id = p_booking_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok',false,'error','not_found'); END IF;
  IF b.booking_status <> 'pending_review' THEN
    RETURN jsonb_build_object('ok', b.booking_status IN ('confirmed','rejected'), 'already_processed', true, 'booking_status', b.booking_status);
  END IF;
  IF p_received THEN
    UPDATE paid_bookings SET booking_status = 'confirmed', payment_status = 'verified', decided_at = now(), decided_by = v_uid WHERE id = b.id;
    INSERT INTO schedule_participants(schedule_id, user_id, paid_booking_id) VALUES (b.schedule_id, b.user_id, b.id) RETURNING id INTO v_sp;
    UPDATE paid_bookings SET schedule_participant_id = v_sp WHERE id = b.id;
    INSERT INTO paid_booking_ledger(booking_id, kind, amount_rub, actor, note) VALUES (b.id, 'prepay_verified', b.prepay_rub, v_uid, p_note);
    RETURN jsonb_build_object('ok',true,'booking_status','confirmed');
  END IF;
  UPDATE paid_bookings SET booking_status = 'rejected', payment_status = 'not_received', decided_at = now(), decided_by = v_uid WHERE id = b.id;
  INSERT INTO paid_booking_ledger(booking_id, kind, actor, note) VALUES (b.id, 'prepay_not_received', v_uid, p_note);
  RETURN jsonb_build_object('ok',true,'booking_status','rejected');
END $$;

-- Наличные: частичные суммы, остаток = cash_rub − получено; каждая кнопка с request_key исполняется один раз
CREATE FUNCTION public.paid_booking_mark_cash(p_booking_id uuid, p_amount_rub integer, p_request_key text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid(); b paid_bookings%ROWTYPE; v_got integer;
BEGIN
  IF NOT public.is_kemp_founder(v_uid) THEN RETURN jsonb_build_object('ok',false,'error','forbidden'); END IF;
  IF p_request_key IS NULL OR length(p_request_key) < 8 THEN RETURN jsonb_build_object('ok',false,'error','request_key_required'); END IF;
  SELECT * INTO b FROM paid_bookings WHERE id = p_booking_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok',false,'error','not_found'); END IF;
  IF EXISTS (SELECT 1 FROM paid_booking_ledger WHERE booking_id = b.id AND request_key = p_request_key) THEN
    RETURN jsonb_build_object('ok',true,'already_processed',true,'cash_received_rub',COALESCE(b.cash_received_rub,0),'cash_remaining_rub',b.cash_rub-COALESCE(b.cash_received_rub,0));
  END IF;
  IF b.booking_status <> 'confirmed' THEN RETURN jsonb_build_object('ok',false,'error','not_confirmed'); END IF;
  v_got := COALESCE(b.cash_received_rub,0);
  IF p_amount_rub IS NULL OR p_amount_rub <= 0 OR p_amount_rub > b.cash_rub - v_got THEN RETURN jsonb_build_object('ok',false,'error','invalid_amount','cash_remaining_rub',b.cash_rub-v_got); END IF;
  UPDATE paid_bookings SET cash_received_rub = v_got + p_amount_rub, cash_received_at = now(), cash_received_by = v_uid WHERE id = b.id;
  INSERT INTO paid_booking_ledger(booking_id, kind, amount_rub, actor, request_key) VALUES (b.id, 'cash_received', p_amount_rub, v_uid, p_request_key);
  RETURN jsonb_build_object('ok',true,'cash_received_rub',v_got + p_amount_rub,'cash_remaining_rub',b.cash_rub - v_got - p_amount_rub);
END $$;

-- Отмена основателем (в т.ч. подтверждённой): запись в календаре удаляется, финансовая история остаётся
-- Отмена основателем: запись в календаре снимается, история остаётся.
-- refund_pending ставится ТОЛЬКО если есть подтверждённые поступления; «со слов участника» возврат не создаёт.
CREATE FUNCTION public.paid_booking_founder_cancel(p_booking_id uuid, p_refund_due boolean, p_note text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid(); b paid_bookings%ROWTYPE; m record; v_refundable integer;
BEGIN
  IF NOT public.is_kemp_founder(v_uid) THEN RETURN jsonb_build_object('ok',false,'error','forbidden'); END IF;
  IF p_note IS NULL OR length(trim(p_note)) < 3 THEN RETURN jsonb_build_object('ok',false,'error','note_required'); END IF;
  SELECT * INTO b FROM paid_bookings WHERE id = p_booking_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok',false,'error','not_found'); END IF;
  IF b.booking_status NOT IN ('hold','pending_review','confirmed') THEN RETURN jsonb_build_object('ok',true,'already_processed',true,'booking_status',b.booking_status); END IF;
  SELECT * INTO m FROM public.paid_booking_money(b.id);
  v_refundable := m.received_rub - m.refunded_rub;
  UPDATE paid_bookings SET booking_status = 'cancelled', decided_at = now(), decided_by = v_uid,
    payment_status = CASE WHEN p_refund_due AND v_refundable > 0 THEN 'refund_pending' ELSE payment_status END
    WHERE id = b.id;
  DELETE FROM schedule_participants WHERE paid_booking_id = b.id;
  INSERT INTO paid_booking_ledger(booking_id, kind, actor, note) VALUES (b.id, 'cancelled_by_founder', v_uid,
    p_note || CASE WHEN b.payment_status = 'reported' THEN ' [участник сообщал об оплате, поступление не подтверждено]' ELSE '' END);
  IF p_refund_due AND v_refundable > 0 THEN
    INSERT INTO paid_booking_ledger(booking_id, kind, amount_rub, actor, note) VALUES (b.id, 'refund_marked_pending', v_refundable, v_uid, p_note);
  END IF;
  RETURN jsonb_build_object('ok',true,'booking_status','cancelled','refundable_rub',GREATEST(v_refundable,0));
END $$;

-- Возврат: не больше (подтверждённые поступления − уже возвращено); частичные возвраты; причина обязательна
CREATE FUNCTION public.paid_booking_mark_refunded(p_booking_id uuid, p_amount_rub integer, p_note text, p_request_key text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid(); b paid_bookings%ROWTYPE; m record; v_left integer;
BEGIN
  IF NOT public.is_kemp_founder(v_uid) THEN RETURN jsonb_build_object('ok',false,'error','forbidden'); END IF;
  IF p_request_key IS NULL OR length(p_request_key) < 8 THEN RETURN jsonb_build_object('ok',false,'error','request_key_required'); END IF;
  SELECT * INTO b FROM paid_bookings WHERE id = p_booking_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok',false,'error','not_found'); END IF;
  IF EXISTS (SELECT 1 FROM paid_booking_ledger WHERE booking_id = b.id AND request_key = p_request_key) THEN
    RETURN jsonb_build_object('ok',true,'already_processed',true,'payment_status',b.payment_status);
  END IF;
  IF p_note IS NULL OR length(trim(p_note)) < 3 THEN RETURN jsonb_build_object('ok',false,'error','note_required'); END IF;
  IF b.payment_status NOT IN ('refund_pending','partially_refunded') THEN RETURN jsonb_build_object('ok',false,'error','refund_not_pending'); END IF;
  SELECT * INTO m FROM public.paid_booking_money(b.id);
  v_left := m.received_rub - m.refunded_rub;
  IF p_amount_rub IS NULL OR p_amount_rub <= 0 OR p_amount_rub > v_left THEN RETURN jsonb_build_object('ok',false,'error','refund_exceeds_received','refundable_rub',v_left); END IF;
  UPDATE paid_bookings SET payment_status = CASE WHEN p_amount_rub = v_left THEN 'refunded' ELSE 'partially_refunded' END WHERE id = b.id;
  INSERT INTO paid_booking_ledger(booking_id, kind, amount_rub, actor, note, request_key) VALUES (b.id, 'refund_issued', p_amount_rub, v_uid, p_note, p_request_key);
  RETURN jsonb_build_object('ok',true,'payment_status',CASE WHEN p_amount_rub = v_left THEN 'refunded' ELSE 'partially_refunded' END,'refundable_rub',v_left - p_amount_rub);
END $$;

-- Позднее поступление на закрытую бронь (отменена/истекла/«не поступил»): фиксируем деньги и
-- ставим «нужен возврат». Бронь и место НЕ восстанавливаются, автоматического возврата нет.
CREATE FUNCTION public.paid_booking_record_late_payment(p_booking_id uuid, p_amount_rub integer, p_note text, p_request_key text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid(); b paid_bookings%ROWTYPE; m record;
BEGIN
  IF NOT public.is_kemp_founder(v_uid) THEN RETURN jsonb_build_object('ok',false,'error','forbidden'); END IF;
  IF p_request_key IS NULL OR length(p_request_key) < 8 THEN RETURN jsonb_build_object('ok',false,'error','request_key_required'); END IF;
  SELECT * INTO b FROM paid_bookings WHERE id = p_booking_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok',false,'error','not_found'); END IF;
  IF EXISTS (SELECT 1 FROM paid_booking_ledger WHERE booking_id = b.id AND request_key = p_request_key) THEN
    RETURN jsonb_build_object('ok',true,'already_processed',true);
  END IF;
  IF b.booking_status NOT IN ('cancelled','rejected','expired') THEN RETURN jsonb_build_object('ok',false,'error','booking_not_closed'); END IF;
  IF p_note IS NULL OR length(trim(p_note)) < 3 THEN RETURN jsonb_build_object('ok',false,'error','note_required'); END IF;
  SELECT * INTO m FROM public.paid_booking_money(b.id);
  IF p_amount_rub IS NULL OR p_amount_rub <= 0 OR m.received_rub + p_amount_rub > b.price_total_rub THEN RETURN jsonb_build_object('ok',false,'error','invalid_amount'); END IF;
  UPDATE paid_bookings SET payment_status = 'refund_pending' WHERE id = b.id;
  INSERT INTO paid_booking_ledger(booking_id, kind, amount_rub, actor, note, request_key) VALUES (b.id, 'late_prepay_received', p_amount_rub, v_uid, p_note, p_request_key);
  RETURN jsonb_build_object('ok',true,'payment_status','refund_pending','booking_status',b.booking_status);
END $$;

-- P0-2: атомарное создание/правка события клуба вместе с платными настройками (одна транзакция,
-- одна команда INSERT/UPDATE): при ошибке цены событие не появляется и не публикуется бесплатным.
CREATE FUNCTION public.paid_event_save(p_schedule_id uuid, p_title text, p_description text, p_start timestamptz, p_end timestamptz,
  p_location text, p_color text, p_mastermind_group_id uuid, p_mode text, p_price_total_rub integer, p_prepay_rub integer,
  p_cash_rub integer, p_max_participants integer, p_payment_window_minutes integer, p_cancellation_terms text,
  p_payment_qr_url text, p_payment_link text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id uuid; v_paid boolean := p_mode = 'paid';
BEGIN
  IF NOT public.is_kemp_founder(auth.uid()) THEN RETURN jsonb_build_object('ok',false,'error','forbidden'); END IF;
  IF p_mode IS NULL OR p_mode NOT IN ('free','paid') THEN RETURN jsonb_build_object('ok',false,'error','invalid_mode'); END IF;
  IF nullif(trim(p_title),'') IS NULL OR p_start IS NULL OR p_end IS NULL OR p_end <= p_start THEN RETURN jsonb_build_object('ok',false,'error','invalid_event'); END IF;
  IF p_schedule_id IS NULL THEN
    INSERT INTO schedules(title, activity_type, description, start_time, end_time, location, color, mastermind_group_id,
      schedule_type, is_active, instructor_id, stream_id, booking_mode, price_total_rub, prepay_rub, cash_rub, max_participants,
      payment_window_minutes, cancellation_terms, payment_qr_url, payment_link)
    VALUES (p_title, p_title, p_description, p_start, p_end, nullif(trim(p_location),''), p_color, p_mastermind_group_id,
      'club', true, NULL, NULL, p_mode,
      CASE WHEN v_paid THEN p_price_total_rub END, CASE WHEN v_paid THEN p_prepay_rub END, CASE WHEN v_paid THEN p_cash_rub END,
      CASE WHEN v_paid THEN p_max_participants END, COALESCE(p_payment_window_minutes,120),
      CASE WHEN v_paid THEN nullif(trim(p_cancellation_terms),'') END, CASE WHEN v_paid THEN nullif(trim(p_payment_qr_url),'') END,
      CASE WHEN v_paid THEN nullif(trim(p_payment_link),'') END)
    RETURNING id INTO v_id;
  ELSE
    UPDATE schedules SET title = p_title, activity_type = p_title, description = p_description, start_time = p_start, end_time = p_end,
      location = nullif(trim(p_location),''), color = p_color, mastermind_group_id = p_mastermind_group_id, booking_mode = p_mode,
      price_total_rub = CASE WHEN v_paid THEN p_price_total_rub ELSE price_total_rub END,
      prepay_rub = CASE WHEN v_paid THEN p_prepay_rub ELSE prepay_rub END,
      cash_rub = CASE WHEN v_paid THEN p_cash_rub ELSE cash_rub END,
      max_participants = CASE WHEN v_paid THEN p_max_participants ELSE max_participants END,
      payment_window_minutes = CASE WHEN v_paid THEN COALESCE(p_payment_window_minutes,120) ELSE payment_window_minutes END,
      cancellation_terms = CASE WHEN v_paid THEN nullif(trim(p_cancellation_terms),'') ELSE cancellation_terms END,
      payment_qr_url = CASE WHEN v_paid THEN nullif(trim(p_payment_qr_url),'') ELSE payment_qr_url END,
      payment_link = CASE WHEN v_paid THEN nullif(trim(p_payment_link),'') ELSE payment_link END
    WHERE id = p_schedule_id AND schedule_type = 'club' RETURNING id INTO v_id;
    IF v_id IS NULL THEN RETURN jsonb_build_object('ok',false,'error','not_club_event'); END IF;
  END IF;
  RETURN jsonb_build_object('ok',true,'schedule_id',v_id);
END $$;

-- Сохранение настроек платного события из существующей формы админки
CREATE FUNCTION public.paid_event_settings_save(p_schedule_id uuid, p_mode text, p_price_total_rub integer, p_prepay_rub integer,
  p_cash_rub integer, p_max_participants integer, p_payment_window_minutes integer, p_cancellation_terms text,
  p_payment_qr_url text, p_payment_link text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_kemp_founder(auth.uid()) THEN RETURN jsonb_build_object('ok',false,'error','forbidden'); END IF;
  IF p_mode = 'free' THEN
    UPDATE schedules SET booking_mode = 'free' WHERE id = p_schedule_id AND schedule_type = 'club';
  ELSE
    UPDATE schedules SET booking_mode = 'paid', price_total_rub = p_price_total_rub, prepay_rub = p_prepay_rub, cash_rub = p_cash_rub,
      max_participants = p_max_participants, payment_window_minutes = COALESCE(p_payment_window_minutes, 120),
      cancellation_terms = NULLIF(trim(p_cancellation_terms),''), payment_qr_url = NULLIF(trim(p_payment_qr_url),''),
      payment_link = NULLIF(trim(p_payment_link),'')
    WHERE id = p_schedule_id AND schedule_type = 'club';
  END IF;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok',false,'error','not_club_event'); END IF;
  RETURN jsonb_build_object('ok',true);
END $$;

REVOKE ALL ON FUNCTION public.paid_events_web(), public.paid_booking_create_hold(uuid,text), public.paid_booking_report_paid(uuid),
  public.paid_booking_cancel_own(uuid), public.paid_bookings_admin_list(uuid), public.paid_booking_decide(uuid,boolean,text),
  public.paid_booking_mark_cash(uuid,integer,text), public.paid_booking_founder_cancel(uuid,boolean,text),
  public.paid_booking_mark_refunded(uuid,integer,text,text), public.paid_booking_record_late_payment(uuid,integer,text,text),
  public.paid_event_save(uuid,text,text,timestamptz,timestamptz,text,text,uuid,text,integer,integer,integer,integer,integer,text,text,text),
  public.paid_event_settings_save(uuid,text,integer,integer,integer,integer,integer,text,text,text) FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.paid_events_web(), public.paid_booking_create_hold(uuid,text), public.paid_booking_report_paid(uuid),
  public.paid_booking_cancel_own(uuid), public.paid_bookings_admin_list(uuid), public.paid_booking_decide(uuid,boolean,text),
  public.paid_booking_mark_cash(uuid,integer,text), public.paid_booking_founder_cancel(uuid,boolean,text),
  public.paid_booking_mark_refunded(uuid,integer,text,text), public.paid_booking_record_late_payment(uuid,integer,text,text),
  public.paid_event_save(uuid,text,text,timestamptz,timestamptz,text,text,uuid,text,integer,integer,integer,integer,integer,text,text,text),
  public.paid_event_settings_save(uuid,text,integer,integer,integer,integer,integer,text,text,text) TO authenticated;

COMMIT;
