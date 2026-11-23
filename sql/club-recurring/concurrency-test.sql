\set ON_ERROR_STOP on
SET ROLE authenticated;
SET test.uid='00000000-0000-0000-0000-000000000005';
SELECT public.club_recurring_series_save(
  'Кикбоксинг',NULL,'#ef4444','2027-06-07','2027-06-28','weekly','06:00','07:00','Зал concurrency'
);
