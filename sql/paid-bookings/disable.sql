-- Мягкий откат E1 без потери финансовой истории (НЕ ПРИМЕНЕНО).
-- Новые брони перестают создаваться: клиентские RPC закрываются; таблицы, журнал и инвариант остаются.
-- booking_mode остаётся paid: скрипт НЕ делает события бесплатными. Сначала выключить VITE_PAID_BOOKINGS_ENABLED;
-- при выключенном UI-флаге DB-инвариант всё равно fail-closed блокирует legacy-запись на paid-событие.
BEGIN;
REVOKE EXECUTE ON FUNCTION public.paid_booking_create_hold(uuid,text), public.paid_booking_report_paid(uuid) FROM authenticated;
-- Отмена/решения основателя и чтение истории остаются доступны для закрытия уже начатых броней.
COMMIT;
