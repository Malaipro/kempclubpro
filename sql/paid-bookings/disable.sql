-- Мягкий откат E1 без потери финансовой истории (НЕ ПРИМЕНЕНО).
-- Новые брони перестают создаваться: клиентские RPC закрываются; таблицы, журнал и инвариант остаются.
BEGIN;
REVOKE EXECUTE ON FUNCTION public.paid_booking_create_hold(uuid,text), public.paid_booking_report_paid(uuid) FROM authenticated;
-- Отмена/решения основателя и чтение истории остаются доступны для закрытия уже начатых броней.
COMMIT;
