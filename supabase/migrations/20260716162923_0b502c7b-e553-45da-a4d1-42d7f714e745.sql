-- =========================================================================
-- Набор B: таблицы CRM + триггер истории статусов
-- =========================================================================

-- 1. История смены статусов
CREATE TABLE public.participant_status_history (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_user_id UUID NOT NULL,
  old_status      public.participant_status_type,
  new_status      public.participant_status_type NOT NULL,
  stream_id       UUID,
  changed_by      UUID,
  changed_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_status_history_profile
  ON public.participant_status_history (profile_user_id, changed_at DESC);

GRANT SELECT ON public.participant_status_history TO authenticated;
GRANT ALL    ON public.participant_status_history TO service_role;

ALTER TABLE public.participant_status_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage participant_status_history"
  ON public.participant_status_history
  FOR ALL
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE OR REPLACE FUNCTION public.log_participant_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.participant_status IS DISTINCT FROM OLD.participant_status THEN
    INSERT INTO public.participant_status_history
      (profile_user_id, old_status, new_status, stream_id, changed_by)
    VALUES
      (NEW.user_id, OLD.participant_status, NEW.participant_status,
       NEW.current_stream_id, auth.uid());
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_participant_status_history
  AFTER UPDATE OF participant_status ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.log_participant_status_change();

-- 2. Теги
CREATE TABLE public.participant_tags (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL UNIQUE,
  color      TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.participant_tags TO authenticated;
GRANT ALL ON public.participant_tags TO service_role;

ALTER TABLE public.participant_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage participant_tags"
  ON public.participant_tags
  FOR ALL
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE TABLE public.profile_tags (
  profile_user_id UUID NOT NULL,
  tag_id          UUID NOT NULL REFERENCES public.participant_tags(id) ON DELETE CASCADE,
  created_by      UUID,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (profile_user_id, tag_id)
);

CREATE INDEX idx_profile_tags_tag ON public.profile_tags (tag_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.profile_tags TO authenticated;
GRANT ALL ON public.profile_tags TO service_role;

ALTER TABLE public.profile_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage profile_tags"
  ON public.profile_tags
  FOR ALL
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- 3. Заметки
CREATE TABLE public.participant_notes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_user_id UUID NOT NULL,
  author_id       UUID NOT NULL,
  note            TEXT NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_participant_notes_profile
  ON public.participant_notes (profile_user_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.participant_notes TO authenticated;
GRANT ALL ON public.participant_notes TO service_role;

ALTER TABLE public.participant_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage participant_notes"
  ON public.participant_notes
  FOR ALL
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- 4. Журнал CRM-рассылок
CREATE TABLE public.broadcasts (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by   UUID NOT NULL,
  message_text TEXT NOT NULL,
  filter_json  JSONB,
  audience_cnt INTEGER NOT NULL,
  sent_cnt     INTEGER,
  status       TEXT NOT NULL DEFAULT 'pending',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_broadcasts_created_at
  ON public.broadcasts (created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.broadcasts TO authenticated;
GRANT ALL ON public.broadcasts TO service_role;

ALTER TABLE public.broadcasts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage broadcasts"
  ON public.broadcasts
  FOR ALL
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));