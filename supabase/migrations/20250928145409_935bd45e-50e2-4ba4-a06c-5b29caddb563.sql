-- Fix Cooper test structure - handle dependencies properly
-- First drop the computed column total_time to remove dependencies
ALTER TABLE cooper_test_results DROP COLUMN IF EXISTS total_time CASCADE;

-- Now we can safely drop the individual exercise columns
ALTER TABLE cooper_test_results 
DROP COLUMN IF EXISTS exercise_1_time,
DROP COLUMN IF EXISTS exercise_2_time,
DROP COLUMN IF EXISTS exercise_3_time,
DROP COLUMN IF EXISTS exercise_4_time;

-- Add minutes and seconds fields for total time
ALTER TABLE cooper_test_results 
ADD COLUMN IF NOT EXISTS total_minutes INTEGER,
ADD COLUMN IF NOT EXISTS total_seconds INTEGER,
ADD COLUMN IF NOT EXISTS total_time INTEGER;

-- Create function to calculate fitness level based on total time in minutes
CREATE OR REPLACE FUNCTION public.calculate_cooper_fitness_level_minutes(total_minutes integer)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF total_minutes IS NULL THEN
    RETURN 'unknown';
  ELSIF total_minutes <= 3 THEN -- 3 minutes or less
    RETURN 'excellent';
  ELSIF total_minutes <= 4 THEN -- 4 minutes or less
    RETURN 'good';
  ELSIF total_minutes <= 5 THEN -- 5 minutes or less
    RETURN 'satisfactory';
  ELSE
    RETURN 'poor';
  END IF;
END;
$function$;

-- Create trigger to update leaderboard when ascetic activities are verified
CREATE OR REPLACE FUNCTION public.update_leaderboard_on_ascetic()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Only update when verification status changes to true
  IF TG_OP = 'UPDATE' AND NEW.verified = true AND (OLD.verified IS NULL OR OLD.verified = false) THEN
    PERFORM update_user_leaderboard(NEW.user_id);
  ELSIF TG_OP = 'UPDATE' AND NEW.verified = false AND OLD.verified = true THEN
    PERFORM update_user_leaderboard(NEW.user_id);
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$function$;

-- Create trigger for ascetic activities
DROP TRIGGER IF EXISTS trigger_update_leaderboard_ascetic ON ascetic_activities;
CREATE TRIGGER trigger_update_leaderboard_ascetic
  AFTER UPDATE ON ascetic_activities
  FOR EACH ROW
  EXECUTE FUNCTION update_leaderboard_on_ascetic();

-- Add stream selection to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS current_stream_id UUID REFERENCES streams(id);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_current_stream ON profiles(current_stream_id);
CREATE INDEX IF NOT EXISTS idx_cooper_test_user_phase ON cooper_test_results(user_id, test_phase);