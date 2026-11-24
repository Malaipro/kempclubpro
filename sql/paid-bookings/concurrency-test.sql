\set ON_ERROR_STOP on
SET ROLE authenticated;
SELECT set_config('test.uid', :'uid', false);
BEGIN;
SELECT paid_booking_create_hold(
  '20000000-0000-0000-0000-0000000000cc',
  :'key'
) AS result;
SELECT pg_sleep(1);
COMMIT;
