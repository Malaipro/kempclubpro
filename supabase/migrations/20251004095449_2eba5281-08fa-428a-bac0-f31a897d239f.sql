-- Create a public-safe view for testimonials that only exposes masked names
CREATE OR REPLACE VIEW public.public_testimonials AS
SELECT 
  id,
  display_name,
  participant_title,
  content,
  video_url,
  image_url,
  is_active,
  sort_order,
  created_at,
  updated_at
FROM public.testimonials
WHERE is_active = true;

-- Grant public access to the view
GRANT SELECT ON public.public_testimonials TO anon, authenticated;

-- Update the RLS policy on testimonials to be more restrictive
-- Remove public access to the main table
DROP POLICY IF EXISTS "Public can view active testimonials limited data" ON public.testimonials;

-- Only admins can access the main testimonials table with full data
-- Public users should use the public_testimonials view instead