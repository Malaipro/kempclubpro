-- Drop existing public read policy
DROP POLICY IF EXISTS "Testimonials are publicly readable" ON public.testimonials;

-- Create new policy that allows public to view active testimonials
CREATE POLICY "Public can view active testimonials"
  ON public.testimonials
  FOR SELECT
  TO public
  USING (is_active = true);