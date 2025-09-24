-- Create contact submissions table
CREATE TABLE public.contact_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    course TEXT NOT NULL,
    social TEXT,
    message TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    processed BOOLEAN DEFAULT false,
    processed_by UUID REFERENCES auth.users(id),
    processed_at TIMESTAMP WITH TIME ZONE
);

-- Create cooper test results table
CREATE TABLE public.cooper_test_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    test_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    distance INTEGER NOT NULL, -- distance in meters
    time_minutes INTEGER NOT NULL, -- time in minutes
    age INTEGER,
    gender TEXT CHECK (gender IN ('male', 'female')),
    fitness_level TEXT,
    notes TEXT,
    verified BOOLEAN DEFAULT false,
    verified_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create streams table for training streams
CREATE TABLE public.streams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    start_date DATE NOT NULL,
    end_date DATE,
    max_participants INTEGER,
    is_active BOOLEAN DEFAULT true,
    stream_type TEXT DEFAULT 'intensive',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user roles table
CREATE TYPE public.user_role AS ENUM ('user', 'admin', 'super_admin', 'trainer');

CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role user_role NOT NULL DEFAULT 'user',
    assigned_by UUID REFERENCES auth.users(id),
    assigned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(user_id, role)
);

-- Create activities table for KAMP system
CREATE TABLE public.activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    description TEXT,
    points INTEGER DEFAULT 1,
    difficulty_level INTEGER DEFAULT 1 CHECK (difficulty_level >= 1 AND difficulty_level <= 5),
    duration_minutes INTEGER,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user activities table to track user participation
CREATE TABLE public.user_activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    activity_id UUID NOT NULL REFERENCES public.activities(id),
    completed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    points_earned INTEGER DEFAULT 0,
    notes TEXT,
    verified BOOLEAN DEFAULT false,
    verified_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create schedules table
CREATE TABLE public.schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    activity_type TEXT NOT NULL,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    instructor_id UUID REFERENCES public.profiles(id),
    max_participants INTEGER,
    location TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create schedule participants table
CREATE TABLE public.schedule_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    schedule_id UUID NOT NULL REFERENCES public.schedules(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    registered_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    attended BOOLEAN DEFAULT false,
    UNIQUE(schedule_id, user_id)
);

-- Create ascetic activities table
CREATE TABLE public.ascetic_activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    activity_type TEXT NOT NULL,
    duration_minutes INTEGER,
    notes TEXT,
    completed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    points_earned INTEGER DEFAULT 0,
    verified BOOLEAN DEFAULT false,
    verified_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.contact_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cooper_test_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.streams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedule_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ascetic_activities ENABLE ROW LEVEL SECURITY;

-- RLS Policies for contact_submissions
CREATE POLICY "Contact submissions are viewable by admins" ON public.contact_submissions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.user_roles 
            WHERE user_id = auth.uid() 
            AND role IN ('admin', 'super_admin')
        )
    );

CREATE POLICY "Anyone can create contact submissions" ON public.contact_submissions
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins can update contact submissions" ON public.contact_submissions
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.user_roles 
            WHERE user_id = auth.uid() 
            AND role IN ('admin', 'super_admin')
        )
    );

-- RLS Policies for cooper_test_results
CREATE POLICY "Users can view their own cooper test results" ON public.cooper_test_results
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own cooper test results" ON public.cooper_test_results
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Trainers can view all cooper test results" ON public.cooper_test_results
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.user_roles 
            WHERE user_id = auth.uid() 
            AND role IN ('admin', 'super_admin', 'trainer')
        )
    );

-- RLS Policies for streams
CREATE POLICY "Streams are publicly viewable" ON public.streams
    FOR SELECT USING (true);

CREATE POLICY "Admins can manage streams" ON public.streams
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.user_roles 
            WHERE user_id = auth.uid() 
            AND role IN ('admin', 'super_admin')
        )
    );

-- RLS Policies for user_roles
CREATE POLICY "Users can view their own roles" ON public.user_roles
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage user roles" ON public.user_roles
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.user_roles 
            WHERE user_id = auth.uid() 
            AND role IN ('admin', 'super_admin')
        )
    );

-- RLS Policies for activities
CREATE POLICY "Activities are publicly viewable" ON public.activities
    FOR SELECT USING (true);

CREATE POLICY "Admins can manage activities" ON public.activities
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.user_roles 
            WHERE user_id = auth.uid() 
            AND role IN ('admin', 'super_admin')
        )
    );

-- RLS Policies for user_activities
CREATE POLICY "Users can view their own activities" ON public.user_activities
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own activities" ON public.user_activities
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Trainers can view all user activities" ON public.user_activities
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.user_roles 
            WHERE user_id = auth.uid() 
            AND role IN ('admin', 'super_admin', 'trainer')
        )
    );

-- RLS Policies for schedules
CREATE POLICY "Schedules are publicly viewable" ON public.schedules
    FOR SELECT USING (true);

CREATE POLICY "Trainers can manage schedules" ON public.schedules
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.user_roles 
            WHERE user_id = auth.uid() 
            AND role IN ('admin', 'super_admin', 'trainer')
        )
    );

-- RLS Policies for schedule_participants
CREATE POLICY "Users can view their own schedule participation" ON public.schedule_participants
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can register for schedules" ON public.schedule_participants
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Trainers can view all schedule participants" ON public.schedule_participants
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.user_roles 
            WHERE user_id = auth.uid() 
            AND role IN ('admin', 'super_admin', 'trainer')
        )
    );

-- RLS Policies for ascetic_activities
CREATE POLICY "Users can view their own ascetic activities" ON public.ascetic_activities
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own ascetic activities" ON public.ascetic_activities
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Trainers can view all ascetic activities" ON public.ascetic_activities
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.user_roles 
            WHERE user_id = auth.uid() 
            AND role IN ('admin', 'super_admin', 'trainer')
        )
    );

-- Create triggers for updated_at columns
CREATE TRIGGER update_streams_updated_at
    BEFORE UPDATE ON public.streams
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_activities_updated_at
    BEFORE UPDATE ON public.activities
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_schedules_updated_at
    BEFORE UPDATE ON public.schedules
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Insert initial admin role for the super admin
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'super_admin'::user_role
FROM auth.users
WHERE email = 'dishka.da@yandex.ru'
ON CONFLICT (user_id, role) DO NOTHING;