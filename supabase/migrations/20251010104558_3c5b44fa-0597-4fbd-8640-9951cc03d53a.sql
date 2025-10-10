-- UP: allow status action in audit validation + grant RPC execute
-- 1) Extend trigger validator whitelist
CREATE OR REPLACE FUNCTION public.validate_audit_entry()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Validate that audit entries have required fields
  IF NEW.action IS NULL OR trim(NEW.action) = '' THEN
    RAISE EXCEPTION 'Audit log action cannot be empty';
  END IF;
  
  -- Validate action types against allowed list
  IF NOT (NEW.action = ANY(ARRAY[
    'LOGIN', 'LOGOUT', 'CONTACT_FORM_ACCESS', 'RATE_LIMIT_EXCEEDED',
    'ROLE_CHANGE', 'DATA_EXPORT', 'ADMIN_ACTION', 'SECURITY_EVENT',
    'DATA_CLEANUP', 'SESSION_EXPIRED', 'AUDIT_LOG_CLEANUP', 
    'PHONE_ENCRYPTION', 'CONSENT_UPDATE', 'PARTICIPANT_STATUS_CHANGE'
  ])) THEN
    RAISE EXCEPTION 'Invalid audit log action type: %', NEW.action;
  END IF;
  
  -- Set timestamp if not provided
  IF NEW.timestamp IS NULL THEN
    NEW.timestamp = now();
  END IF;
  
  RETURN NEW;
END;
$function$;

-- 2) Keep log_security_event in sync (not strictly required for current path, but consistent)
CREATE OR REPLACE FUNCTION public.log_security_event(event_type text, user_id_param uuid DEFAULT NULL::uuid, details jsonb DEFAULT NULL::jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Validate event type before logging
  IF NOT (event_type = ANY(ARRAY[
    'LOGIN', 'LOGOUT', 'CONTACT_FORM_ACCESS', 'RATE_LIMIT_EXCEEDED',
    'ROLE_CHANGE', 'DATA_EXPORT', 'ADMIN_ACTION', 'SECURITY_EVENT',
    'DATA_CLEANUP', 'SESSION_EXPIRED', 'PARTICIPANT_STATUS_CHANGE'
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
$function$;

-- 3) Keep validate_audit_log_entry in sync as well
CREATE OR REPLACE FUNCTION public.validate_audit_log_entry(p_action text, p_table_name text, p_user_id uuid DEFAULT NULL::uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Validate action type
  IF p_action IS NULL OR length(trim(p_action)) = 0 THEN
    RETURN false;
  END IF;
  
  -- Validate action is from allowed list
  IF NOT (p_action = ANY(ARRAY[
    'LOGIN', 'LOGOUT', 'CONTACT_FORM_ACCESS', 'RATE_LIMIT_EXCEEDED',
    'ROLE_CHANGE', 'DATA_EXPORT', 'ADMIN_ACTION', 'SECURITY_EVENT',
    'DATA_CLEANUP', 'SESSION_EXPIRED', 'PARTICIPANT_STATUS_CHANGE'
  ])) THEN
    RETURN false;
  END IF;
  
  -- Validate table name if provided
  IF p_table_name IS NOT NULL AND length(trim(p_table_name)) = 0 THEN
    RETURN false;
  END IF;
  
  RETURN true;
END;
$function$;

-- 4) Ensure RPC is callable by authenticated (function itself checks is_admin())
GRANT EXECUTE ON FUNCTION public.update_participant_status(uuid, participant_status_type) TO authenticated;

-- DOWN: revert changes
-- Note: We restore original whitelists without PARTICIPANT_STATUS_CHANGE and revoke grant
-- (Exact earlier lists reconstructed from current project functions)
-- Use explicit drops/recreates to be deterministic

/*
-- DOWN SECTION (for manual rollback)
CREATE OR REPLACE FUNCTION public.validate_audit_entry()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.action IS NULL OR trim(NEW.action) = '' THEN
    RAISE EXCEPTION 'Audit log action cannot be empty';
  END IF;
  IF NOT (NEW.action = ANY(ARRAY[
    'LOGIN', 'LOGOUT', 'CONTACT_FORM_ACCESS', 'RATE_LIMIT_EXCEEDED',
    'ROLE_CHANGE', 'DATA_EXPORT', 'ADMIN_ACTION', 'SECURITY_EVENT',
    'DATA_CLEANUP', 'SESSION_EXPIRED', 'AUDIT_LOG_CLEANUP', 
    'PHONE_ENCRYPTION', 'CONSENT_UPDATE'
  ])) THEN
    RAISE EXCEPTION 'Invalid audit log action type: %', NEW.action;
  END IF;
  IF NEW.timestamp IS NULL THEN
    NEW.timestamp = now();
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.log_security_event(event_type text, user_id_param uuid DEFAULT NULL::uuid, details jsonb DEFAULT NULL::jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT (event_type = ANY(ARRAY[
    'LOGIN', 'LOGOUT', 'CONTACT_FORM_ACCESS', 'RATE_LIMIT_EXCEEDED',
    'ROLE_CHANGE', 'DATA_EXPORT', 'ADMIN_ACTION', 'SECURITY_EVENT',
    'DATA_CLEANUP', 'SESSION_EXPIRED'
  ])) THEN
    RAISE EXCEPTION 'Invalid security event type: %', event_type;
  END IF;
  INSERT INTO public.audit_log (
    user_id, action, table_name, record_id, ip_address, user_agent
  ) VALUES (
    COALESCE(user_id_param, auth.uid()), event_type, 'security_events', NULL, inet_client_addr(), NULL);
END;
$function$;

CREATE OR REPLACE FUNCTION public.validate_audit_log_entry(p_action text, p_table_name text, p_user_id uuid DEFAULT NULL::uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF p_action IS NULL OR length(trim(p_action)) = 0 THEN
    RETURN false;
  END IF;
  IF NOT (p_action = ANY(ARRAY[
    'LOGIN', 'LOGOUT', 'CONTACT_FORM_ACCESS', 'RATE_LIMIT_EXCEEDED',
    'ROLE_CHANGE', 'DATA_EXPORT', 'ADMIN_ACTION', 'SECURITY_EVENT',
    'DATA_CLEANUP', 'SESSION_EXPIRED'
  ])) THEN
    RETURN false;
  END IF;
  IF p_table_name IS NOT NULL AND length(trim(p_table_name)) = 0 THEN
    RETURN false;
  END IF;
  RETURN true;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.update_participant_status(uuid, participant_status_type) FROM authenticated;
*/