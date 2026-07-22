-- Планировщик еженедельной AI-сводки по ежедневнику
-- Каждый понедельник в 8:00 МСК = 5:00 UTC

CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

SELECT cron.unschedule(jobid) FROM cron.job WHERE jobname = 'weekly-journal-summary';

-- ВАЖНО: замените SERVICE_ROLE_KEY на реальный service_role ключ проекта
-- (лучше хранить его в Vault и подставлять через `select decrypted_secret from vault.decrypted_secrets ...`).

SELECT cron.schedule(
  'weekly-journal-summary',
  '0 5 * * 1',
  $$SELECT net.http_post(
    url := 'https://wfjvjvbjjxcgkaolkgdq.supabase.co/functions/v1/weekly-journal-summary',
    headers := '{"Authorization":"Bearer SERVICE_ROLE_KEY","Content-Type":"application/json"}'::jsonb
  )$$
);
