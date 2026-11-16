-- Function definition only; no secrets or settings copied. Baseline matches live function read-only.
CREATE OR REPLACE FUNCTION public.notify_booking_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  r record;
  s record;
  p record;
  cnt int;
  txt text;
  sec text;
BEGIN
  BEGIN
    r := CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
    SELECT title, start_time, max_participants INTO s FROM schedules WHERE id = r.schedule_id;
    SELECT first_name, last_name, display_name, phone INTO p FROM profiles WHERE user_id = r.user_id;
    SELECT count(*) INTO cnt FROM schedule_participants WHERE schedule_id = r.schedule_id;
    SELECT value INTO sec FROM internal_settings WHERE key = 'notify_booking_secret';

    txt := CASE WHEN TG_OP = 'DELETE' THEN '🔴 Отмена записи' ELSE '🟢 Новая запись' END
      || E'\n👤 ' || COALESCE(NULLIF(trim(COALESCE(p.first_name,'') || ' ' || COALESCE(p.last_name,'')), ''), p.display_name, 'Участник')
      || COALESCE(E'\n📞 ' || p.phone, '')
      || E'\n📅 «' || COALESCE(s.title, 'Мероприятие') || '»'
      || COALESCE(E'\n🕒 ' || to_char(s.start_time AT TIME ZONE 'Europe/Moscow', 'DD.MM.YYYY HH24:MI') || ' (МСК)', '')
      || E'\n👥 Записано: ' || cnt || COALESCE('/' || s.max_participants, '');

    PERFORM net.http_post(
      url := 'https://wfjvjvbjjxcgkaolkgdq.supabase.co/functions/v1/notify-booking',
      headers := jsonb_build_object('Content-Type', 'application/json', 'x-notify-secret', sec),
      body := jsonb_build_object('text', txt)
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'notify_booking_change failed: %', SQLERRM;
  END;
  RETURN NULL;
END;
$$;
