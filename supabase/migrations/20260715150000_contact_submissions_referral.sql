-- submit-application Edge Function принимает заявки с сайта без привязки к курсу
-- и с возможной реферальной атрибуцией — расширяем contact_submissions.

ALTER TABLE public.contact_submissions
  ALTER COLUMN course DROP NOT NULL;

ALTER TABLE public.contact_submissions
  ADD COLUMN IF NOT EXISTS ref_code TEXT,
  ADD COLUMN IF NOT EXISTS referrer_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'new';

CREATE INDEX IF NOT EXISTS idx_contact_submissions_referrer_user_id
  ON public.contact_submissions(referrer_user_id);
