-- REVIEW ONLY. Export dispatch/claim history first. Stop staged sender before rollback.
BEGIN;
DROP TABLE public.notification_channel_claims;
DROP TABLE public.notification_dispatches;
COMMIT;