-- Add missing RLS policies for cooper_test_results to allow admins to create results for participants

-- Allow admins to create cooper test results for any participant
CREATE POLICY "Admins can create cooper test results for any participant" 
ON public.cooper_test_results 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM user_roles
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.role = ANY (ARRAY['admin'::user_role, 'super_admin'::user_role, 'trainer'::user_role])
  )
);

-- Allow admins to update (verify) cooper test results
CREATE POLICY "Admins can update cooper test results" 
ON public.cooper_test_results 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1
    FROM user_roles
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.role = ANY (ARRAY['admin'::user_role, 'super_admin'::user_role, 'trainer'::user_role])
  )
);