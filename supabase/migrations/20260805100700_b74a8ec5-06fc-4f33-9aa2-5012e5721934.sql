CREATE TABLE public.application_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id uuid NOT NULL REFERENCES public.contact_submissions(id) ON DELETE CASCADE,
  author_id uuid,
  note text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.application_notes TO authenticated;
GRANT ALL ON public.application_notes TO service_role;

ALTER TABLE public.application_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view application notes"
  ON public.application_notes FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can add application notes"
  ON public.application_notes FOR INSERT TO authenticated
  WITH CHECK (public.is_admin(auth.uid()) AND author_id = auth.uid());

CREATE POLICY "Authors or super admins can delete application notes"
  ON public.application_notes FOR DELETE TO authenticated
  USING (public.is_admin(auth.uid()) AND (author_id = auth.uid() OR public.is_super_admin(auth.uid())));

CREATE INDEX idx_application_notes_submission ON public.application_notes(submission_id, created_at DESC);

CREATE TABLE public.application_reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id uuid NOT NULL REFERENCES public.contact_submissions(id) ON DELETE CASCADE,
  author_id uuid,
  remind_at timestamptz NOT NULL,
  comment text,
  sent boolean NOT NULL DEFAULT false,
  sent_at timestamptz,
  done boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.application_reminders TO authenticated;
GRANT ALL ON public.application_reminders TO service_role;

ALTER TABLE public.application_reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view application reminders"
  ON public.application_reminders FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can create application reminders"
  ON public.application_reminders FOR INSERT TO authenticated
  WITH CHECK (public.is_admin(auth.uid()) AND author_id = auth.uid());

CREATE POLICY "Admins can update application reminders"
  ON public.application_reminders FOR UPDATE TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete application reminders"
  ON public.application_reminders FOR DELETE TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE INDEX idx_application_reminders_pending ON public.application_reminders(remind_at) WHERE sent = false AND done = false;

CREATE TRIGGER update_application_reminders_updated_at
  BEFORE UPDATE ON public.application_reminders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();