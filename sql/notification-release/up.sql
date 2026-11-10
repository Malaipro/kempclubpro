-- REVIEW ONLY, NOT APPLIED. Target KEMP wfjvjvbjjxcgkaolkgdq, never config.toml's MIRA.
BEGIN;
CREATE TABLE public.notification_dispatches (
  request_id uuid PRIMARY KEY,
  created_by uuid NOT NULL,
  payload_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.notification_dispatches TO service_role;
ALTER TABLE public.notification_dispatches ENABLE ROW LEVEL SECURITY;
-- No client policies/grants: claim store is service-only.
CREATE TABLE public.notification_channel_claims (
  request_id uuid NOT NULL REFERENCES public.notification_dispatches(request_id),
  channel text NOT NULL,
  claimed_at timestamptz NOT NULL DEFAULT now(),
  result jsonb,
  PRIMARY KEY(request_id, channel)
);
GRANT ALL ON public.notification_channel_claims TO service_role;
ALTER TABLE public.notification_channel_claims ENABLE ROW LEVEL SECURITY;
COMMIT;