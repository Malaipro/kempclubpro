-- Черновики еженедельных AI-сводок по ежедневнику для участников с личным кураторством

CREATE TABLE IF NOT EXISTS public.weekly_summaries (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  week_start   DATE NOT NULL,
  summary_text TEXT NOT NULL,
  status       TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'edited')),
  edited_text  TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, week_start)
);

CREATE INDEX IF NOT EXISTS weekly_summaries_user_id_idx ON public.weekly_summaries(user_id);
CREATE INDEX IF NOT EXISTS weekly_summaries_status_idx ON public.weekly_summaries(status);

ALTER TABLE public.weekly_summaries ENABLE ROW LEVEL SECURITY;

-- Только кураторы/админы видят и редактируют черновики; сам участник свою сводку не видит
CREATE POLICY "Admins manage weekly summaries"
  ON public.weekly_summaries
  FOR ALL
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));
