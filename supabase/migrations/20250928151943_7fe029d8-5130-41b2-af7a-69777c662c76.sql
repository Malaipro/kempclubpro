-- Add missing RLS policies for ascetic_activities table to allow admins to create and manage ascetic activities

-- Allow admins to create ascetic activities for any participant
CREATE POLICY "Admins can create ascetic activities for any participant" 
ON public.ascetic_activities 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM user_roles
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.role = ANY (ARRAY['admin'::user_role, 'super_admin'::user_role])
  )
);

-- Allow admins to update (verify) ascetic activities
CREATE POLICY "Admins can update ascetic activities" 
ON public.ascetic_activities 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1
    FROM user_roles
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.role = ANY (ARRAY['admin'::user_role, 'super_admin'::user_role, 'trainer'::user_role])
  )
);