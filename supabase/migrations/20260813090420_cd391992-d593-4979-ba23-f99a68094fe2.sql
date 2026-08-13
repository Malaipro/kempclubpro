CREATE POLICY "je_captain_read" ON public.journal_entries
FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.captain_team_members ctm
  JOIN public.captain_teams ct ON ct.id = ctm.team_id
  WHERE ctm.user_id = journal_entries.user_id AND ct.captain_user_id = auth.uid()
));

CREATE POLICY "ja_captain_read" ON public.journal_answers
FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.journal_entries e
  JOIN public.captain_team_members ctm ON ctm.user_id = e.user_id
  JOIN public.captain_teams ct ON ct.id = ctm.team_id
  WHERE e.id = journal_answers.entry_id AND ct.captain_user_id = auth.uid()
));