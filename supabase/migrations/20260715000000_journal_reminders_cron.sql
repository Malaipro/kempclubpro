-- Планировщик напоминаний о заполнении Ежедневника КЭМП
-- 9:30 МСК = 6:30 UTC (утро), 21:00 МСК = 18:00 UTC (вечер)

CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

SELECT cron.unschedule(jobid) FROM cron.job WHERE jobname = 'journal-morning';
SELECT cron.unschedule(jobid) FROM cron.job WHERE jobname = 'journal-evening';

-- ВАЖНО: замените SERVICE_ROLE_KEY на реальный service_role ключ проекта
-- (лучше хранить его в Vault и подставлять через `select decrypted_secret from vault.decrypted_secrets ...`).

SELECT cron.schedule(
  'journal-morning',
  '30 6 * * *',
  $$SELECT net.http_post(
    url := 'https://wfjvjvbjjxcgkaolkgdq.supabase.co/functions/v1/send-journal-reminders?type=morning',
    headers := '{"Authorization":"Bearer SERVICE_ROLE_KEY","Content-Type":"application/json"}'::jsonb
  )$$
);

SELECT cron.schedule(
  'journal-evening',
  '0 18 * * *',
  $$SELECT net.http_post(
    url := 'https://wfjvjvbjjxcgkaolkgdq.supabase.co/functions/v1/send-journal-reminders?type=evening',
    headers := '{"Authorization":"Bearer SERVICE_ROLE_KEY","Content-Type":"application/json"}'::jsonb
  )$$
);
