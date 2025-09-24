-- Create security definer functions to prevent RLS recursion issues
-- This is critical for role-based access control

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role user_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  );
$$;

-- Create function to check if user is admin (covers both admin and super_admin)
CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('admin', 'super_admin')
  );
$$;

-- Create function to check if user is super admin specifically
CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = 'super_admin'
  );
$$;

-- Update leaderboard RLS policy to require authentication
-- This addresses the privacy concern of exposing user_ids publicly
DROP POLICY IF EXISTS "Leaderboard is publicly readable" ON public.leaderboard;

CREATE POLICY "Leaderboard is viewable by authenticated users"
ON public.leaderboard
FOR SELECT
TO authenticated
USING (true);

-- Add policy to allow admins to manage leaderboard
CREATE POLICY "Admins can manage leaderboard"
ON public.leaderboard
FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()));

-- Update user_roles policies to use security definer functions
DROP POLICY IF EXISTS "Admins can manage user roles" ON public.user_roles;

CREATE POLICY "Super admins can manage user roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (public.is_super_admin(auth.uid()));

-- Only super admins can assign roles to prevent privilege escalation
CREATE POLICY "Only super admins can assign roles"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (public.is_super_admin(auth.uid()));

-- Add audit logging for role changes
CREATE TABLE IF NOT EXISTS public.role_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role_assigned user_role NOT NULL,
  assigned_by uuid NOT NULL,
  assigned_at timestamp with time zone NOT NULL DEFAULT now(),
  action text NOT NULL, -- 'GRANTED' or 'REVOKED'
  notes text
);

-- Enable RLS on audit log
ALTER TABLE public.role_audit_log ENABLE ROW LEVEL SECURITY;

-- Only super admins can view audit logs
CREATE POLICY "Super admins can view role audit logs"
ON public.role_audit_log
FOR SELECT
TO authenticated
USING (public.is_super_admin(auth.uid()));

-- Create trigger function for role audit logging
CREATE OR REPLACE FUNCTION public.log_role_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.role_audit_log (user_id, role_assigned, assigned_by, action, notes)
    VALUES (NEW.user_id, NEW.role, NEW.assigned_by, 'GRANTED', 'Role granted via trigger');
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.role_audit_log (user_id, role_assigned, assigned_by, action, notes)
    VALUES (OLD.user_id, OLD.role, auth.uid(), 'REVOKED', 'Role revoked via trigger');
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

-- Create trigger for role audit logging
DROP TRIGGER IF EXISTS role_changes_audit_trigger ON public.user_roles;
CREATE TRIGGER role_changes_audit_trigger
  AFTER INSERT OR DELETE ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION public.log_role_changes();