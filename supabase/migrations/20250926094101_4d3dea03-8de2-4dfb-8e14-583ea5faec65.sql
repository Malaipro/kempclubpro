-- Update testimonials table to support video URLs and make content optional
ALTER TABLE public.testimonials 
ALTER COLUMN content DROP NOT NULL;

-- Add comments for clarity
COMMENT ON COLUMN public.testimonials.video_url IS 'URL to video testimonial (YouTube, Vimeo, etc.)';
COMMENT ON COLUMN public.testimonials.content IS 'Optional text content of the testimonial';