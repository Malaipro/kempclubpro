-- Create ascetic_types table for managing ascetic activity types
CREATE TABLE public.ascetic_types (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  default_points INTEGER DEFAULT 1,
  default_duration_minutes INTEGER,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ascetic_types ENABLE ROW LEVEL SECURITY;

-- Create policies for ascetic_types
CREATE POLICY "Ascetic types are publicly readable" 
ON public.ascetic_types 
FOR SELECT 
USING (is_active = true);

CREATE POLICY "Super admins can manage ascetic types" 
ON public.ascetic_types 
FOR ALL 
USING (is_super_admin(auth.uid()))
WITH CHECK (is_super_admin(auth.uid()));

-- Insert default ascetic types
INSERT INTO public.ascetic_types (name, description, default_points, default_duration_minutes) VALUES
('cold_shower', 'Холодный душ', 2, 5),
('meditation', 'Медитация', 3, 30),
('fasting', 'Голодание', 5, 720),
('early_wake', 'Ранний подъем', 2, NULL),
('no_phone', 'Без телефона', 3, 60),
('reading', 'Чтение', 2, 60),
('exercise', 'Упражнения', 4, 30),
('other', 'Другое', 1, NULL);

-- Create trigger for updating updated_at
CREATE TRIGGER update_ascetic_types_updated_at
BEFORE UPDATE ON public.ascetic_types
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();