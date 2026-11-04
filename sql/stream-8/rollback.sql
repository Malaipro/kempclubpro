-- REVIEW ONLY. Execute only after separate user approval.
-- Safe non-destructive rollback: deactivate the new stream and its events.
-- No participant, booking, result, or schedule deletion.
BEGIN;
LOCK TABLE public.streams IN SHARE ROW EXCLUSIVE MODE;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM public.streams WHERE is_active AND stream_type='intensive'
    AND id NOT IN ('c4fcd7b8-0826-4ac3-96b0-faf8d1c00808','e73c9458-21a9-4a8c-9646-08b60ae77998')) THEN
    RAISE EXCEPTION 'Another intensive is now active; review rollback manually';
  END IF;
END $$;
UPDATE public.schedules SET is_active=false WHERE stream_id='c4fcd7b8-0826-4ac3-96b0-faf8d1c00808';
UPDATE public.streams SET is_active=false WHERE id='c4fcd7b8-0826-4ac3-96b0-faf8d1c00808';
UPDATE public.streams SET is_active=true WHERE id='e73c9458-21a9-4a8c-9646-08b60ae77998';
COMMIT;