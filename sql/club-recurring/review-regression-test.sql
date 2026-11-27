\set ON_ERROR_STOP on

SET ROLE authenticated;
SET test.uid='00000000-0000-0000-0000-000000000005';

-- Review scenario 1: a moved occurrence must not be claimed by the target date.
SELECT public.club_recurring_series_save(
  'BJJ',NULL,'#10b981','2026-11-23','2026-11-23','weekly','06:00','07:30','Зал перенос review'
);
RESET ROLE;
CREATE TEMP TABLE review_moved AS
SELECT schedule_id
FROM public.club_recurring_occurrences
WHERE occurrence_date='2026-11-23'
  AND original_location='зал перенос review';
GRANT SELECT ON review_moved TO authenticated;
SET ROLE authenticated;
SET test.uid='00000000-0000-0000-0000-000000000005';
UPDATE public.schedules
SET start_time='2026-11-30 06:00 Europe/Moscow',
    end_time='2026-11-30 07:30 Europe/Moscow'
WHERE id=(SELECT schedule_id FROM review_moved);

CREATE TEMP TABLE review_moved_preview AS
SELECT public.club_recurring_series_preview(
  'BJJ','2026-11-23','2026-11-30','weekly','06:00','07:30','Зал перенос review'
) AS payload;
CREATE TEMP TABLE review_moved_save AS
SELECT public.club_recurring_series_save(
  'BJJ',NULL,'#10b981','2026-11-23','2026-11-30','weekly','06:00','07:30','Зал перенос review'
) AS payload;

RESET ROLE;
SELECT public.test_expect(
  (SELECT payload->>'occupied'='1'
      AND payload->>'create'='0'
      AND (SELECT count(*)=1 FROM jsonb_array_elements(payload->'occurrences') item
           WHERE item->>'date'='2026-11-30' AND item->>'status'='occupied_moved')
   FROM review_moved_preview),
  'review 1 preview labels the target slot occupied by a moved training'
);
SELECT public.test_expect(
  (SELECT payload->>'occupied'='1'
      AND payload->>'created'='0'
      AND (SELECT count(*)=1 FROM jsonb_array_elements(payload->'occurrences') item
           WHERE item->>'date'='2026-11-30' AND item->>'status'='occupied_moved')
   FROM review_moved_save),
  'review 1 save explicitly reports and skips the occupied slot'
);
SELECT public.test_expect(
  (SELECT count(*)=1 FROM public.club_recurring_occurrences
   WHERE schedule_id=(SELECT schedule_id FROM review_moved))
  AND NOT EXISTS (
    SELECT 1 FROM public.club_recurring_occurrences
    WHERE occurrence_date='2026-11-30' AND original_location='зал перенос review'
  ),
  'review 1 does not attach one schedule to two original dates'
);
SELECT public.test_expect(
  (SELECT week_anchor='2026-11-23' FROM public.schedules
   WHERE id=(SELECT schedule_id FROM review_moved)),
  'review 1 moved training keeps the 23 November credit week'
);

-- Review scenario 1b: an inactive moved row preserves the 23 November cancellation,
-- but no longer blocks a new active occurrence on 30 November.
SET ROLE authenticated;
SET test.uid='00000000-0000-0000-0000-000000000005';
UPDATE public.schedules
SET is_active=false
WHERE id=(SELECT schedule_id FROM review_moved);
CREATE TEMP TABLE review_inactive_preview AS
SELECT public.club_recurring_series_preview(
  'BJJ','2026-11-23','2026-11-30','weekly','06:00','07:30','Зал перенос review'
) AS payload;
CREATE TEMP TABLE review_inactive_save AS
SELECT public.club_recurring_series_save(
  'BJJ',NULL,'#10b981','2026-11-23','2026-11-30','weekly','06:00','07:30','Зал перенос review'
) AS payload;
RESET ROLE;
SELECT public.test_expect(
  (SELECT payload->>'occupied'='0' AND payload->>'create'='1'
      AND (SELECT count(*)=1 FROM jsonb_array_elements(payload->'occurrences') item
           WHERE item->>'date'='2026-11-23' AND item->>'status'='cancelled')
      AND (SELECT count(*)=1 FROM jsonb_array_elements(payload->'occurrences') item
           WHERE item->>'date'='2026-11-30' AND item->>'status'='new')
   FROM review_inactive_preview),
  'review 1b preview keeps 23 November cancelled and makes inactive-moved 30 November creatable'
);
SELECT public.test_expect(
  (SELECT payload->>'occupied'='0' AND payload->>'created'='1' AND payload->>'cancelled'='1'
      AND (SELECT count(*)=1 FROM jsonb_array_elements(payload->'occurrences') item
           WHERE item->>'date'='2026-11-30' AND item->>'status'='created')
   FROM review_inactive_save),
  'review 1b save creates a distinct active training beside the inactive moved row'
);
SELECT public.test_expect(
  (SELECT count(*)=2 AND count(DISTINCT schedule_id)=2
   FROM public.club_recurring_occurrences
   WHERE original_location='зал перенос review')
  AND (SELECT count(*)=1 FROM public.schedules
       WHERE is_active
         AND start_time='2026-11-30 06:00 Europe/Moscow'
         AND public.club_recurring_normalize_location(location)='зал перенос review')
  AND (SELECT count(*)=1 FROM public.schedules
       WHERE NOT is_active
         AND start_time='2026-11-30 06:00 Europe/Moscow'
         AND week_anchor='2026-11-23'
         AND public.club_recurring_normalize_location(location)='зал перенос review'),
  'review 1b calendar and ledger separate the cancelled 23 November history from active 30 November'
);

SET ROLE authenticated;
SET test.uid='00000000-0000-0000-0000-000000000005';
CREATE TEMP TABLE review_inactive_retry_preview AS
SELECT public.club_recurring_series_preview(
  'BJJ','2026-11-23','2026-11-30','weekly','06:00','07:30','Зал перенос review'
) AS payload;
CREATE TEMP TABLE review_inactive_retry_save AS
SELECT public.club_recurring_series_save(
  'BJJ',NULL,'#10b981','2026-11-23','2026-11-30','weekly','06:00','07:30','Зал перенос review'
) AS payload;
RESET ROLE;
SELECT public.test_expect(
  (SELECT payload->>'create'='0' AND payload->>'occupied'='0'
      AND (SELECT count(*)=1 FROM jsonb_array_elements(payload->'occurrences') item
           WHERE item->>'date'='2026-11-23' AND item->>'status'='cancelled')
      AND (SELECT count(*)=1 FROM jsonb_array_elements(payload->'occurrences') item
           WHERE item->>'date'='2026-11-30' AND item->>'status'='existing')
   FROM review_inactive_retry_preview),
  'review 1b retry preview preserves cancellation and finds the new active occurrence'
);
SELECT public.test_expect(
  (SELECT payload->>'created'='0' AND payload->>'occupied'='0'
   FROM review_inactive_retry_save)
  AND (SELECT count(*)=1 FROM public.schedules
       WHERE is_active
         AND start_time='2026-11-30 06:00 Europe/Moscow'
         AND public.club_recurring_normalize_location(location)='зал перенос review'),
  'review 1b retry save leaves exactly one active 30 November training'
);

-- Review scenario 2: occurrence keys must not depend on the SQL session TimeZone.
SET ROLE authenticated;
SET test.uid='00000000-0000-0000-0000-000000000005';
SET TIME ZONE 'UTC';
SELECT public.club_recurring_series_save(
  'BJJ',NULL,'#10b981','2026-12-14','2026-12-14','weekly','06:00','07:30','Зал timezone review'
);
RESET ROLE;
CREATE TEMP TABLE review_cancelled AS
SELECT schedule_id
FROM public.club_recurring_occurrences
WHERE occurrence_date='2026-12-14'
  AND original_location='зал timezone review';
GRANT SELECT ON review_cancelled TO authenticated;
SET ROLE authenticated;
SET test.uid='00000000-0000-0000-0000-000000000005';
DELETE FROM public.schedules WHERE id=(SELECT schedule_id FROM review_cancelled);

SET TIME ZONE 'Asia/Dubai';
CREATE TEMP TABLE review_timezone_preview AS
SELECT public.club_recurring_series_preview(
  'BJJ','2026-12-07','2026-12-14','weekly','06:00','07:30','Зал timezone review'
) AS payload;
CREATE TEMP TABLE review_timezone_save AS
SELECT public.club_recurring_series_save(
  'BJJ',NULL,'#10b981','2026-12-07','2026-12-14','weekly','06:00','07:30','Зал timezone review'
) AS payload;
CREATE TEMP TABLE review_original_preview AS
SELECT public.club_recurring_series_preview(
  'BJJ','2026-12-14','2026-12-14','weekly','06:00','07:30','Зал timezone review'
) AS payload;

RESET ROLE;
SELECT public.test_expect(
  (SELECT payload->>'create'='1' AND payload->>'existing'='1'
      AND (SELECT count(*)=1 FROM jsonb_array_elements(payload->'occurrences') item
           WHERE item->>'date'='2026-12-14' AND item->>'status'='cancelled')
   FROM review_timezone_preview),
  'review 2 Dubai preview keeps the UTC-created 14 December occurrence cancelled'
);
SELECT public.test_expect(
  (SELECT payload->>'created'='1' AND payload->>'existing'='1' AND payload->>'cancelled'='1'
      AND (SELECT count(*)=1 FROM jsonb_array_elements(payload->'occurrences') item
           WHERE item->>'date'='2026-12-14' AND item->>'status'='cancelled')
   FROM review_timezone_save),
  'review 2 Dubai save creates 7 December and skips cancelled 14 December'
);
SELECT public.test_expect(
  (SELECT payload->>'create'='0'
      AND (payload->'occurrences'->0->>'status')='cancelled'
   FROM review_original_preview),
  'review 2 original series retry still previews 14 December as cancelled'
);
SELECT public.test_expect(
  NOT EXISTS (
    SELECT 1 FROM public.schedules
    WHERE club_kind='training_bjj'
      AND start_time='2026-12-14 06:00 Europe/Moscow'
      AND public.club_recurring_normalize_location(location)='зал timezone review'
  )
  AND (SELECT count(*)=1 AND bool_and(schedule_id IS NULL)
       FROM public.club_recurring_occurrences
       WHERE occurrence_date='2026-12-14' AND original_location='зал timezone review'),
  'review 2 calendar stays empty on 14 December and ledger keeps one cancellation'
);
SELECT public.test_expect(
  (SELECT count(*)=1 FROM public.schedules
   WHERE club_kind='training_bjj'
     AND start_time='2026-12-07 06:00 Europe/Moscow'
     AND public.club_recurring_normalize_location(location)='зал timezone review'),
  'review 2 calendar contains exactly the new 7 December training'
);

-- Review scenario 3: tabs at the location edges must normalize like ordinary spaces.
SET ROLE authenticated;
SET test.uid='00000000-0000-0000-0000-000000000005';
INSERT INTO public.schedules(
  title,activity_type,start_time,end_time,location,schedule_type,booking_mode,is_active,color
) VALUES (
  'БЖЖ','БЖЖ','2027-01-04 06:00 Europe/Moscow','2027-01-04 07:30 Europe/Moscow',
  E'\tЗал whitespace review\t','club','free',true,'#10b981'
);
CREATE TEMP TABLE review_whitespace_preview AS
SELECT public.club_recurring_series_preview(
  'БЖЖ','2027-01-04','2027-01-04','weekly','06:00','07:30','Зал whitespace review'
) AS payload;
CREATE TEMP TABLE review_whitespace_save AS
SELECT public.club_recurring_series_save(
  'БЖЖ',NULL,'#10b981','2027-01-04','2027-01-04','weekly','06:00','07:30','Зал whitespace review'
) AS payload;

RESET ROLE;
SELECT public.test_expect(
  public.club_recurring_normalize_location(E'\tЗал\n whitespace\t review\t')
    = public.club_recurring_normalize_location('Зал whitespace review'),
  'review 3 location normalization collapses whitespace before trimming edges'
);
SELECT public.test_expect(
  (SELECT payload->>'existing'='1' AND payload->>'create'='0'
      AND (payload->'occurrences'->0->>'status')='existing'
   FROM review_whitespace_preview),
  'review 3 preview finds the tab-padded one-off training'
);
SELECT public.test_expect(
  (SELECT payload->>'created'='0' AND payload->>'existing'='1'
      AND (payload->'occurrences'->0->>'status')='existing'
   FROM review_whitespace_save),
  'review 3 save adopts the existing training instead of duplicating it'
);
SELECT public.test_expect(
  (SELECT count(*)=1
   FROM public.schedules
   WHERE COALESCE(
       club_kind,
       public.club_recurring_training_kind(activity_type),
       public.club_recurring_training_kind(title)
     )='training_bjj'
     AND start_time='2027-01-04 06:00 Europe/Moscow'
     AND public.club_recurring_normalize_location(location)='зал whitespace review')
  AND (SELECT count(*)=1 AND count(DISTINCT schedule_id)=1
       FROM public.club_recurring_occurrences
       WHERE occurrence_date='2027-01-04' AND original_location='зал whitespace review'),
  'review 3 calendar and ledger each contain one normalized training'
);
