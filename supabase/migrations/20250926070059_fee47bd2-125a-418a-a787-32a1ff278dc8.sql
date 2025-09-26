-- Обновляем таблицу profiles для расширенного профиля
ALTER TABLE public.profiles
ADD COLUMN weight_before_stream INTEGER, -- Вес до потока в кг
ADD COLUMN weight_after_stream INTEGER,  -- Вес после потока в кг
ADD COLUMN stream_start_date DATE,       -- Дата начала потока
ADD COLUMN stream_end_date DATE;         -- Дата окончания потока

-- Создаем таблицу для аскез и привычек
CREATE TABLE public.participant_habits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  habit_name TEXT NOT NULL,
  habit_type TEXT NOT NULL DEFAULT 'ascetic', -- 'ascetic' или 'habit'
  description TEXT,
  start_date DATE NOT NULL,
  end_date DATE,
  target_days INTEGER DEFAULT 21, -- Сколько дней должна длиться привычка
  completed_days INTEGER DEFAULT 0, -- Сколько дней выполнено
  is_active BOOLEAN DEFAULT true,
  is_completed BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Добавляем RLS для participant_habits
ALTER TABLE public.participant_habits ENABLE ROW LEVEL SECURITY;

-- Политики для participant_habits
CREATE POLICY "Users can view their own habits" 
ON public.participant_habits 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own habits" 
ON public.participant_habits 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own habits" 
ON public.participant_habits 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all habits" 
ON public.participant_habits 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.user_roles 
  WHERE user_id = auth.uid() 
  AND role IN ('admin', 'super_admin', 'trainer')
));

CREATE POLICY "Admins can manage all habits" 
ON public.participant_habits 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM public.user_roles 
  WHERE user_id = auth.uid() 
  AND role IN ('admin', 'super_admin')
));

-- Создаем таблицу для отслеживания ежедневного прогресса привычек
CREATE TABLE public.habit_progress (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  habit_id UUID NOT NULL REFERENCES public.participant_habits(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  progress_date DATE NOT NULL DEFAULT CURRENT_DATE,
  completed BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(habit_id, progress_date) -- Одна запись на день для каждой привычки
);

-- Добавляем RLS для habit_progress
ALTER TABLE public.habit_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own habit progress" 
ON public.habit_progress 
FOR ALL 
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all habit progress" 
ON public.habit_progress 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.user_roles 
  WHERE user_id = auth.uid() 
  AND role IN ('admin', 'super_admin', 'trainer')
));

-- Добавляем поле для категоризации тестов Купера (до/после)
ALTER TABLE public.cooper_test_results
ADD COLUMN test_phase TEXT DEFAULT 'during_stream' CHECK (test_phase IN ('before_stream', 'during_stream', 'after_stream'));

-- Создаем триггер для обновления updated_at
CREATE TRIGGER update_participant_habits_updated_at
BEFORE UPDATE ON public.participant_habits
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Функция для подсчета выполненных дней привычки
CREATE OR REPLACE FUNCTION public.update_habit_completed_days()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Обновляем количество выполненных дней
  UPDATE public.participant_habits 
  SET completed_days = (
    SELECT COUNT(*) 
    FROM public.habit_progress 
    WHERE habit_id = NEW.habit_id AND completed = true
  ),
  is_completed = (
    SELECT COUNT(*) 
    FROM public.habit_progress 
    WHERE habit_id = NEW.habit_id AND completed = true
  ) >= (
    SELECT target_days 
    FROM public.participant_habits 
    WHERE id = NEW.habit_id
  )
  WHERE id = NEW.habit_id;
  
  RETURN NEW;
END;
$$;

-- Триггер для автоматического обновления прогресса привычек
CREATE TRIGGER update_habit_progress_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.habit_progress
FOR EACH ROW
EXECUTE FUNCTION public.update_habit_completed_days();