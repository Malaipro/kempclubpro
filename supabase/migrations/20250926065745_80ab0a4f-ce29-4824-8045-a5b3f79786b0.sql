-- Fix the function security warning by setting proper search_path
CREATE OR REPLACE FUNCTION public.calculate_cooper_fitness_level(total_seconds INTEGER)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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