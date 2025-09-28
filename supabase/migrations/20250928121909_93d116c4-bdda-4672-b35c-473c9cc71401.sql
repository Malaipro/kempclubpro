-- Create or update RLS policies for training_sessions table to allow admins to manage activities

-- Enable RLS on training_sessions if not already enabled
ALTER TABLE public.training_sessions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist to recreate them
DROP POLICY IF EXISTS "Users can view their own training sessions" ON public.training_sessions;
DROP POLICY IF EXISTS "Users can create their own training sessions" ON public.training_sessions;
DROP POLICY IF EXISTS "Admins can manage all training sessions" ON public.training_sessions;

-- Allow users to view their own training sessions
CREATE POLICY "Users can view their own training sessions" 
ON public.training_sessions 
FOR SELECT 
USING (auth.uid() = user_id);

-- Allow users to create their own training sessions
CREATE POLICY "Users can create their own training sessions" 
ON public.training_sessions 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Allow admins to manage all training sessions (view, insert, update, delete)
CREATE POLICY "Admins can manage all training sessions" 
ON public.training_sessions 
FOR ALL
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

-- Allow users to update their own training sessions
CREATE POLICY "Users can update their own training sessions" 
ON public.training_sessions 
FOR UPDATE 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);