
-- Enum for day type
DO $$ BEGIN
  CREATE TYPE public.journal_day_type AS ENUM ('weekday','saturday','sunday');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- journal_prompts
CREATE TABLE public.journal_prompts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  day_type public.journal_day_type NOT NULL,
  question_text TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.journal_prompts TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.journal_prompts TO authenticated;
GRANT ALL ON public.journal_prompts TO service_role;
ALTER TABLE public.journal_prompts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Prompts viewable by authenticated"
  ON public.journal_prompts FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage prompts"
  ON public.journal_prompts FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE TRIGGER update_journal_prompts_updated_at
  BEFORE UPDATE ON public.journal_prompts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- journal_entries
CREATE TABLE public.journal_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  entry_date DATE NOT NULL,
  day_type public.journal_day_type NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, entry_date)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.journal_entries TO authenticated;
GRANT ALL ON public.journal_entries TO service_role;
ALTER TABLE public.journal_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own entries"
  ON public.journal_entries FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins view all entries"
  ON public.journal_entries FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE TRIGGER update_journal_entries_updated_at
  BEFORE UPDATE ON public.journal_entries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_journal_entries_user_date ON public.journal_entries(user_id, entry_date DESC);

-- journal_answers
CREATE TABLE public.journal_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id UUID NOT NULL REFERENCES public.journal_entries(id) ON DELETE CASCADE,
  prompt_id UUID NOT NULL REFERENCES public.journal_prompts(id) ON DELETE CASCADE,
  answer_text TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (entry_id, prompt_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.journal_answers TO authenticated;
GRANT ALL ON public.journal_answers TO service_role;
ALTER TABLE public.journal_answers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own answers"
  ON public.journal_answers FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.journal_entries e WHERE e.id = entry_id AND e.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.journal_entries e WHERE e.id = entry_id AND e.user_id = auth.uid()));
CREATE POLICY "Admins view all answers"
  ON public.journal_answers FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE TRIGGER update_journal_answers_updated_at
  BEFORE UPDATE ON public.journal_answers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- journal_emotions
CREATE TABLE public.journal_emotions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id UUID NOT NULL REFERENCES public.journal_entries(id) ON DELETE CASCADE,
  emotion_name TEXT NOT NULL,
  intensity INTEGER NOT NULL DEFAULT 3 CHECK (intensity BETWEEN 1 AND 5),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.journal_emotions TO authenticated;
GRANT ALL ON public.journal_emotions TO service_role;
ALTER TABLE public.journal_emotions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own emotions"
  ON public.journal_emotions FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.journal_entries e WHERE e.id = entry_id AND e.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.journal_entries e WHERE e.id = entry_id AND e.user_id = auth.uid()));
CREATE POLICY "Admins view all emotions"
  ON public.journal_emotions FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()));

-- Seed default prompts
INSERT INTO public.journal_prompts (day_type, question_text, sort_order) VALUES
  ('weekday', 'Как прошёл день?', 1),
  ('weekday', 'Что сегодня далось труднее всего?', 2),
  ('weekday', 'Главное наблюдение о себе', 3),
  ('saturday', 'Как прошёл тактический выезд?', 1),
  ('saturday', 'Что открыл в себе сегодня?', 2),
  ('saturday', 'Что возьмёшь с собой дальше?', 3),
  ('sunday', 'Главный итог недели', 1),
  ('sunday', 'Что удалось? Что не удалось?', 2),
  ('sunday', 'Намерение на следующую неделю', 3);
