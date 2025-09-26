-- Fix critical leaderboard security issue - require authentication
DROP POLICY IF EXISTS "Leaderboard is viewable by authenticated users" ON leaderboard;
CREATE POLICY "Authenticated users can view leaderboard" ON leaderboard 
FOR SELECT TO authenticated USING (true);

-- Add privacy controls to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS leaderboard_visible boolean DEFAULT true;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS profile_private boolean DEFAULT false;

-- Enhance leaderboard privacy with user preference
DROP POLICY IF EXISTS "Authenticated users can view leaderboard" ON leaderboard;
CREATE POLICY "Authenticated users can view public leaderboard entries" ON leaderboard 
FOR SELECT TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.user_id = leaderboard.user_id 
    AND profiles.leaderboard_visible = true
  ) OR leaderboard.user_id = auth.uid()
);

-- Add enhanced contact form data retention
CREATE OR REPLACE FUNCTION auto_cleanup_contact_submissions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Delete contact submissions older than 90 days
  DELETE FROM contact_submissions 
  WHERE created_at < NOW() - INTERVAL '90 days';
  
  -- Log cleanup action
  INSERT INTO audit_log (action, table_name, user_id)
  VALUES ('DATA_CLEANUP', 'contact_submissions', NULL);
END;
$$;

-- Add session tracking for admin security
CREATE TABLE IF NOT EXISTS admin_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  session_token text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  last_activity timestamp with time zone DEFAULT now(),
  expires_at timestamp with time zone DEFAULT (now() + interval '2 hours'),
  ip_address inet,
  user_agent text,
  is_active boolean DEFAULT true
);

-- Enable RLS on admin sessions
ALTER TABLE admin_sessions ENABLE ROW LEVEL SECURITY;

-- Admin sessions policies
CREATE POLICY "Users can view their own sessions" ON admin_sessions
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Super admins can view all sessions" ON admin_sessions
FOR SELECT USING (is_super_admin(auth.uid()));

-- Function to clean up expired sessions
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE admin_sessions 
  SET is_active = false 
  WHERE expires_at < now() AND is_active = true;
  
  DELETE FROM admin_sessions 
  WHERE expires_at < now() - interval '7 days';
END;
$$;

-- Enhanced audit logging function for security events
CREATE OR REPLACE FUNCTION log_security_access(
  p_action text,
  p_table_name text DEFAULT NULL,
  p_record_id uuid DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO audit_log (
    user_id, 
    action, 
    table_name,
    record_id,
    ip_address
  ) VALUES (
    auth.uid(), 
    p_action, 
    p_table_name,
    p_record_id,
    inet_client_addr()
  );
END;
$$;