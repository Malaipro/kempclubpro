-- Update Cooper test results table to store 4 exercises with time results instead of distance
-- Remove the old distance and time_minutes columns and add exercise times

ALTER TABLE public.cooper_test_results 
DROP COLUMN IF EXISTS distance,
DROP COLUMN IF EXISTS time_minutes;

-- Add columns for 4 exercises (time in seconds for each exercise)
ALTER TABLE public.cooper_test_results 
ADD COLUMN exercise_1_time INTEGER, -- Упражнение 1 (время в секундах)
ADD COLUMN exercise_2_time INTEGER, -- Упражнение 2 (время в секундах)  
ADD COLUMN exercise_3_time INTEGER, -- Упражнение 3 (время в секундах)
ADD COLUMN exercise_4_time INTEGER, -- Упражнение 4 (время в секундах)
ADD COLUMN total_time INTEGER GENERATED ALWAYS AS (
  COALESCE(exercise_1_time, 0) + 
  COALESCE(exercise_2_time, 0) + 
  COALESCE(exercise_3_time, 0) + 
  COALESCE(exercise_4_time, 0)
) STORED; -- Общее время (автоматически вычисляется)

-- Update the fitness_level calculation to be based on total time
CREATE OR REPLACE FUNCTION public.calculate_cooper_fitness_level(total_seconds INTEGER)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
BEGIN
  -- Fitness levels based on total time for 4 exercises
  IF total_seconds IS NULL THEN
    RETURN 'unknown';
  ELSIF total_seconds <= 600 THEN -- 10 minutes or less
    RETURN 'excellent';
  ELSIF total_seconds <= 900 THEN -- 15 minutes or less
    RETURN 'good';
  ELSIF total_seconds <= 1200 THEN -- 20 minutes or less
    RETURN 'satisfactory';
  ELSE
    RETURN 'poor';
  END IF;
END;
$$;