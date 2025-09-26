-- Create enhanced phone masking function
CREATE OR REPLACE FUNCTION public.mask_phone_secure(phone_number text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF phone_number IS NULL OR LENGTH(phone_number) < 6 THEN
    RETURN phone_number;
  END IF;
  
  -- Enhanced masking: show country code and last 2 digits only
  IF phone_number LIKE '+%' THEN
    -- For international numbers like +1234567890 -> +12*****90
    RETURN SUBSTRING(phone_number FROM 1 FOR 3) || 
           REPEAT('*', GREATEST(0, LENGTH(phone_number) - 5)) || 
           RIGHT(phone_number, 2);
  ELSE
    -- For local numbers, mask middle section
    RETURN LEFT(phone_number, 2) || 
           REPEAT('*', GREATEST(0, LENGTH(phone_number) - 4)) || 
           RIGHT(phone_number, 2);
  END IF;
END;
$$;

-- Create enhanced email masking function
CREATE OR REPLACE FUNCTION public.mask_email_secure(email_address text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  at_pos integer;
  local_part text;
  domain_part text;
BEGIN
  IF email_address IS NULL OR email_address !~ '^[^@]+@[^@]+\.[^@]+$' THEN
    RETURN email_address;
  END IF;
  
  at_pos := POSITION('@' IN email_address);
  local_part := LEFT(email_address, at_pos - 1);
  domain_part := SUBSTRING(email_address FROM at_pos);
  
  -- Mask local part: show first 2 chars, mask middle, show last char before @
  IF LENGTH(local_part) <= 3 THEN
    RETURN LEFT(local_part, 1) || '***' || domain_part;
  ELSE
    RETURN LEFT(local_part, 2) || 
           REPEAT('*', GREATEST(1, LENGTH(local_part) - 3)) || 
           RIGHT(local_part, 1) || domain_part;
  END IF;
END;
$$;

-- Add validation function for audit log entries
CREATE OR REPLACE FUNCTION public.validate_audit_log_entry(
  p_action text,
  p_table_name text,
  p_user_id uuid DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Validate action type
  IF p_action IS NULL OR length(trim(p_action)) = 0 THEN
    RETURN false;
  END IF;
  
  -- Validate action is from allowed list
  IF NOT (p_action = ANY(ARRAY[
    'LOGIN', 'LOGOUT', 'CONTACT_FORM_ACCESS', 'RATE_LIMIT_EXCEEDED',
    'ROLE_CHANGE', 'DATA_EXPORT', 'ADMIN_ACTION', 'SECURITY_EVENT'
  ])) THEN
    RETURN false;
  END IF;
  
  -- Validate table name if provided
  IF p_table_name IS NOT NULL AND length(trim(p_table_name)) = 0 THEN
    RETURN false;
  END IF;
  
  RETURN true;
END;
$$;