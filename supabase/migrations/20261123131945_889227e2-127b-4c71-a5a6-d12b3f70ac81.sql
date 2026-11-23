ALTER TABLE public.broadcast_messages
  ADD COLUMN IF NOT EXISTS push_sent integer,
  ADD COLUMN IF NOT EXISTS push_subscribed integer,
  ADD COLUMN IF NOT EXISTS push_failed integer,
  ADD COLUMN IF NOT EXISTS push_started_at timestamptz;
INSERT INTO public.internal_settings (key, value)
VALUES ('broadcast_push_enabled', 'false')
ON CONFLICT (key) DO NOTHING;