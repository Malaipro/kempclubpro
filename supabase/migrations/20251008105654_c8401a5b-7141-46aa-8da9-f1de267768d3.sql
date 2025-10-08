-- Fix RLS policies for profiles table to allow admin updates

-- Drop the overly restrictive deny policy
DROP POLICY IF EXISTS "Explicitly deny public access to profiles" ON public.profiles;

-- Create a proper restrictive policy that only blocks unauthenticated access
CREATE POLICY "Block anonymous access to profiles"
ON public.profiles
AS RESTRICTIVE
FOR ALL
TO anon
USING (false)
WITH CHECK (false);