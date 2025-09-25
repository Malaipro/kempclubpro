-- Add new fields to profiles table for participant management
ALTER TABLE public.profiles 
ADD COLUMN height_cm integer,
ADD COLUMN weight_kg integer,
ADD COLUMN date_of_birth date;

-- Add a comment to document the new fields
COMMENT ON COLUMN public.profiles.height_cm IS 'Height in centimeters';
COMMENT ON COLUMN public.profiles.weight_kg IS 'Weight in kilograms';
COMMENT ON COLUMN public.profiles.date_of_birth IS 'Date of birth for age calculation';