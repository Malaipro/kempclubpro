ALTER TABLE public.homework_assignments ADD COLUMN IF NOT EXISTS file_urls jsonb NOT NULL DEFAULT '[]'::jsonb;

UPDATE public.homework_assignments
SET file_urls = jsonb_build_array(jsonb_build_object('url', file_url, 'name', 'Файл к заданию'))
WHERE file_url IS NOT NULL AND file_url <> '' AND file_urls = '[]'::jsonb;