CREATE TABLE public.broadcast_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  text TEXT NOT NULL,
  audience TEXT NOT NULL DEFAULT 'all' CHECK (audience IN ('intensive','resident','all')),
  buttons JSONB NOT NULL DEFAULT '[]'::jsonb,
  file_url TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','sent')),
  recipients_count INTEGER NOT NULL DEFAULT 0,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  sent_at TIMESTAMP WITH TIME ZONE
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.broadcast_messages TO authenticated;
GRANT ALL ON public.broadcast_messages TO service_role;

ALTER TABLE public.broadcast_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view broadcasts"
ON public.broadcast_messages FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can create broadcasts"
ON public.broadcast_messages FOR INSERT
TO authenticated
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update broadcasts"
ON public.broadcast_messages FOR UPDATE
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete broadcasts"
ON public.broadcast_messages FOR DELETE
TO authenticated
USING (public.is_admin(auth.uid()));