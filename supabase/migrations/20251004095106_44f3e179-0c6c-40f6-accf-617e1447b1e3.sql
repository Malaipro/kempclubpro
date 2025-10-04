-- Create function to mask participant names (First Name + Last Initial)
CREATE OR REPLACE FUNCTION public.mask_participant_name(full_name text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  name_parts text[];
  first_name text;
  last_initial text;
BEGIN
  IF full_name IS NULL OR LENGTH(TRIM(full_name)) = 0 THEN
    RETURN 'Участник';
  END IF;
  
  -- Split name by spaces
  name_parts := string_to_array(TRIM(full_name), ' ');
  
  -- Get first name
  first_name := name_parts[1];
  
  -- Get last name initial if exists
  IF array_length(name_parts, 1) > 1 THEN
    last_initial := LEFT(name_parts[2], 1) || '.';
    RETURN first_name || ' ' || last_initial;
  ELSE
    RETURN first_name;
  END IF;
END;
$$;

-- Add display_name column to testimonials for cached masked names
ALTER TABLE public.testimonials 
ADD COLUMN IF NOT EXISTS display_name text;

-- Populate display_name with masked versions of existing names
UPDATE public.testimonials 
SET display_name = public.mask_participant_name(participant_name)
WHERE display_name IS NULL;

-- Create trigger to auto-generate display_name
CREATE OR REPLACE FUNCTION public.generate_display_name()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Auto-generate display_name if not provided
  IF NEW.display_name IS NULL OR NEW.display_name = '' THEN
    NEW.display_name := public.mask_participant_name(NEW.participant_name);
  END IF;
  RETURN NEW;
END;
$$;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS auto_generate_display_name ON public.testimonials;
CREATE TRIGGER auto_generate_display_name
  BEFORE INSERT OR UPDATE ON public.testimonials
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_display_name();

-- Update existing RLS policies
-- Drop old policy
DROP POLICY IF EXISTS "Public can view active testimonials" ON public.testimonials;

-- Admins can view full data including real names
CREATE POLICY "Admins can view all testimonial data"
  ON public.testimonials
  FOR SELECT
  USING (is_admin(auth.uid()));

-- Public can only see active testimonials (will use display_name in frontend)
CREATE POLICY "Public can view active testimonials limited data"
  ON public.testimonials
  FOR SELECT
  USING (is_active = true);