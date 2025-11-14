-- Add stream_id column to schedules table to link schedules with streams
ALTER TABLE public.schedules 
ADD COLUMN stream_id UUID REFERENCES public.streams(id) ON DELETE SET NULL;

-- Create index for better query performance when filtering by stream
CREATE INDEX idx_schedules_stream_id ON public.schedules(stream_id);

-- Add comment for documentation
COMMENT ON COLUMN public.schedules.stream_id IS 'Reference to the stream (поток) this schedule belongs to. NULL for schedules not assigned to any stream.';