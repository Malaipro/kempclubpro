-- Soft stop for new previews/saves. Existing schedules and recurrence history remain untouched.
BEGIN;
REVOKE EXECUTE ON FUNCTION public.club_recurring_series_preview(text, date, date, text, time without time zone, time without time zone, text) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.club_recurring_series_save(text, text, text, date, date, text, time without time zone, time without time zone, text) FROM authenticated;
COMMIT;
