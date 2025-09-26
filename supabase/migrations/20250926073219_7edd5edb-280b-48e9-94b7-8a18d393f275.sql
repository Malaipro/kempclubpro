-- Create storage buckets for media files
INSERT INTO storage.buckets (id, name, public) VALUES ('testimonials', 'testimonials', true);
INSERT INTO storage.buckets (id, name, public) VALUES ('moments', 'moments', true);
INSERT INTO storage.buckets (id, name, public) VALUES ('content', 'content', true);

-- Create testimonials table
CREATE TABLE public.testimonials (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  participant_name VARCHAR(100) NOT NULL,
  participant_title VARCHAR(200),
  content TEXT NOT NULL,
  video_url TEXT,
  image_url TEXT,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create moments table for gallery
CREATE TABLE public.moments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title VARCHAR(200),
  description TEXT,
  image_url TEXT NOT NULL,
  video_url TEXT,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create content blocks table for site management
CREATE TABLE public.content_blocks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  block_key VARCHAR(100) NOT NULL UNIQUE,
  title VARCHAR(200),
  content TEXT,
  image_url TEXT,
  metadata JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.testimonials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.moments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_blocks ENABLE ROW LEVEL SECURITY;

-- RLS Policies for testimonials
CREATE POLICY "Testimonials are publicly readable" 
ON public.testimonials FOR SELECT 
USING (is_active = true);

CREATE POLICY "Admins can manage testimonials" 
ON public.testimonials FOR ALL 
USING (is_admin(auth.uid()));

-- RLS Policies for moments
CREATE POLICY "Moments are publicly readable" 
ON public.moments FOR SELECT 
USING (is_active = true);

CREATE POLICY "Admins can manage moments" 
ON public.moments FOR ALL 
USING (is_admin(auth.uid()));

-- RLS Policies for content blocks
CREATE POLICY "Content blocks are publicly readable" 
ON public.content_blocks FOR SELECT 
USING (is_active = true);

CREATE POLICY "Admins can manage content blocks" 
ON public.content_blocks FOR ALL 
USING (is_admin(auth.uid()));

-- Create storage policies for testimonials bucket
CREATE POLICY "Public can view testimonials media" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'testimonials');

CREATE POLICY "Admins can upload testimonials media" 
ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'testimonials' AND is_admin(auth.uid()));

CREATE POLICY "Admins can update testimonials media" 
ON storage.objects FOR UPDATE 
USING (bucket_id = 'testimonials' AND is_admin(auth.uid()));

CREATE POLICY "Admins can delete testimonials media" 
ON storage.objects FOR DELETE 
USING (bucket_id = 'testimonials' AND is_admin(auth.uid()));

-- Create storage policies for moments bucket
CREATE POLICY "Public can view moments media" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'moments');

CREATE POLICY "Admins can upload moments media" 
ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'moments' AND is_admin(auth.uid()));

CREATE POLICY "Admins can update moments media" 
ON storage.objects FOR UPDATE 
USING (bucket_id = 'moments' AND is_admin(auth.uid()));

CREATE POLICY "Admins can delete moments media" 
ON storage.objects FOR DELETE 
USING (bucket_id = 'moments' AND is_admin(auth.uid()));

-- Create storage policies for content bucket
CREATE POLICY "Public can view content media" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'content');

CREATE POLICY "Admins can upload content media" 
ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'content' AND is_admin(auth.uid()));

CREATE POLICY "Admins can update content media" 
ON storage.objects FOR UPDATE 
USING (bucket_id = 'content' AND is_admin(auth.uid()));

CREATE POLICY "Admins can delete content media" 
ON storage.objects FOR DELETE 
USING (bucket_id = 'content' AND is_admin(auth.uid()));

-- Add triggers for updated_at
CREATE TRIGGER update_testimonials_updated_at
BEFORE UPDATE ON public.testimonials
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_moments_updated_at
BEFORE UPDATE ON public.moments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_content_blocks_updated_at
BEFORE UPDATE ON public.content_blocks
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default content blocks
INSERT INTO public.content_blocks (block_key, title, content) VALUES
('hero_title', 'КЭМП', 'Клуб Эффективного Мужского Прогресса'),
('hero_subtitle', 'Подзаголовок', 'Место, где рождается сила духа и тела'),
('about_title', 'О нас', 'Наша миссия'),
('about_content', 'Контент о нас', 'Мы создаем сообщество сильных мужчин'),
('program_title', 'Программа', 'Наша программа тренировок'),
('program_content', 'Контент программы', 'Комплексная система развития'),
('gallery_title', 'Галерея', 'Моменты КЭМП'),
('gallery_subtitle', 'Подзаголовок галереи', 'Путешествие преображения: реальные моменты из жизни участников нашего клуба'),
('testimonials_title', 'Отзывы', 'Отзывы участников'),
('testimonials_subtitle', 'Подзаголовок отзывов', 'Узнайте, что говорят наши выпускники о программе КЭМП и как она изменила их жизнь');