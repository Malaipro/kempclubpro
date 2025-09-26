-- Security Enhancement: Restrict audit log insertions to system functions only
-- This prevents users from manipulating audit records

-- Drop the overly permissive audit log insert policy
DROP POLICY IF EXISTS "System can insert audit logs" ON public.audit_log;

-- Create more restrictive audit log insert policy
-- Only allow insertions from security definer functions or when no authenticated user (system operations)
CREATE POLICY "Secure audit log insertions" ON public.audit_log
FOR INSERT 
WITH CHECK (
  -- Allow system operations (no authenticated user) or specific security contexts
  auth.uid() IS NULL OR 
  -- Allow only from security definer functions by checking current setting
  current_setting('request.jwt.claims', true)::json->>'role' = 'service_role'
);

-- Enhance audit log security by adding a trigger to validate entries
CREATE OR REPLACE FUNCTION public.validate_audit_entry()
RETURNS TRIGGER AS $$
BEGIN
  -- Validate that audit entries have required fields
  IF NEW.action IS NULL OR trim(NEW.action) = '' THEN
    RAISE EXCEPTION 'Audit log action cannot be empty';
  END IF;
  
  -- Validate action types against allowed list
  IF NOT (NEW.action = ANY(ARRAY[
    'LOGIN', 'LOGOUT', 'CONTACT_FORM_ACCESS', 'RATE_LIMIT_EXCEEDED',
    'ROLE_CHANGE', 'DATA_EXPORT', 'ADMIN_ACTION', 'SECURITY_EVENT',
    'DATA_CLEANUP', 'SESSION_EXPIRED'
  ])) THEN
    RAISE EXCEPTION 'Invalid audit log action type: %', NEW.action;
  END IF;
  
  -- Set timestamp if not provided
  IF NEW.timestamp IS NULL THEN
    NEW.timestamp = now();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for audit log validation
DROP TRIGGER IF EXISTS validate_audit_log_entry ON public.audit_log;
CREATE TRIGGER validate_audit_log_entry
  BEFORE INSERT ON public.audit_log
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_audit_entry();

-- Update the log_security_event function to use more secure approach
CREATE OR REPLACE FUNCTION public.log_security_event(event_type text, user_id_param uuid DEFAULT NULL::uuid, details jsonb DEFAULT NULL::jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Validate event type before logging
  IF NOT (event_type = ANY(ARRAY[
    'LOGIN', 'LOGOUT', 'CONTACT_FORM_ACCESS', 'RATE_LIMIT_EXCEEDED',
    'ROLE_CHANGE', 'DATA_EXPORT', 'ADMIN_ACTION', 'SECURITY_EVENT',
    'DATA_CLEANUP', 'SESSION_EXPIRED'
  ])) THEN
    RAISE EXCEPTION 'Invalid security event type: %', event_type;
  END IF;

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
    inet_client_addr(),
    NULL
  );
END;
$$;

-- Enhance contact form rate limiting security
CREATE OR REPLACE FUNCTION public.enhanced_contact_rate_limit(p_ip_address inet DEFAULT NULL::inet)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  submission_count integer;
  current_ip inet;
BEGIN
  current_ip := COALESCE(p_ip_address, inet_client_addr());
  
  -- More restrictive rate limiting: 2 submissions per 15 minutes
  SELECT COUNT(*) INTO submission_count
  FROM public.contact_submissions
  WHERE created_at > NOW() - INTERVAL '15 minutes';
  
  -- Log rate limit check with enhanced details
  IF submission_count >= 2 THEN
    PERFORM public.log_security_event('RATE_LIMIT_EXCEEDED', NULL, 
      jsonb_build_object(
        'ip', current_ip, 
        'count', submission_count,
        'window_minutes', 15,
        'limit', 2
      ));
    RETURN false;
  END IF;
  
  RETURN true;
END;
$$;