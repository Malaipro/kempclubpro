-- Drop old policy that uses direct EXISTS query to user_roles
DROP POLICY IF EXISTS "Trainers can manage schedules" ON schedules;

-- Create new policy using security definer functions
-- This allows admins, super_admins, and trainers to manage schedules
CREATE POLICY "Admins and trainers can manage schedules"
ON schedules
FOR ALL
TO authenticated
USING (
  is_admin(auth.uid()) OR 
  has_role(auth.uid(), 'trainer'::user_role)
)
WITH CHECK (
  is_admin(auth.uid()) OR 
  has_role(auth.uid(), 'trainer'::user_role)
);