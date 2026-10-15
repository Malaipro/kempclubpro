CREATE TABLE IF NOT EXISTS public.internal_settings (
  key text PRIMARY KEY,
  value text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.internal_settings TO service_role;
ALTER TABLE public.internal_settings ENABLE ROW LEVEL SECURITY;

INSERT INTO public.internal_settings(key, value)
VALUES ('notify_booking_secret', encode(extensions.gen_random_bytes(32), 'hex'))
ON CONFLICT (key) DO NOTHING;

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

REVOKE ALL ON FUNCTION public.notify_booking_change() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_notify_booking_change ON public.schedule_participants;
CREATE TRIGGER trg_notify_booking_change
AFTER INSERT OR DELETE ON public.schedule_participants
FOR EACH ROW EXECUTE FUNCTION public.notify_booking_change();

-- DOWN: DROP TRIGGER trg_notify_booking_change ON public.schedule_participants; DROP FUNCTION public.notify_booking_change();