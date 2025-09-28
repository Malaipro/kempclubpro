-- Update the public view to only show approved participants
DROP VIEW IF EXISTS public.public_profiles;

CREATE VIEW public.public_profiles AS
SELECT 
  id,
  user_id,
  display_name,
  first_name,
  last_name,
  total_points,
  rank_position
FROM public.profiles
WHERE approved = true 
  AND COALESCE(leaderboard_visible, true) = true 
  AND COALESCE(profile_private, false) = false;

-- Grant read access to anonymous and authenticated users
GRANT SELECT ON public.public_profiles TO anon, authenticated;