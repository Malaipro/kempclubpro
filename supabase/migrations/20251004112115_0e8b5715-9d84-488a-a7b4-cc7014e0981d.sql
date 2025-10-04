-- Создаем функцию для автоматического копирования полного имени
CREATE OR REPLACE FUNCTION public.sync_testimonial_display_name()
RETURNS TRIGGER AS $$
BEGIN
  -- Копируем полное имя из participant_name в display_name
  IF NEW.participant_name IS NOT NULL THEN
    NEW.display_name := NEW.participant_name;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Удаляем старый триггер, если он существует
DROP TRIGGER IF EXISTS set_testimonial_display_name ON public.testimonials;

-- Создаем новый триггер
CREATE TRIGGER set_testimonial_display_name
  BEFORE INSERT OR UPDATE ON public.testimonials
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_testimonial_display_name();