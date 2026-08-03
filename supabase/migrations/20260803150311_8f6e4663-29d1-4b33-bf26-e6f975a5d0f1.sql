-- UP
ALTER TABLE public.contact_submissions
  ADD COLUMN IF NOT EXISTS notify_failed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS notify_error text,
  ADD COLUMN IF NOT EXISTS referrer text,
  ADD COLUMN IF NOT EXISTS landing_page text;

CREATE INDEX IF NOT EXISTS idx_contact_rate_limit_ip_window
  ON public.contact_rate_limit (ip_address, window_start DESC);

CREATE OR REPLACE FUNCTION public.enhanced_contact_rate_limit(p_ip_address inet DEFAULT NULL::inet)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  current_ip inet;
  window_len interval := INTERVAL '15 minutes';
  max_per_window integer := 3;
  rec public.contact_rate_limit%ROWTYPE;
BEGIN
  current_ip := COALESCE(p_ip_address, inet_client_addr());

  -- Без определяемого IP не блокируем (иначе теряем реальные заявки)
  IF current_ip IS NULL THEN
    RETURN true;
  END IF;

  DELETE FROM public.contact_rate_limit
  WHERE window_start < NOW() - (window_len * 4);

  SELECT * INTO rec
  FROM public.contact_rate_limit
  WHERE ip_address = current_ip
    AND window_start > NOW() - window_len
  ORDER BY window_start DESC
  LIMIT 1;

  IF rec.id IS NULL THEN
    INSERT INTO public.contact_rate_limit (ip_address, submission_count, window_start)
    VALUES (current_ip, 1, NOW());
    RETURN true;
  END IF;

  IF rec.submission_count >= max_per_window THEN
    PERFORM public.log_security_event('RATE_LIMIT_EXCEEDED', NULL,
      jsonb_build_object(
        'ip', current_ip,
        'count', rec.submission_count,
        'window_minutes', 15,
        'limit', max_per_window
      ));
    RETURN false;
  END IF;

  UPDATE public.contact_rate_limit
  SET submission_count = submission_count + 1
  WHERE id = rec.id;

  RETURN true;
END;
$function$;

-- DOWN (для отката, выполнять вручную):
-- DROP INDEX IF EXISTS public.idx_contact_rate_limit_ip_window;
-- ALTER TABLE public.contact_submissions
--   DROP COLUMN IF EXISTS notify_failed,
--   DROP COLUMN IF EXISTS notify_error,
--   DROP COLUMN IF EXISTS referrer,
--   DROP COLUMN IF EXISTS landing_page;
-- CREATE OR REPLACE FUNCTION public.enhanced_contact_rate_limit(p_ip_address inet DEFAULT NULL::inet)
-- RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $f$
-- DECLARE submission_count integer; current_ip inet;
-- BEGIN
--   current_ip := COALESCE(p_ip_address, inet_client_addr());
--   SELECT COUNT(*) INTO submission_count FROM public.contact_submissions
--   WHERE created_at > NOW() - INTERVAL '15 minutes';
--   IF submission_count >= 2 THEN
--     PERFORM public.log_security_event('RATE_LIMIT_EXCEEDED', NULL,
--       jsonb_build_object('ip', current_ip, 'count', submission_count, 'window_minutes', 15, 'limit', 2));
--     RETURN false;
--   END IF;
--   RETURN true;
-- END; $f$;