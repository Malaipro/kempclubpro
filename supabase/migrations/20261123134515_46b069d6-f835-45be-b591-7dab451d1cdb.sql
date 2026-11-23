ALTER TABLE public.broadcast_messages ADD COLUMN IF NOT EXISTS channel text NOT NULL DEFAULT 'telegram';
GRANT SELECT ON public.notifications TO authenticated;
REVOKE UPDATE ON public.notifications FROM authenticated, anon;
GRANT UPDATE (is_read) ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notifications;
CREATE POLICY "Users can update their own notifications" ON public.notifications FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS notifications_user_created_idx ON public.notifications (user_id, created_at DESC);