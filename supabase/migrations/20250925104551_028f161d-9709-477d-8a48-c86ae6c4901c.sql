-- Fix function search path security warnings
CREATE OR REPLACE FUNCTION public.auto_delete_old_contact_submissions()
RETURNS trigger AS $$
BEGIN
  -- Delete contact submissions older than 90 days
  DELETE FROM public.contact_submissions 
  WHERE created_at < NOW() - INTERVAL '90 days';
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';

CREATE OR REPLACE FUNCTION public.mask_phone_number(phone_number TEXT)
RETURNS TEXT AS $$
BEGIN
  IF phone_number IS NULL OR LENGTH(phone_number) < 6 THEN
    RETURN phone_number;
  END IF;
  
  -- Mask middle digits, keep first 2 and last 2
  RETURN SUBSTRING(phone_number FROM 1 FOR 2) || 
         REPEAT('*', GREATEST(0, LENGTH(phone_number) - 4)) || 
         RIGHT(phone_number, 2);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';

CREATE OR REPLACE FUNCTION public.log_contact_form_access()
RETURNS trigger AS $$
BEGIN
  -- Log when contact form data is accessed by admins
  IF TG_OP = 'SELECT' AND auth.uid() IS NOT NULL THEN
    INSERT INTO public.audit_log (
      user_id, 
      action, 
      table_name, 
      record_id, 
      timestamp
    ) VALUES (
      auth.uid(), 
      'CONTACT_FORM_ACCESS', 
      'contact_submissions', 
      NEW.id, 
      NOW()
    );
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';