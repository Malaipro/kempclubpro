DROP POLICY IF EXISTS challenge_entries_insert ON public.challenge_entries;
DROP POLICY IF EXISTS challenge_entries_read ON public.challenge_entries;

REVOKE ALL ON public.challenge_entries FROM anon;
GRANT SELECT, INSERT, DELETE ON public.challenge_entries TO authenticated;
GRANT ALL ON public.challenge_entries TO service_role;

ALTER TABLE public.challenge_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY challenge_entries_select_own ON public.challenge_entries
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin(auth.uid()) OR public.is_super_admin(auth.uid()));

CREATE POLICY challenge_entries_insert_own ON public.challenge_entries
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY challenge_entries_delete_own ON public.challenge_entries
  FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR public.is_super_admin(auth.uid()));