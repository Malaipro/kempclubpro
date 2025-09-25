-- Создание недостающих таблиц для системы геймификации КЭМП

-- Проверяем и создаем недостающие типы
DO $$ BEGIN
    CREATE TYPE activity_type AS ENUM (
      'training_bjj',
      'training_kick', 
      'training_ofp',
      'lecture',
      'homework',
      'crash_test_bjj',
      'crash_test_kick',
      'hero_race',
      'tactics',
      'ascetic_challenge'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE totem_type AS ENUM (
      'snake',      -- Змей (БЖЖ)
      'paw',        -- Лапа (Кикбоксинг)
      'hammer',     -- Молот (ОФП)
      'star',       -- Звезда (Пирамида КЭМП)
      'sprout',     -- Росток (Нутрициология)
      'compass',    -- Компас (Тактика)
      'monk',       -- Монах (Аскезы)
      'blade',      -- Клинок (Испытания)
      'lighthouse', -- Маяк (Особый)
      'bear'        -- Медведь (Супер-тотем)
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Обновление существующей таблицы training_sessions
ALTER TABLE public.training_sessions 
ADD COLUMN IF NOT EXISTS activity_type TEXT,
ADD COLUMN IF NOT EXISTS multiplier DECIMAL(3,1) DEFAULT 1.0,
ADD COLUMN IF NOT EXISTS verified BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS verified_by UUID REFERENCES auth.users(id);

-- Создание недостающих таблиц

-- Таблица для лекций
CREATE TABLE public.lectures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lecture_type TEXT NOT NULL,
  points_earned INTEGER NOT NULL DEFAULT 1,
  attendance_type TEXT NOT NULL DEFAULT 'in_person',
  verified BOOLEAN DEFAULT false,
  verified_by UUID REFERENCES auth.users(id),
  lecture_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Таблица для домашних заданий
CREATE TABLE public.homework_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  homework_type TEXT NOT NULL,
  points_earned INTEGER NOT NULL DEFAULT 1,
  verified BOOLEAN DEFAULT false,
  verified_by UUID REFERENCES auth.users(id),
  submitted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  content TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Таблица для краш-тестов
CREATE TABLE public.crash_tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  test_type TEXT NOT NULL,
  points_earned INTEGER NOT NULL DEFAULT 6,
  passed BOOLEAN DEFAULT false,
  verified BOOLEAN DEFAULT false,
  verified_by UUID REFERENCES auth.users(id),
  test_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Таблица для Гонки героев
CREATE TABLE public.hero_races (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  points_earned INTEGER NOT NULL DEFAULT 8,
  finished BOOLEAN DEFAULT false,
  verified BOOLEAN DEFAULT false,
  verified_by UUID REFERENCES auth.users(id),
  race_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  time_minutes INTEGER,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Таблица для тактических выездов
CREATE TABLE public.tactical_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  points_earned INTEGER NOT NULL DEFAULT 3,
  passed BOOLEAN DEFAULT false,
  verified BOOLEAN DEFAULT false,
  verified_by UUID REFERENCES auth.users(id),
  session_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  location TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Таблица для тотемов (справочник)
CREATE TABLE public.totems (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  totem_type totem_type UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  discipline TEXT NOT NULL,
  required_points INTEGER,
  required_attendance_percentage INTEGER DEFAULT 80,
  special_requirements JSONB,
  icon_name TEXT,
  icon_color TEXT DEFAULT '#e60000',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Таблица для пользовательских тотемов
CREATE TABLE public.user_totems (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  totem_type totem_type NOT NULL,
  earned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  verified BOOLEAN DEFAULT false,
  verified_by UUID REFERENCES auth.users(id),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, totem_type)
);

-- Таблица для общих очков пользователя
CREATE TABLE public.user_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  bjj_points INTEGER DEFAULT 0,
  kick_points INTEGER DEFAULT 0,
  ofp_points INTEGER DEFAULT 0,
  pyramid_kemp_points INTEGER DEFAULT 0,
  nutrition_points INTEGER DEFAULT 0,
  tactics_points INTEGER DEFAULT 0,
  total_points INTEGER DEFAULT 0,
  bjj_sessions_total INTEGER DEFAULT 0,
  bjj_sessions_attended INTEGER DEFAULT 0,
  kick_sessions_total INTEGER DEFAULT 0,
  kick_sessions_attended INTEGER DEFAULT 0,
  ofp_sessions_total INTEGER DEFAULT 0,
  ofp_sessions_attended INTEGER DEFAULT 0,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Обновление таблицы аскетических активностей
ALTER TABLE public.ascetic_activities 
ADD COLUMN IF NOT EXISTS challenge_name TEXT,
ADD COLUMN IF NOT EXISTS challenge_duration INTEGER DEFAULT 14,
ADD COLUMN IF NOT EXISTS completion_percentage DECIMAL(5,2) DEFAULT 0;