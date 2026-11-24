-- КЭМП / E1 / фиксация search_path
-- Только две служебные функции.
-- Без изменения данных и существующих триггеров.
BEGIN;

ALTER FUNCTION public.paid_booking_ledger_append_only()
  SET search_path = '';

ALTER FUNCTION public.paid_bookings_no_delete()
  SET search_path = '';

COMMIT;
