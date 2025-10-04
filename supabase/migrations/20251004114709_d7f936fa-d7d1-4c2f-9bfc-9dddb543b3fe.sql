-- Add color column to schedules table for visual customization
ALTER TABLE public.schedules 
ADD COLUMN IF NOT EXISTS color text DEFAULT '#6366f1';

COMMENT ON COLUMN public.schedules.color IS 'Color for visual representation of schedule items in hex format';