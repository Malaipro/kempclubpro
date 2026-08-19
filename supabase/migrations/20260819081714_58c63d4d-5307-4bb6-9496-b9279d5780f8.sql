CREATE UNIQUE INDEX IF NOT EXISTS mastermind_members_user_group_uniq ON public.mastermind_members (user_id, group_id);

CREATE POLICY "admins_insert_any_participation"
ON public.schedule_participants
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = ANY (ARRAY['admin'::user_role, 'super_admin'::user_role, 'trainer'::user_role])
  )
);