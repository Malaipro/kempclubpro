DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
    CREATE TYPE public.app_role AS ENUM ('admin', 'user');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'activity_type_new') THEN
    CREATE TYPE public.activity_type_new AS ENUM ('training', 'lecture', 'homework', 'crash_test_bjj', 'crash_test_kick', 'heroes_race', 'tactics', 'ascetic');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'lecture_subtype') THEN
    CREATE TYPE public.lecture_subtype AS ENUM ('kemp', 'nutrition', 'psychology', 'philosophy', 'leadership', 'tactics');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'reward_type') THEN
    CREATE TYPE public.reward_type AS ENUM ('zakal', 'gran', 'shram');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'shram_subtype') THEN
    CREATE TYPE public.shram_subtype AS ENUM ('bjj', 'kick', 'ofp', 'tactics');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'training_subtype') THEN
    CREATE TYPE public.training_subtype AS ENUM ('bjj', 'kick', 'ofp');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'zakal_subtype') THEN
    CREATE TYPE public.zakal_subtype AS ENUM ('bjj', 'kick', 'ofp');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.achievement_types (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  color TEXT NOT NULL,
  icon TEXT NOT NULL,
  shape TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Note: activities already exists, but we'll ensure it has the expected columns if needed. 
-- For now, we follow migration_export.sql structure.
CREATE TABLE IF NOT EXISTS public.admin_access_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_user_id UUID,
  table_name TEXT NOT NULL,
  action TEXT NOT NULL,
  ip_address INET,
  user_agent TEXT,
  accessed_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.contact_rate_limit (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ip_address INET NOT NULL,
  submission_count INTEGER DEFAULT 1,
  window_start TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.intensive_streams (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_current BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Cyrillic tables
CREATE TABLE IF NOT EXISTS public."участники" (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  name TEXT NOT NULL,
  last_name TEXT,
  email TEXT,
  birth_date DATE,
  height_cm INTEGER,
  weight_kg INTEGER,
  points INTEGER NOT NULL DEFAULT 0,
  stream_id UUID REFERENCES public.intensive_streams(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public."кэмп_активности" (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  participant_id UUID NOT NULL REFERENCES public."участники"(id),
  activity_type_new activity_type_new,
  reward_type reward_type NOT NULL,
  zakal_subtype zakal_subtype,
  shram_subtype shram_subtype,
  training_subtype training_subtype,
  lecture_subtype lecture_subtype,
  points INTEGER NOT NULL DEFAULT 1,
  multiplier NUMERIC DEFAULT 1.0,
  auto_points INTEGER DEFAULT 1,
  activity_date DATE NOT NULL DEFAULT CURRENT_DATE,
  description TEXT,
  verified_by TEXT,
  attendance_counted BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public."аскезы_участников" (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  participant_id UUID NOT NULL REFERENCES public."участники"(id),
  name TEXT NOT NULL,
  description TEXT,
  duration_days INTEGER NOT NULL DEFAULT 14,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_completed BOOLEAN DEFAULT false,
  completion_percentage INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public."тотемы_участников" (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  participant_id UUID NOT NULL REFERENCES public."участники"(id),
  totem_type totem_type NOT NULL,
  requirements_met JSONB,
  earned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Functions and Triggers
CREATE OR REPLACE FUNCTION public.handle_new_user_participant()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public."участники" (user_id, name, last_name, points)
  VALUES (
    NEW.id, 
    COALESCE(NEW.raw_user_meta_data->>'name', 'Новый участник'),
    COALESCE(NEW.raw_user_meta_data->>'lastName', ''),
    0
  );
  RETURN NEW;
END;
$function$;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS on_auth_user_participant_created ON auth.users;
CREATE TRIGGER on_auth_user_participant_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_participant();

-- RLS Enable
ALTER TABLE public.achievement_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_access_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_rate_limit ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.intensive_streams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."участники" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."кэмп_активности" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."аскезы_участников" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."тотемы_участников" ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Allow public read access for achievement_types" ON public.achievement_types FOR SELECT USING (true);
CREATE POLICY "Allow public read access for active streams" ON public.intensive_streams FOR SELECT USING (is_active = true);

CREATE POLICY "Users can view their own participant" ON public."участники" FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update their own participant" ON public."участники" FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own kamp activities" ON public."кэмп_активности" FOR SELECT USING (participant_id IN (SELECT id FROM public."участники" WHERE user_id = auth.uid()));
CREATE POLICY "Users can manage their own ascetics" ON public."аскезы_участников" FOR ALL USING (participant_id IN (SELECT id FROM public."участники" WHERE user_id = auth.uid()));
CREATE POLICY "Users can view their own totems" ON public."тотемы_участников" FOR SELECT USING (participant_id IN (SELECT id FROM public."участники" WHERE user_id = auth.uid()));
