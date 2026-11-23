\set ON_ERROR_STOP on

SELECT public.test_expect(
  has_function_privilege('authenticated', 'public.club_recurring_series_save(text,text,text,date,date,text,time without time zone,time without time zone,text)', 'EXECUTE'),
  'authenticated can execute recurring save RPC'
);
SELECT public.test_expect(
  NOT has_function_privilege('anon', 'public.club_recurring_series_save(text,text,text,date,date,text,time without time zone,time without time zone,text)', 'EXECUTE'),
  'anon cannot execute recurring save RPC'
);
SELECT public.test_expect(
  NOT has_table_privilege('authenticated', 'public.club_recurring_occurrences', 'SELECT'),
  'recurrence ledger is not exposed to clients'
);
SELECT public.test_expect(
  (SELECT relrowsecurity FROM pg_class WHERE oid='public.club_recurring_series'::regclass)
  AND (SELECT relrowsecurity FROM pg_class WHERE oid='public.club_recurring_occurrences'::regclass),
  'recurrence tables have RLS enabled'
);

SET ROLE authenticated;
SET test.uid='00000000-0000-0000-0000-000000000005';

-- Existing paid event is a control: recurring free saves must not touch its settings or route.
INSERT INTO public.schedules(
  id,title,activity_type,start_time,end_time,location,schedule_type,booking_mode,
  price_total_rub,prepay_rub,cash_rub,max_participants,payment_window_minutes,payment_link
) VALUES (
  '30000000-0000-0000-0000-000000000099','Платная встреча','Платная встреча',
  '2026-12-10 19:00 Europe/Moscow','2026-12-10 21:00 Europe/Moscow','Клуб','club','paid',
  2000,500,1500,10,120,'https://example.test/pay'
);
CREATE TEMP TABLE paid_before AS
SELECT to_jsonb(s) AS snapshot FROM public.schedules s WHERE id='30000000-0000-0000-0000-000000000099';

-- One legacy BJJ event already exists. club_kind/week_anchor are intentionally null.
INSERT INTO public.schedules(
  id,title,activity_type,start_time,end_time,location,schedule_type,booking_mode,is_active,color
) VALUES (
  '30000000-0000-0000-0000-000000000001','BJJ','BJJ',
  '2026-11-16 06:00 Europe/Moscow','2026-11-16 07:30 Europe/Moscow','Зал 1','club','free',true,'#10b981'
);

CREATE TEMP TABLE weekly_preview AS
SELECT public.club_recurring_series_preview(
  'BJJ','2026-11-16','2026-12-07','weekly','06:00','07:30','  Зал   1 '
) AS payload;
SELECT public.test_expect(
  (SELECT payload->>'total'='4' AND payload->>'existing'='1' AND payload->>'create'='3' FROM weekly_preview),
  'preview: already 1, create 3'
);

CREATE TEMP TABLE first_save AS
SELECT public.club_recurring_series_save(
  'BJJ','Утренняя тренировка','#10b981','2026-11-16','2026-12-07','weekly','06:00','07:30','Зал 1'
) AS payload;
SELECT public.test_expect(
  (SELECT payload->>'created'='3' AND payload->>'existing'='1' AND payload->>'total'='4' FROM first_save),
  'first save adopts one and creates three'
);
SELECT public.test_expect(
  (SELECT count(*)=4 FROM public.schedules
    WHERE club_kind='training_bjj'
      AND trim(location)='Зал 1'
      AND booking_mode='free'),
  'reload sees exactly four weekly trainings'
);
SELECT public.test_expect(
  (SELECT club_kind='training_bjj' AND week_anchor='2026-11-16' FROM public.schedules WHERE id='30000000-0000-0000-0000-000000000001'),
  'adopted legacy event receives attendance metadata'
);

CREATE TEMP TABLE retry_save AS
SELECT public.club_recurring_series_save(
  'БЖЖ','Утренняя тренировка','#10b981','2026-11-16','2026-12-07','weekly','06:00','07:30','зал 1'
) AS payload;
SELECT public.test_expect(
  (SELECT payload->>'created'='0' AND payload->>'existing'='4' FROM retry_save),
  'same series retry creates nothing'
);
RESET ROLE;
SELECT public.test_expect(
  (SELECT count(*)=4 FROM public.club_recurring_occurrences WHERE original_location='зал 1'),
  'ledger has one row for each original weekly occurrence'
);

-- Move one occurrence across weeks and hard-delete another through the same manager access path as the UI.
CREATE TEMP TABLE changed AS
SELECT
  (SELECT schedule_id FROM public.club_recurring_occurrences WHERE original_location='зал 1' AND occurrence_date='2026-11-30') AS moved_id,
  (SELECT schedule_id FROM public.club_recurring_occurrences WHERE original_location='зал 1' AND occurrence_date='2026-11-23') AS cancelled_id;
GRANT SELECT ON changed TO authenticated;
SET ROLE authenticated;
SET test.uid='00000000-0000-0000-0000-000000000005';
UPDATE public.schedules
SET start_time=now()-interval '1 hour', end_time=now()+interval '1 hour'
WHERE id=(SELECT moved_id FROM changed);
DELETE FROM public.schedules WHERE id=(SELECT cancelled_id FROM changed);
SELECT public.test_expect(
  (SELECT week_anchor='2026-11-30' FROM public.schedules WHERE id=(SELECT moved_id FROM changed)),
  'move keeps the original credit week'
);

CREATE TEMP TABLE changed_preview AS
SELECT public.club_recurring_series_preview(
  'BJJ','2026-11-16','2026-12-07','weekly','06:00','07:30','Зал 1'
) AS payload;
SELECT public.test_expect(
  (SELECT payload->>'create'='0' AND payload->>'existing'='4' FROM changed_preview),
  'moved and cancelled occurrences stay accounted for'
);
SELECT public.test_expect(
  (SELECT count(*)=1 FROM changed_preview, jsonb_array_elements(payload->'occurrences') item WHERE item->>'status'='moved')
  AND (SELECT count(*)=1 FROM changed_preview, jsonb_array_elements(payload->'occurrences') item WHERE item->>'status'='cancelled'),
  'preview labels one moved and one cancelled occurrence'
);
SELECT public.club_recurring_series_save(
  'BJJ','Утренняя тренировка','#10b981','2026-11-16','2026-12-07','weekly','06:00','07:30','Зал 1'
);
RESET ROLE;
SELECT public.test_expect(
  (SELECT count(*)=3 FROM public.schedules schedule
    JOIN public.club_recurring_occurrences occurrence ON occurrence.schedule_id=schedule.id
    WHERE occurrence.original_location='зал 1'),
  'repeat does not recreate cancelled or duplicate moved occurrence'
);

-- Existing attendance RPC: an unregistered resident can self-mark the moved free training.
SET ROLE authenticated;
SET test.uid='00000000-0000-0000-0000-000000000001';
CREATE TEMP TABLE attendance_request AS
SELECT public.request_attendance_web((SELECT moved_id FROM changed)) AS payload;
SELECT public.test_expect(
  (SELECT payload->>'status'='pending' FROM attendance_request),
  'resident without registration creates pending attendance request'
);
SELECT public.test_expect(
  (SELECT count(*)=1 AND bool_and(self_marked_at IS NOT NULL AND attended_marked_at IS NULL)
   FROM public.schedule_participants WHERE schedule_id=(SELECT moved_id FROM changed)),
  'attendance request is pending, not confirmed'
);
SELECT public.test_expect(
  (SELECT count(*)=1 FROM jsonb_array_elements(public.get_resident_checkins_web()->'events') item
    WHERE item->>'schedule_id'=(SELECT moved_id::text FROM changed) AND item->>'week_start'='2026-11-30'),
  'resident reader keeps original week after move'
);
RESET ROLE;
SELECT public.test_expect((SELECT count(*)=0 FROM public.notification_stub_calls), 'attendance insert made no network notification call');

-- Monthly series: Jan/Mar/May only; February and April are explicit skips.
SET ROLE authenticated;
SET test.uid='00000000-0000-0000-0000-000000000008';
CREATE TEMP TABLE monthly_preview AS
SELECT public.club_recurring_series_preview(
  'ОФП','2027-01-31','2027-05-31','monthly','19:00','21:00','Зал 2'
) AS payload;
SELECT public.test_expect(
  (SELECT payload->>'total'='3' AND payload->'skipped'='["2027-02", "2027-04"]'::jsonb FROM monthly_preview),
  'monthly preview skips February and April'
);
SELECT public.club_recurring_series_save(
  'ОФП',NULL,'#6366f1','2027-01-31','2027-05-31','monthly','19:00','21:00','Зал 2'
);
SELECT public.test_expect(
  (SELECT array_agg((start_time AT TIME ZONE 'Europe/Moscow')::date ORDER BY start_time)
    = ARRAY['2027-01-31'::date,'2027-03-31'::date,'2027-05-31'::date]
   FROM public.schedules WHERE club_kind='training_ofp' AND location='Зал 2'),
  'monthly save creates exactly Jan 31, Mar 31 and May 31'
);

-- A signed-in resident without a manager role cannot bypass the server RPC.
SET test.uid='00000000-0000-0000-0000-000000000002';
SELECT public.test_expect(
  public.club_recurring_series_save(
    'Кикбоксинг',NULL,'#ef4444','2027-02-01','2027-02-22','weekly','18:00','19:00','Зал 3'
  )->>'error'='forbidden',
  'user without schedule-management rights is denied by server'
);
RESET ROLE;

SELECT public.test_expect(
  (SELECT to_jsonb(s)=(SELECT snapshot FROM paid_before) FROM public.schedules s WHERE id='30000000-0000-0000-0000-000000000099'),
  'one-off paid event settings and path remain unchanged'
);
SELECT public.test_expect(
  (SELECT count(*)=1 FROM public.club_recurring_series WHERE identity_key LIKE '%training_bjj%'),
  'BJJ and БЖЖ retries resolve to one canonical series'
);
