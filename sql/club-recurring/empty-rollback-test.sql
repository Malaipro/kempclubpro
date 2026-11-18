\set ON_ERROR_STOP on
SELECT public.test_expect(to_regclass('public.club_recurring_series') IS NULL, 'empty rollback removes series table');
SELECT public.test_expect(to_regclass('public.club_recurring_occurrences') IS NULL, 'empty rollback removes occurrence ledger');
SELECT public.test_expect(to_regprocedure('public.club_recurring_series_save(text,text,text,date,date,text,time without time zone,time without time zone,text)') IS NULL, 'empty rollback removes save RPC');
SELECT public.test_expect(to_regclass('public.schedules') IS NOT NULL, 'empty rollback preserves schedules');
SELECT public.test_expect((SELECT relrowsecurity FROM pg_class WHERE oid='public.schedules'::regclass), 'empty rollback preserves schedules RLS');
