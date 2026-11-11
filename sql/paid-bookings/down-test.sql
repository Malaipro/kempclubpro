\set ON_ERROR_STOP on
CREATE FUNCTION pg_temp.expect(cond boolean, label text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN IF NOT cond THEN RAISE EXCEPTION 'FAIL: %', label; END IF; RAISE NOTICE 'OK: %', label; END $$;
\set ON_ERROR_STOP off
\i sql/paid-bookings/down.sql
\set ON_ERROR_STOP on
ROLLBACK;
SELECT pg_temp.expect(to_regclass('public.paid_booking_ledger') IS NOT NULL,'DOWN отказал при наличии финансовой истории');
\i sql/paid-bookings/disable.sql
SELECT pg_temp.expect(NOT has_function_privilege('authenticated','public.paid_booking_create_hold(uuid,text)','EXECUTE'),'disable.sql закрыл новые брони, история сохранена');
