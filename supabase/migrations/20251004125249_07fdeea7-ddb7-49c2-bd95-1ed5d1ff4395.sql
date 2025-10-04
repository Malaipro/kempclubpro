-- Create schedule_type enum
CREATE TYPE schedule_type AS ENUM ('intensive', 'club');

-- Add schedule_type column to schedules table
ALTER TABLE public.schedules
ADD COLUMN IF NOT EXISTS schedule_type schedule_type NOT NULL DEFAULT 'intensive';

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_schedules_type ON public.schedules(schedule_type);

-- Add comment for clarity
COMMENT ON COLUMN public.schedules.schedule_type IS 'Type of schedule: intensive (during stream) or club (after stream)';
