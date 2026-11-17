#!/usr/bin/env bash
# Disposable local PostgreSQL verification. Never connects to Supabase or a network service.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$REPO_ROOT"

PSQL_BIN="$(command -v psql)"
INITDB_BIN="$(command -v initdb)"
PG_CTL_BIN="$(command -v pg_ctl)"
PG_ROOT="$(mktemp -d "${TMPDIR:-/tmp}/kemp-club-recurring.XXXXXX")"
PG_PORT="$((55000 + ($$ % 500)))"

cleanup() {
  "$PG_CTL_BIN" -D "$PG_ROOT/data" stop -m fast >/dev/null 2>&1 || true
  rm -rf -- "$PG_ROOT"
}
trap cleanup EXIT INT TERM

"$INITDB_BIN" -U postgres -D "$PG_ROOT/data" -A trust --no-locale -E UTF8 >/dev/null
"$PG_CTL_BIN" -D "$PG_ROOT/data" -o "-p $PG_PORT -k $PG_ROOT -c listen_addresses=''" -l "$PG_ROOT/postgres.log" start -w >/dev/null
PSQL=("$PSQL_BIN" -X -h "$PG_ROOT" -p "$PG_PORT" -U postgres -v ON_ERROR_STOP=1)

"${PSQL[@]}" -d postgres -c 'CREATE DATABASE recurring_compat' >/dev/null
"${PSQL[@]}" -d recurring_compat -f sql/club-recurring/schema-fixture.sql >/dev/null
"${PSQL[@]}" -d recurring_compat -f sql/resident-checkins-request/up.sql >/dev/null
"${PSQL[@]}" -d recurring_compat -f sql/club-recurring/up.sql >/dev/null
"${PSQL[@]}" -d recurring_compat -f sql/club-recurring/isolated-test.sql

"${PSQL[@]}" -d recurring_compat -f sql/club-recurring/concurrency-test.sql >"$PG_ROOT/concurrency-1.out" &
PID_ONE=$!
"${PSQL[@]}" -d recurring_compat -f sql/club-recurring/concurrency-test.sql >"$PG_ROOT/concurrency-2.out" &
PID_TWO=$!
wait "$PID_ONE"
wait "$PID_TWO"

CONCURRENT_SCHEDULES="$("${PSQL[@]}" -d recurring_compat -t -A -c "SELECT count(*) FROM public.schedules WHERE club_kind='training_kick' AND location='Зал concurrency'")"
CONCURRENT_OCCURRENCES="$("${PSQL[@]}" -d recurring_compat -t -A -c "SELECT count(*) FROM public.club_recurring_occurrences WHERE original_location='зал concurrency'")"
if [[ "$CONCURRENT_SCHEDULES" != "4" || "$CONCURRENT_OCCURRENCES" != "4" ]]; then
  echo "FAIL: concurrent saves left schedules=$CONCURRENT_SCHEDULES occurrences=$CONCURRENT_OCCURRENCES" >&2
  exit 1
fi
echo "OK: two concurrent saves left exactly four schedules and four occurrence claims"

# A destructive rollback must refuse to erase recurrence history and leave the schema intact.
if "${PSQL[@]}" -d recurring_compat -f sql/club-recurring/down.sql >"$PG_ROOT/history-down.out" 2>&1; then
  echo "FAIL: down.sql removed non-empty recurrence history" >&2
  exit 1
fi
HISTORY_TABLES="$("${PSQL[@]}" -d recurring_compat -t -A -c "SELECT count(*) FROM pg_class WHERE oid IN ('public.club_recurring_series'::regclass,'public.club_recurring_occurrences'::regclass)")"
if [[ "$HISTORY_TABLES" != "2" ]]; then
  echo "FAIL: rejected history rollback changed the recurrence schema" >&2
  exit 1
fi
echo "OK: down.sql refused non-empty history and preserved the recurrence schema"

"${PSQL[@]}" -d postgres -c 'CREATE DATABASE recurring_empty_rollback' >/dev/null
"${PSQL[@]}" -d recurring_empty_rollback -f sql/club-recurring/schema-fixture.sql >/dev/null
"${PSQL[@]}" -d recurring_empty_rollback -f sql/club-recurring/up.sql >/dev/null
"${PSQL[@]}" -d recurring_empty_rollback -f sql/club-recurring/down.sql >/dev/null
"${PSQL[@]}" -d recurring_empty_rollback -f sql/club-recurring/empty-rollback-test.sql

echo "OK: recurrence compatibility, attendance integration, concurrency and empty rollback completed"
