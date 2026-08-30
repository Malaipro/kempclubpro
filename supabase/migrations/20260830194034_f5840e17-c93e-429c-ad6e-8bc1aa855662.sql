CREATE POLICY "Captains see team summaries"
ON public.weekly_summaries
FOR SELECT
TO authenticated
USING (
  user_id IN (
    SELECT ctm.user_id
    FROM public.captain_team_members ctm
    JOIN public.captain_teams ct ON ct.id = ctm.team_id
    WHERE ct.captain_user_id = auth.uid()
  )
);