-- Create security definer function to check if participant is public
CREATE OR REPLACE FUNCTION public.is_public_participant(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE user_id = _user_id
      AND approved = true
      AND leaderboard_visible = true
      AND profile_private = false
  );
$$;

-- Drop existing public policies
DROP POLICY IF EXISTS "Anon can view totems of approved participants" ON public.user_totems;
DROP POLICY IF EXISTS "Anon can view crash tests of approved participants" ON public.crash_tests;

-- Create new policies using the function
CREATE POLICY "Public can view totems of approved participants"
ON public.user_totems
FOR SELECT
TO anon, authenticated
USING (public.is_public_participant(user_id));

CREATE POLICY "Public can view crash tests of approved participants"
ON public.crash_tests
FOR SELECT
TO anon, authenticated
USING (verified = true AND public.is_public_participant(user_id));