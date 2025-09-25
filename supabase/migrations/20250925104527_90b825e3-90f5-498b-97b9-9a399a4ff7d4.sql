-- Enhanced security measures for contact form data
-- Add data retention policy trigger
CREATE OR REPLACE FUNCTION public.auto_delete_old_contact_submissions()
RETURNS trigger AS $$
BEGIN
  -- Delete contact submissions older than 90 days
  DELETE FROM public.contact_submissions 
  WHERE created_at < NOW() - INTERVAL '90 days';
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to run cleanup daily
DROP TRIGGER IF EXISTS cleanup_old_contact_submissions ON public.contact_submissions;
CREATE TRIGGER cleanup_old_contact_submissions
  AFTER INSERT ON public.contact_submissions
  EXECUTE FUNCTION public.auto_delete_old_contact_submissions();

-- Enhanced security function to mask sensitive data
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add index for better performance on contact submissions cleanup
CREATE INDEX IF NOT EXISTS idx_contact_submissions_created_at 
ON public.contact_submissions(created_at);

-- Enhanced RLS policy for contact submissions with better audit trail
DROP POLICY IF EXISTS "Admins can update contact submissions" ON public.contact_submissions;
CREATE POLICY "Admins can update contact submissions" 
ON public.contact_submissions 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('admin', 'super_admin')
  )
)
WITH CHECK (
  -- Ensure processed_by is set when marking as processed
  (processed = true AND processed_by = auth.uid()) OR 
  (processed = false)
);

-- Add logging for sensitive operations
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create audit log table for security events
CREATE TABLE IF NOT EXISTS public.audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  action TEXT NOT NULL,
  table_name TEXT,
  record_id UUID,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ip_address INET,
  user_agent TEXT
);

-- Enable RLS on audit log
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- Only super admins can view audit logs
CREATE POLICY "Super admins can view audit logs"
ON public.audit_log
FOR SELECT
USING (public.is_super_admin(auth.uid()));

-- System can insert audit logs
CREATE POLICY "System can insert audit logs"
ON public.audit_log
FOR INSERT
WITH CHECK (true);