-- Create a public view for participants visible on the site (no approval required)
CREATE OR REPLACE VIEW public.public_profiles AS
SELECT 
  id,
  user_id,
  display_name,
  first_name,
  last_name,
  total_points,
  rank_position
FROM public.profiles
WHERE COALESCE(leaderboard_visible, true) = true AND COALESCE(profile_private, false) = false;

-- Grant read access to anonymous and authenticated users
GRANT SELECT ON public.public_profiles TO anon, authenticated;