#!/usr/bin/env bash
# Local PostgreSQL 17 compatibility run. Never connects to Supabase or any network service.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$REPO_ROOT"

PSQL_BIN="$(command -v psql)"
INITDB_BIN="$(command -v initdb)"
PG_CTL_BIN="$(command -v pg_ctl)"
PG_ROOT="$(mktemp -d "${TMPDIR:-/tmp}/kemp-paid-e1.XXXXXX")"
PG_PORT="$((54000 + ($$ % 1000)))"

cleanup() {
  "$PG_CTL_BIN" -D "$PG_ROOT/data" stop -m fast >/dev/null 2>&1 || true
  rm -rf -- "$PG_ROOT"
}
trap cleanup EXIT INT TERM

"$INITDB_BIN" -U postgres -D "$PG_ROOT/data" -A trust --no-locale -E UTF8 >/dev/null
"$PG_CTL_BIN" -D "$PG_ROOT/data" -o "-p $PG_PORT -k $PG_ROOT -c listen_addresses=''" -l "$PG_ROOT/postgres.log" start -w >/dev/null
PSQL=("$PSQL_BIN" -X -h "$PG_ROOT" -p "$PG_PORT" -U postgres -v ON_ERROR_STOP=1)

"${PSQL[@]}" -d postgres -c 'CREATE DATABASE paid_compat' >/dev/null
"${PSQL[@]}" -d paid_compat -f sql/paid-bookings/schema-fixture.sql >/dev/null
"${PSQL[@]}" -d paid_compat -f sql/resident-checkins/up.sql >/dev/null
"${PSQL[@]}" -d paid_compat -f sql/paid-bookings/up.sql >/dev/null
"${PSQL[@]}" -d paid_compat -f sql/paid-bookings/isolated-test.sql
"${PSQL[@]}" -d paid_compat -f sql/paid-bookings/search-path-hardening.sql >/dev/null

# Two independent sessions compete for the single seat on the same schedule row.
"${PSQL[@]}" -d paid_compat -v uid=00000000-0000-0000-0000-000000000001 -v key=concur-1-xxxx \
  -f sql/paid-bookings/concurrency-test.sql >"$PG_ROOT/concurrency-1.out" &
PID_ONE=$!
"${PSQL[@]}" -d paid_compat -v uid=00000000-0000-0000-0000-000000000002 -v key=concur-2-xxxx \
  -f sql/paid-bookings/concurrency-test.sql >"$PG_ROOT/concurrency-2.out" &
PID_TWO=$!
wait "$PID_ONE"
wait "$PID_TWO"
HOLD_COUNT="$("${PSQL[@]}" -d paid_compat -t -A -c "SELECT count(*) FROM paid_bookings WHERE schedule_id='20000000-0000-0000-0000-0000000000cc'")"
if [[ "$HOLD_COUNT" != "1" ]]; then
  echo "FAIL: concurrent holds created $HOLD_COUNT rows" >&2
  exit 1
fi
echo "OK: concurrent holds for one seat created exactly 1 row"

"${PSQL[@]}" -d paid_compat -f sql/paid-bookings/down-test.sql

# Complete reverse-order rollback on a separate database with zero schedules and zero financial rows.
"${PSQL[@]}" -d postgres -c 'CREATE DATABASE paid_empty_rollback' >/dev/null
"${PSQL[@]}" -d paid_empty_rollback -f sql/paid-bookings/schema-fixture.sql >/dev/null
"${PSQL[@]}" -d paid_empty_rollback -f sql/resident-checkins/up.sql >/dev/null
"${PSQL[@]}" -d paid_empty_rollback -f sql/paid-bookings/up.sql >/dev/null
"${PSQL[@]}" -d paid_empty_rollback -f sql/paid-bookings/search-path-hardening.sql >/dev/null
"${PSQL[@]}" -d paid_empty_rollback -f sql/paid-bookings/down.sql >/dev/null
"${PSQL[@]}" -d paid_empty_rollback -f sql/resident-checkins/down.sql >/dev/null
"${PSQL[@]}" -d paid_empty_rollback -f sql/paid-bookings/empty-rollback-test.sql

echo "OK: sequential UP/UP, compatibility suite, fail-closed financial DOWN, and empty DOWN/DOWN completed"
