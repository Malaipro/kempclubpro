-- Add participant_status and current_stream_id columns to public_profiles table
ALTER TABLE public.public_profiles 
ADD COLUMN IF NOT EXISTS participant_status participant_status_type,
ADD COLUMN IF NOT EXISTS current_stream_id uuid REFERENCES public.streams(id);

-- Update existing records in public_profiles with data from profiles
UPDATE public.public_profiles pp
SET 
  participant_status = p.participant_status,
  current_stream_id = p.current_stream_id
FROM public.profiles p
WHERE pp.user_id = p.user_id;

-- Update the sync_public_profiles trigger function to include new fields
CREATE OR REPLACE FUNCTION public.sync_public_profiles()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- On DELETE from profiles: remove from public_profiles
  IF TG_OP = 'DELETE' THEN
    DELETE FROM public.public_profiles WHERE id = OLD.id;
    RETURN OLD;
  END IF;

  -- Check visibility conditions on NEW row
  IF COALESCE(NEW.approved, false) = true
     AND COALESCE(NEW.leaderboard_visible, true) = true
     AND COALESCE(NEW.profile_private, false) = false THEN
    -- Upsert with new fields
    INSERT INTO public.public_profiles (
      id, user_id, display_name, first_name, last_name, 
      total_points, rank_position, participant_status, current_stream_id,
      created_at, updated_at
    ) VALUES (
      NEW.id, NEW.user_id, NEW.display_name, NEW.first_name, NEW.last_name,
      COALESCE(NEW.total_points, 0), COALESCE(NEW.rank_position, 0),
      NEW.participant_status, NEW.current_stream_id,
      now(), now()
    )
    ON CONFLICT (id) DO UPDATE SET
      user_id = EXCLUDED.user_id,
      display_name = EXCLUDED.display_name,
      first_name = EXCLUDED.first_name,
      last_name = EXCLUDED.last_name,
      total_points = EXCLUDED.total_points,
      rank_position = EXCLUDED.rank_position,
      participant_status = EXCLUDED.participant_status,
      current_stream_id = EXCLUDED.current_stream_id,
      updated_at = now();
  ELSE
    -- If no longer eligible, remove
    DELETE FROM public.public_profiles WHERE id = NEW.id;
  END IF;

  RETURN NEW;
END;
$$;