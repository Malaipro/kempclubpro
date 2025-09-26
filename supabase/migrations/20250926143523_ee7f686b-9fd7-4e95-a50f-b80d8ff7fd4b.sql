-- Allow admins to view and update all profiles
-- Adds missing RLS policies so admin UI can read/manage participants

-- Ensure RLS is enabled (already enabled in schema, but harmless if repeated)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Policy: Admins can view all profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'profiles' 
      AND policyname = 'Admins can view all profiles'
  ) THEN
    CREATE POLICY "Admins can view all profiles"
    ON public.profiles
    FOR SELECT
    USING (is_admin(auth.uid()));
  END IF;
END$$;

-- Policy: Admins can update any profile (needed for approvals)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'profiles' 
      AND policyname = 'Admins can update any profile'
  ) THEN
    CREATE POLICY "Admins can update any profile"
    ON public.profiles
    FOR UPDATE
    USING (is_admin(auth.uid()));
  END IF;
END$$;