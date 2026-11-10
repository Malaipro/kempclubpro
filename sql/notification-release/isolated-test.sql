-- Run ONLY in a separate local database.
\set ON_ERROR_STOP on
\i sql/notification-release/up.sql
CREATE FUNCTION pg_temp.expect(cond boolean,label text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN IF NOT COALESCE(cond,false) THEN RAISE EXCEPTION 'FAIL %',label; END IF; RAISE NOTICE 'OK %',label; END $$;
SET ROLE authenticated;
DO $$ BEGIN INSERT INTO public.notification_dispatches VALUES(gen_random_uuid(),gen_random_uuid(),'bad',now()); RAISE EXCEPTION 'client insert allowed'; EXCEPTION WHEN insufficient_privilege THEN RAISE NOTICE 'OK client claims denied'; END $$;
RESET ROLE;
SET ROLE service_role;
INSERT INTO public.notification_dispatches(request_id,created_by,payload_hash) VALUES('20000000-0000-0000-0000-000000000001','bfe3d1f1-3b4a-4c9c-b38a-e961f3fc7f2e','hash');
INSERT INTO public.notification_channel_claims(request_id,channel) VALUES('20000000-0000-0000-0000-000000000001','push');
INSERT INTO public.notification_channel_claims(request_id,channel) VALUES('20000000-0000-0000-0000-000000000001','push') ON CONFLICT DO NOTHING;
SELECT pg_temp.expect((SELECT count(*) FROM public.notification_channel_claims)=1,'unique persistent claim');
INSERT INTO public.notification_channel_claims(request_id,channel) VALUES('20000000-0000-0000-0000-000000000001','telegram_group');
SELECT pg_temp.expect((SELECT count(*) FROM public.notification_channel_claims)=2,'independent channel claims');
RESET ROLE;
\i sql/notification-release/down.sql
SELECT pg_temp.expect(to_regclass('public.notification_channel_claims') IS NULL AND to_regclass('public.notification_dispatches') IS NULL,'rollback removes only new claims');