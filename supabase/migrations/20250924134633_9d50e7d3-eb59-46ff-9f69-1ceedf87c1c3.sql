-- Fix security issue: Add explicit denial policy for public read access to contact_submissions
-- This ensures that personal data (phone numbers, messages) cannot be accessed by unauthorized users

-- Drop and recreate the admin-only SELECT policy to make it more explicit
DROP POLICY IF EXISTS "Contact submissions are viewable by admins" ON public.contact_submissions;

-- Create explicit denial policy for public read access
CREATE POLICY "Deny public read access to contact submissions"
ON public.contact_submissions
FOR SELECT
TO anon, authenticated
USING (false);

-- Recreate admin-only SELECT policy with higher priority
CREATE POLICY "Admin only read access to contact submissions"  
ON public.contact_submissions
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 
    FROM public.user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.role IN ('admin', 'super_admin')
  )
);

-- Ensure the INSERT policy is secure (only allow contact form submissions)
DROP POLICY IF EXISTS "Anyone can create contact submissions" ON public.contact_submissions;

CREATE POLICY "Allow contact form submissions"
ON public.contact_submissions  
FOR INSERT
TO anon, authenticated
WITH CHECK (
  -- Basic validation: ensure required fields are present
  name IS NOT NULL 
  AND phone IS NOT NULL 
  AND course IS NOT NULL
  AND length(name) <= 100
  AND length(phone) <= 20
  AND length(course) <= 100
);