-- Drop existing table if it exists
DROP TABLE IF EXISTS public.user_totems CASCADE;

-- Create user_totems table for tracking assigned totems
CREATE TABLE public.user_totems (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  totem_id UUID NOT NULL,
  assigned_by UUID,
  assigned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  notes TEXT,
  is_manual BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT fk_user_totems_user FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT fk_user_totems_totem FOREIGN KEY (totem_id) REFERENCES public.totems(id) ON DELETE CASCADE,
  CONSTRAINT fk_user_totems_assigned_by FOREIGN KEY (assigned_by) REFERENCES auth.users(id) ON DELETE SET NULL,
  CONSTRAINT unique_user_totem UNIQUE(user_id, totem_id)
);

-- Create indexes
CREATE INDEX idx_user_totems_user_id ON public.user_totems(user_id);
CREATE INDEX idx_user_totems_totem_id ON public.user_totems(totem_id);

-- Enable RLS
ALTER TABLE public.user_totems ENABLE ROW LEVEL SECURITY;

-- Users can view their own totems
CREATE POLICY "Users can view their own totems"
ON public.user_totems
FOR SELECT
USING (auth.uid() = user_id);

-- Admins can view all totems
CREATE POLICY "Admins can view all totems"
ON public.user_totems
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'super_admin')
  )
);

-- Admins can assign totems
CREATE POLICY "Admins can assign totems"
ON public.user_totems
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'super_admin')
  )
);