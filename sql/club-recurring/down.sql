-- Full rollback is safe only before a recurring series has been saved.
\set ON_ERROR_STOP on
BEGIN;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.club_recurring_occurrences)
     OR EXISTS (SELECT 1 FROM public.club_recurring_series) THEN
    RAISE EXCEPTION 'club_recurring_has_history; disable RPC grants and review created schedules instead';
  END IF;
END $$;

DROP FUNCTION public.club_recurring_series_save(text, text, text, date, date, text, time without time zone, time without time zone, text);
DROP FUNCTION public.club_recurring_series_preview(text, date, date, text, time without time zone, time without time zone, text);
DROP FUNCTION public.club_recurring_plan_dates(date, date, text);
DROP FUNCTION public.club_recurring_can_manage(uuid);
DROP FUNCTION public.club_recurring_training_kind(text);
DROP FUNCTION public.club_recurring_normalize_location(text);
DROP INDEX public.club_recurring_schedule_match_idx;
DROP TABLE public.club_recurring_occurrences;
DROP TABLE public.club_recurring_series;

COMMIT;
