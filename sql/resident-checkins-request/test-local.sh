#!/usr/bin/env bash
set -euo pipefail
# Require an explicit local socket and disposable DB. Never inherit a hosted PGHOST.
: "${ATTENDANCE_TEST_SOCKET:?Set a local socket under /tmp}"
: "${ATTENDANCE_TEST_DB:?Set a new disposable local database name}"
case "$ATTENDANCE_TEST_SOCKET" in /tmp/*) ;; *) echo 'Local /tmp socket required'; exit 1;; esac
args=(-h "$ATTENDANCE_TEST_SOCKET" -p "${ATTENDANCE_TEST_PORT:-55439}" -U "${ATTENDANCE_TEST_USER:-lovable}" -d "$ATTENDANCE_TEST_DB" -v ON_ERROR_STOP=1)
psql "${args[@]}" -f "$(dirname "$0")/regression.sql"
psql "${args[@]}" -c "update public.schedules set start_time=now()-interval '1 hour' where id='00000000-0000-4000-8000-000000000010';"
query="set test.uid='00000000-0000-4000-8000-000000000001'; select request_attendance_web('00000000-0000-4000-8000-000000000010');"
psql "${args[@]}" -c "$query" & first=$!
psql "${args[@]}" -c "$query" & second=$!
wait "$first"; wait "$second"
psql "${args[@]}" -c "select public.test_assert(count(*)=1,'parallel requests create one row') from public.schedule_participants where schedule_id='00000000-0000-4000-8000-000000000010';"