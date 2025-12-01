CREATE POLICY users_delete_own_participation
ON schedule_participants
FOR DELETE
USING (auth.uid() = user_id);

CREATE POLICY admins_delete_any_participation
ON schedule_participants
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role IN ('admin', 'super_admin', 'trainer')
  )
);