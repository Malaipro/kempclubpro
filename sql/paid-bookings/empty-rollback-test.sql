-- Assertions after paid-bookings/down.sql then resident-checkins/down.sql on a fixture with no events/bookings.
\set ON_ERROR_STOP on
CREATE FUNCTION pg_temp.expect(cond boolean, label text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  IF NOT cond THEN RAISE EXCEPTION 'FAIL: %', label; END IF;
  RAISE NOTICE 'OK: %', label;
END $$;

SELECT pg_temp.expect(to_regclass('public.paid_bookings') IS NULL, 'empty rollback: paid_bookings removed');
SELECT pg_temp.expect(to_regclass('public.paid_booking_ledger') IS NULL, 'empty rollback: paid_booking_ledger removed');
SELECT pg_temp.expect(NOT EXISTS (
  SELECT 1 FROM information_schema.columns
  WHERE table_schema='public' AND table_name='schedules' AND column_name='booking_mode'
), 'empty rollback: paid schedule columns removed');
SELECT pg_temp.expect(NOT EXISTS (
  SELECT 1 FROM information_schema.columns
  WHERE table_schema='public' AND table_name='schedule_participants' AND column_name='paid_booking_id'
), 'empty rollback: paid participant column removed');
SELECT pg_temp.expect(to_regprocedure('public.paid_booking_create_hold(uuid,text)') IS NULL, 'empty rollback: paid RPC removed');
SELECT pg_temp.expect(to_regprocedure('public.is_kemp_founder(uuid)') IS NULL, 'empty rollback: founder helper removed with checkins');
SELECT pg_temp.expect(NOT EXISTS (
  SELECT 1 FROM information_schema.columns
  WHERE table_schema='public' AND table_name='schedule_participants' AND column_name='attendance_history'
), 'empty rollback: check-in fields removed');
SELECT pg_temp.expect(to_regprocedure('public.register_for_event_web(uuid)') IS NOT NULL, 'empty rollback: legacy web booking wrapper restored');
SELECT pg_temp.expect((SELECT relrowsecurity FROM pg_class WHERE oid='public.schedules'::regclass)
  AND (SELECT relrowsecurity FROM pg_class WHERE oid='public.schedule_participants'::regclass), 'empty rollback: base RLS preserved');
SELECT pg_temp.expect(EXISTS (
  SELECT 1 FROM pg_constraint
  WHERE conrelid='public.schedule_participants'::regclass AND contype='f' AND confrelid='auth.users'::regclass
), 'empty rollback: auth.users FK preserved');
SELECT pg_temp.expect(EXISTS (
  SELECT 1 FROM pg_constraint
  WHERE conrelid='public.schedule_participants'::regclass AND contype='u'
), 'empty rollback: schedule participant UNIQUE preserved');
SELECT pg_temp.expect(EXISTS (
  SELECT 1 FROM pg_trigger
  WHERE tgrelid='public.schedule_participants'::regclass AND tgname='trg_notify_booking_change' AND NOT tgisinternal
), 'empty rollback: notification stub trigger preserved');
