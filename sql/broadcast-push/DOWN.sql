-- Rollback for the broadcast-push history migration only.
-- First disable dispatch and restore the prior frontend commit.
UPDATE public.internal_settings SET value = 'false' WHERE key = 'broadcast_push_enabled';
ALTER TABLE public.broadcast_messages
  DROP COLUMN IF EXISTS push_sent,
  DROP COLUMN IF EXISTS push_subscribed,
  DROP COLUMN IF EXISTS push_failed,
  DROP COLUMN IF EXISTS push_started_at;