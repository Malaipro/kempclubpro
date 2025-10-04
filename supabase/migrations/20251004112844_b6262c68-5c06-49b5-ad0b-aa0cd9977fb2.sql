-- Удаляем существующий VIEW
DROP VIEW IF EXISTS public.public_testimonials;

-- Создаем таблицу public_testimonials
CREATE TABLE IF NOT EXISTS public.public_testimonials (
  id uuid PRIMARY KEY,
  display_name text,
  participant_title text,
  content text,
  video_url text,
  image_url text,
  is_active boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Включаем RLS
ALTER TABLE public.public_testimonials ENABLE ROW LEVEL SECURITY;

-- Политика для публичного чтения
CREATE POLICY "Public testimonials are readable by everyone"
  ON public.public_testimonials
  FOR SELECT
  USING (true);

-- Функция для синхронизации testimonials -> public_testimonials
CREATE OR REPLACE FUNCTION public.sync_to_public_testimonials()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    DELETE FROM public.public_testimonials WHERE id = OLD.id;
    RETURN OLD;
  END IF;

  -- Синхронизируем только активные записи
  IF NEW.is_active = true THEN
    INSERT INTO public.public_testimonials (
      id, display_name, participant_title, content, 
      video_url, image_url, is_active, sort_order, 
      created_at, updated_at
    ) VALUES (
      NEW.id, NEW.display_name, NEW.participant_title, NEW.content,
      NEW.video_url, NEW.image_url, NEW.is_active, NEW.sort_order,
      NEW.created_at, NEW.updated_at
    )
    ON CONFLICT (id) DO UPDATE SET
      display_name = EXCLUDED.display_name,
      participant_title = EXCLUDED.participant_title,
      content = EXCLUDED.content,
      video_url = EXCLUDED.video_url,
      image_url = EXCLUDED.image_url,
      is_active = EXCLUDED.is_active,
      sort_order = EXCLUDED.sort_order,
      updated_at = EXCLUDED.updated_at;
  ELSE
    -- Если запись стала неактивной, удаляем из публичной таблицы
    DELETE FROM public.public_testimonials WHERE id = NEW.id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Создаем триггер
DROP TRIGGER IF EXISTS sync_testimonials_to_public ON public.testimonials;
CREATE TRIGGER sync_testimonials_to_public
  AFTER INSERT OR UPDATE OR DELETE ON public.testimonials
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_to_public_testimonials();

-- Заполняем таблицу существующими активными отзывами
INSERT INTO public.public_testimonials (
  id, display_name, participant_title, content,
  video_url, image_url, is_active, sort_order,
  created_at, updated_at
)
SELECT 
  id, display_name, participant_title, content,
  video_url, image_url, is_active, sort_order,
  created_at, updated_at
FROM public.testimonials
WHERE is_active = true
ON CONFLICT (id) DO NOTHING;