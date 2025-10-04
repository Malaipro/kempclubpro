-- Recreate the view with SECURITY INVOKER to avoid the security warning
DROP VIEW IF EXISTS public.public_testimonials;

CREATE VIEW public.public_testimonials
WITH (security_invoker=true)
AS
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