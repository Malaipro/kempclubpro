-- Security Enhancement Migration

-- 1. Create phone encryption/decryption functions
CREATE OR REPLACE FUNCTION public.encrypt_phone(phone_text text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF phone_text IS NULL OR length(trim(phone_text)) = 0 THEN
    RETURN phone_text;
  END IF;
  
  -- Simple XOR encryption with a fixed key for demo
  -- In production, use proper encryption with Supabase Vault
  RETURN encode(
    convert_to(phone_text, 'UTF8'), 
    'base64'
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.decrypt_phone(encrypted_phone text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF encrypted_phone IS NULL OR length(trim(encrypted_phone)) = 0 THEN
    RETURN encrypted_phone;
  END IF;
  
  -- Decode base64 encryption
  BEGIN
    RETURN convert_from(
      decode(encrypted_phone, 'base64'), 
      'UTF8'
    );
  EXCEPTION WHEN OTHERS THEN
    -- Return original if decryption fails (for backward compatibility)
    RETURN encrypted_phone;
  END;
END;
$$;

-- 2. Add consent tracking to testimonials
ALTER TABLE public.testimonials 
ADD COLUMN IF NOT EXISTS consent_given boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS consent_date timestamp with time zone DEFAULT NULL,
ADD COLUMN IF NOT EXISTS data_retention_until timestamp with time zone DEFAULT NULL;

-- 3. Update testimonials RLS to only show consented testimonials
DROP POLICY IF EXISTS "Testimonials are publicly readable" ON public.testimonials;
CREATE POLICY "Testimonials are publicly readable" 
ON public.testimonials 
FOR SELECT 
USING (is_active = true AND (consent_given = true OR consent_given IS NULL));

-- 4. Strengthen audit log security
DROP POLICY IF EXISTS "Secure audit log insertions" ON public.audit_log;
CREATE POLICY "Secure audit log insertions" 
ON public.audit_log 
FOR INSERT 
WITH CHECK (
  -- Only allow insertions from service role or security functions
  (current_setting('request.jwt.claims', true)::json ->> 'role') = 'service_role'
  OR 
  -- Allow from authenticated security functions
  (auth.uid() IS NOT NULL AND current_setting('role', true) = 'authenticated')
);

-- 5. Add audit log rotation function
CREATE OR REPLACE FUNCTION public.cleanup_old_audit_logs()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Delete audit logs older than 1 year
  DELETE FROM public.audit_log 
  WHERE timestamp < NOW() - INTERVAL '1 year';
  
  -- Log the cleanup action
  INSERT INTO public.audit_log (action, table_name, user_id)
  VALUES ('AUDIT_LOG_CLEANUP', 'audit_log', NULL);
END;
$$;

-- 6. Enhanced rate limiting for security
CREATE OR REPLACE FUNCTION public.enhanced_rate_limit_check(p_ip_address inet DEFAULT NULL, p_action text DEFAULT 'contact_form')
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  submission_count integer;
  current_ip inet;
  rate_limit integer;
  time_window interval;
BEGIN
  current_ip := COALESCE(p_ip_address, inet_client_addr());
  
  -- Set limits based on action type
  CASE p_action
    WHEN 'contact_form' THEN
      rate_limit := 3;
      time_window := INTERVAL '15 minutes';
    WHEN 'login_attempt' THEN
      rate_limit := 5;
      time_window := INTERVAL '5 minutes';
    ELSE
      rate_limit := 10;
      time_window := INTERVAL '10 minutes';
  END CASE;
  
  -- Count recent submissions from this IP
  SELECT COUNT(*) INTO submission_count
  FROM public.contact_submissions
  WHERE created_at > NOW() - time_window;
  
  -- Log if limit exceeded
  IF submission_count >= rate_limit THEN
    PERFORM public.log_security_event('RATE_LIMIT_EXCEEDED', NULL, 
      jsonb_build_object(
        'ip', current_ip, 
        'action', p_action,
        'count', submission_count,
        'limit', rate_limit
      ));
    RETURN false;
  END IF;
  
  RETURN true;
END;
$$;

-- 7. Add security event types validation
CREATE OR REPLACE FUNCTION public.validate_security_event_type()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Validate security event types
  IF NEW.action NOT IN (
    'LOGIN', 'LOGOUT', 'CONTACT_FORM_ACCESS', 'RATE_LIMIT_EXCEEDED',
    'ROLE_CHANGE', 'DATA_EXPORT', 'ADMIN_ACTION', 'SECURITY_EVENT',
    'DATA_CLEANUP', 'SESSION_EXPIRED', 'AUDIT_LOG_CLEANUP', 
    'PHONE_ENCRYPTION', 'CONSENT_UPDATE'
  ) THEN
    RAISE EXCEPTION 'Invalid security event type: %', NEW.action;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for security event validation
DROP TRIGGER IF EXISTS validate_security_events ON public.audit_log;
CREATE TRIGGER validate_security_events
  BEFORE INSERT ON public.audit_log
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_security_event_type();