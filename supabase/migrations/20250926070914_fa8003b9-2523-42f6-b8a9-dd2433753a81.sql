-- Добавляем поле для утверждения участников
ALTER TABLE public.profiles 
ADD COLUMN approved BOOLEAN DEFAULT false;

-- Добавляем поле для даты утверждения
ALTER TABLE public.profiles 
ADD COLUMN approved_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Добавляем поле для того, кто утвердил
ALTER TABLE public.profiles 
ADD COLUMN approved_by UUID REFERENCES auth.users(id) DEFAULT NULL;

-- Обновляем существующих участников как неутвержденных
UPDATE public.profiles SET approved = false WHERE approved IS NULL;