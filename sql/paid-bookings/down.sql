-- КЭМП / E1 paid-bookings (DOWN). НЕ ПРИМЕНЕНО.
-- ВНИМАНИЕ: DOWN удаляет финансовую историю. Для отката БЕЗ потери истории используйте
-- sql/paid-bookings/disable.sql (переводит события во free, таблицы и журнал сохраняются).
-- Полный DOWN разрешён только если в paid_bookings 0 строк (проверка ниже).
BEGIN;
DO $$ BEGIN
  IF to_regclass('public.paid_bookings') IS NOT NULL AND EXISTS (SELECT 1 FROM public.paid_bookings) THEN
    RAISE EXCEPTION 'paid_bookings has history; use disable.sql instead of DOWN';
  END IF;
END $$;
DROP TRIGGER IF EXISTS schedule_participants_paid_guard ON public.schedule_participants;
DROP TRIGGER IF EXISTS schedules_paid_settings_guard ON public.schedules;
DROP FUNCTION IF EXISTS public.paid_event_settings_save(uuid,text,integer,integer,integer,integer,integer,text,text,text),
  public.paid_booking_mark_refunded(uuid,integer,text,text), public.paid_booking_record_late_payment(uuid,integer,text,text),
  public.paid_event_save(uuid,text,text,timestamptz,timestamptz,text,text,uuid,text,integer,integer,integer,integer,integer,text,text,text),
  public.paid_booking_founder_cancel(uuid,boolean,text), public.paid_booking_mark_cash(uuid,integer,text), public.paid_booking_money(uuid), public.paid_booking_decide(uuid,boolean,text), public.paid_bookings_admin_list(uuid),
  public.paid_booking_cancel_own(uuid), public.paid_booking_report_paid(uuid), public.paid_booking_create_hold(uuid,text),
  public.paid_events_web(), public.paid_seats_used(uuid), public.paid_expire_stale_holds(uuid),
  public.guard_paid_schedule_settings(), public.enforce_paid_participation();
DROP INDEX IF EXISTS public.schedule_participants_paid_booking_uniq;
ALTER TABLE public.schedule_participants DROP COLUMN IF EXISTS paid_booking_id;
DROP TABLE IF EXISTS public.paid_booking_ledger;
DROP TABLE IF EXISTS public.paid_bookings;
DROP FUNCTION IF EXISTS public.paid_booking_ledger_append_only(), public.paid_bookings_no_delete();
ALTER TABLE public.schedules DROP CONSTRAINT IF EXISTS schedules_paid_prices_chk, DROP CONSTRAINT IF EXISTS schedules_booking_mode_chk,
  DROP COLUMN IF EXISTS booking_mode, DROP COLUMN IF EXISTS price_total_rub, DROP COLUMN IF EXISTS prepay_rub, DROP COLUMN IF EXISTS cash_rub,
  DROP COLUMN IF EXISTS payment_window_minutes, DROP COLUMN IF EXISTS cancellation_terms, DROP COLUMN IF EXISTS payment_qr_url,
  DROP COLUMN IF EXISTS payment_link;
COMMIT;
