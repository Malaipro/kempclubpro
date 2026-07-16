-- Isolated enum extension. ALTER TYPE ADD VALUE cannot be used in the same
-- transaction as the new value. This migration only adds values; usage comes later.
ALTER TYPE public.participant_status_type ADD VALUE IF NOT EXISTS 'intensive_failed';
ALTER TYPE public.participant_status_type ADD VALUE IF NOT EXISTS 'trial_visit';
ALTER TYPE public.participant_status_type ADD VALUE IF NOT EXISTS 'intensive_dropped';