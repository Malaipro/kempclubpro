-- Security Enhancement Migration
-- Add explicit security policies and functions for enhanced protection

-- Create secure contact form validation function
CREATE OR REPLACE FUNCTION public.validate_contact_submission(
  p_name text,
  p_phone text,
  p_course text,
  p_social text DEFAULT NULL
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Validate name (2-100 chars, letters, spaces, hyphens only)
  IF p_name IS NULL OR length(trim(p_name)) < 2 OR length(trim(p_name)) > 100 THEN
    RETURN false;
  END IF;
  
  IF NOT (trim(p_name) ~ '^[А-Яа-яA-Za-z\s\-'']+$') THEN
    RETURN false;
  END IF;
  
  -- Validate phone (10-20 chars, numbers, +, -, spaces, parentheses only)
  IF p_phone IS NULL OR length(trim(p_phone)) < 10 OR length(trim(p_phone)) > 20 THEN
    RETURN false;
  END IF;
  
  IF NOT (trim(p_phone) ~ '^[\+\d\s\-\(\)]+$') THEN
    RETURN false;
  END IF;
  
  -- Validate course (not empty, max 100 chars)
  IF p_course IS NULL OR length(trim(p_course)) = 0 OR length(trim(p_course)) > 100 THEN
    RETURN false;
  END IF;
  
  -- Validate social if provided (max 200 chars)
  IF p_social IS NOT NULL AND length(trim(p_social)) > 200 THEN
    RETURN false;
  END IF;
  
  RETURN true;
END;
$$;

-- Enhanced contact submissions policy with validation
DROP POLICY IF EXISTS "Allow contact form submissions" ON public.contact_submissions;
CREATE POLICY "Allow validated contact form submissions" ON public.contact_submissions
FOR INSERT 
TO public
WITH CHECK (
  -- Use validation function
  public.validate_contact_submission(name, phone, course, social) AND
  -- Additional length checks as backup
  length(name) <= 100 AND 
  length(phone) <= 20 AND 
  length(course) <= 100 AND
  (social IS NULL OR length(social) <= 200)
);

-- Add explicit deny policy for profiles table public access
CREATE POLICY "Explicitly deny public access to profiles" ON public.profiles
FOR ALL
TO public
USING (false)
WITH CHECK (false);

-- Create security audit function for sensitive operations
CREATE OR REPLACE FUNCTION public.log_security_event(
  event_type text,
  user_id_param uuid DEFAULT NULL,
  details jsonb DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.audit_log (
    user_id,
    action,
    table_name,
    record_id,
    ip_address,
    user_agent
  ) VALUES (
    COALESCE(user_id_param, auth.uid()),
    event_type,
    'security_events',
    NULL,
    NULL,
    NULL
  );
END;
$$;

-- Add rate limiting enhancement for contact forms
CREATE OR REPLACE FUNCTION public.enhanced_contact_rate_limit(
  p_ip_address inet DEFAULT NULL
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  submission_count integer;
  current_ip inet;
BEGIN
  current_ip := COALESCE(p_ip_address, inet_client_addr());
  
  -- Check submissions in last 10 minutes (more restrictive)
  SELECT COUNT(*) INTO submission_count
  FROM public.contact_submissions
  WHERE created_at > NOW() - INTERVAL '10 minutes';
  
  -- Log rate limit check
  IF submission_count >= 3 THEN
    PERFORM public.log_security_event('RATE_LIMIT_EXCEEDED', NULL, 
      jsonb_build_object('ip', current_ip, 'count', submission_count));
    RETURN false;
  END IF;
  
  RETURN true;
END;
$$;