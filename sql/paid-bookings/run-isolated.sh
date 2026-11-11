#!/usr/bin/env bash
# Локальная пустая PostgreSQL (НЕ production). Запуск: bash sql/paid-bookings/run-isolated.sh
set -euo pipefail
cd "$(dirname "$0")/../.."
D=/tmp/pg-paid; rm -rf $D; mkdir -p $D; chown -R lovable $D
RUN="runuser -u lovable -- bash -c"

$RUN "initdb -D $D/data -A trust >/dev/null && pg_ctl -D $D/data -o '-p 55433 -k $D' -l $D/log start -w >/dev/null"
trap "$RUN 'pg_ctl -D $D/data stop -m fast >/dev/null'" EXIT
P="psql -h $D -p 55433 -U postgres -v ON_ERROR_STOP=1 -q"
$P -c 'create database t' postgres
$P -f sql/paid-bookings/isolated-test.sql t 2>&1 | grep -E 'OK:|FAIL|ERROR' 
# Конкуренция: 2 резидента одновременно на последнее место
cat > $D/c.sql <<'S'
SET ROLE authenticated; SELECT set_config('test.uid', :'uid', false);
BEGIN; SELECT (paid_booking_create_hold('20000000-0000-0000-0000-0000000000cc', :'key'))->>'ok' AS ok; SELECT pg_sleep(1); COMMIT;
S
$P -t -v uid=00000000-0000-0000-0000-000000000001 -v key=concur-1-xxxx -f $D/c.sql t > $D/r1 &
$P -t -v uid=00000000-0000-0000-0000-000000000002 -v key=concur-2-xxxx -f $D/c.sql t > $D/r2 &
wait
N=$($P -t -A -c "select count(*) from paid_bookings where schedule_id='20000000-0000-0000-0000-0000000000cc'" t)
[ "$N" = 1 ] && echo "OK: конкурентные holds на последнее место → создан ровно 1 ($(tr -d ' \n' < $D/r1)/$(tr -d ' \n' < $D/r2))" || { echo "FAIL: concurrent holds=$N"; exit 1; }
$P -f sql/paid-bookings/down-test.sql t 2>&1 | grep -E 'OK:|FAIL|ERROR'
