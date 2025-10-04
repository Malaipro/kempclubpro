-- Create participant status enum
CREATE TYPE public.participant_status_type AS ENUM (
  'intensive_active',
  'intensive_completed', 
  'club_resident',
  'alumni'
);

-- Add status fields to profiles table
ALTER TABLE public.profiles 
ADD COLUMN participant_status participant_status_type DEFAULT 'intensive_active',
ADD COLUMN intensive_completed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN club_joined_at TIMESTAMP WITH TIME ZONE;

-- Create index for faster status queries
CREATE INDEX idx_profiles_participant_status ON public.profiles(participant_status);

-- Update all existing profiles to have intensive_active status
UPDATE public.profiles 
SET participant_status = 'intensive_active' 
WHERE participant_status IS NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.profiles.participant_status IS 'Current participant status: intensive_active (active in intensive), intensive_completed (finished intensive), club_resident (club member after intensive), alumni (graduated)';
COMMENT ON COLUMN public.profiles.intensive_completed_at IS 'Timestamp when participant completed the intensive program';
COMMENT ON COLUMN public.profiles.club_joined_at IS 'Timestamp when participant joined the club as a resident';

-- Create function to update participant status (only for admins)
CREATE OR REPLACE FUNCTION public.update_participant_status(
  p_user_id UUID,
  p_new_status participant_status_type
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only admins can update status
  IF NOT is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Only admins can update participant status';
  END IF;

  -- Update status and set timestamps
  UPDATE public.profiles
  SET 
    participant_status = p_new_status,
    intensive_completed_at = CASE 
      WHEN p_new_status = 'intensive_completed' AND intensive_completed_at IS NULL 
      THEN now() 
      ELSE intensive_completed_at 
    END,
    club_joined_at = CASE 
      WHEN p_new_status = 'club_resident' AND club_joined_at IS NULL 
      THEN now() 
      ELSE club_joined_at 
    END
  WHERE user_id = p_user_id;

  -- Log the status change
  INSERT INTO public.audit_log (user_id, action, table_name, record_id)
  VALUES (auth.uid(), 'PARTICIPANT_STATUS_CHANGE', 'profiles', p_user_id);
END;
$$;