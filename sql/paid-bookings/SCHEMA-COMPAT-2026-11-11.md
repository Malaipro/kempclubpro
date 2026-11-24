# E1 paid-bookings: schema compatibility report (2026-11-11)

## Status and boundary

Implementation and verification were performed only in the Git branch
`feature/paid-bookings-e1-schema-compat`, against disposable local PostgreSQL databases.
The complete local matrix was re-run successfully on 2026-11-13 after the final search-path
hardening was integrated into the fresh migration path.
Production Supabase, Telegram bot, Amvera, Edge Functions, domains and the published site were not
changed or called. The existing "Отметки + Push" block was not edited. No real personal data,
payment credentials, secrets or network notification calls were used.

Production release approval is still absent. The feature flag remains off by default.

## Source schema facts used

The fixture follows the read-only production observations recorded in GitHub issue #3 on
2026-11-11:

- production PostgreSQL is 17.6;
- `schedules.max_participants` is currently `NULL` for all 32 active club events;
- `schedule_participants` has an FK to `auth.users`, uniqueness on `(schedule_id, user_id)`,
  existing RLS/admin-trainer access, and an AFTER INSERT/DELETE notification trigger;
- the real notification function calls `net.http_post`, so production writes are forbidden during
  this compatibility check;
- `resident-checkins/up.sql` must precede `paid-bookings/up.sql`; the founder is the fixed account
  with `super_admin` and `profiles.approved=false`.

The local engine used here was PostgreSQL 17.11 (Homebrew). The [official Supabase changelog](https://supabase.com/changelog.md) was
reviewed on 2026-11-11; no change affecting these SQL constructs was identified. This is still a
production-like fixture, not a dump or proof that every unobserved production object is identical.

## P0 fixes

### 1. Legacy free -> paid conversion

`guard_paid_schedule_settings()` now rejects a transition from `free` to `paid` whenever the event
has any `schedule_participants` row. Because the protection is a table trigger, it covers direct
UPDATE, `paid_event_settings_save` and `paid_event_save`.

Verified:

- zero existing registrations: conversion succeeds for the founder;
- one registration: conversion fails and the free event/registration remain unchanged;
- multiple registrations: atomic event save fails and all rows remain unchanged;
- an event with closed historical paid bookings but no current `schedule_participants` can be
  switched free and later paid again; financial history is retained;
- the three synthetic legacy records remain attached to free events and are not rewritten.

`legacy_registered` remains a defensive read-path fallback for unexpected historical data, but the
new write invariant prevents creating that state through the E1 migration paths.

### 2. Paid-event administration

For an existing paid event, every row change except the technical `updated_at` field is compared
with `to_jsonb(NEW/OLD)` and allowed only for the fixed founder account while it still has
`super_admin`. This automatically protects present and future schedule columns, including
`title`, `start_time`, `end_time` and `is_active`. DELETE of a paid event has the same founder check.

Verified:

- admin, trainer and another `super_admin` cannot edit substantive paid-event fields;
- admin cannot deactivate or delete a paid event;
- founder with `approved=false` can edit/deactivate/reactivate and can delete a paid event with no
  bookings;
- existing admin rights for free events still allow edit and delete;
- paid-event history keeps the existing FK/financial fail-closed behavior.

### 3. Capacity changes

When `max_participants` changes on a paid event, the guard counts:

- existing `schedule_participants` (confirmed paid seats and any defensive legacy row);
- unexpired `hold` rows;
- `pending_review` rows.

A decrease below that count raises `paid_event_capacity_below_reserved`. A decrease exactly to the
occupied count and an increase are allowed. Expired/cancelled/rejected rows do not occupy capacity.
The booking RPC still locks the schedule row `FOR UPDATE`, so concurrent hold creation and capacity
updates serialize on the same event row.

### 4. Production-like local fixture

`schema-fixture.sql` now provides:

- `auth.users`, `profiles`, `user_roles`, trainers/streams/groups and the production-relevant
  schedule columns;
- FKs for schedule/user/instructor/stream/group relations and the unique
  `(schedule_id, user_id)` constraint;
- `anon`, `authenticated` and `service_role` roles;
- RLS on `schedules` and `schedule_participants`, including resident read/insert and
  admin/trainer management policies;
- the existing register functions and updated-at trigger;
- `trg_notify_booking_change` with the same AFTER INSERT/DELETE timing, backed by a local counter
  table instead of HTTP.

All UUIDs and event data in the fixture are synthetic.

### 5. Notification side effects and disable behavior

The no-network stub recorded exactly:

- confirmation: one INSERT notification;
- founder cancellation of that confirmed booking: one DELETE notification;
- repeated confirmation and blocked direct operations: no extra notification.

`disable.sql` only revokes the resident create/report RPCs. It does not convert paid events to free.
Its comments and the DOWN comments now state this precisely. The intended safe sequence is to turn
off `VITE_PAID_BOOKINGS_ENABLED` before running `disable.sql`; the DB invariant remains installed and
continues to reject legacy registration attempts against paid events.

## Database verification

Command:

```bash
bash sql/paid-bookings/run-isolated.sh
```

Result on PostgreSQL 17.11: **144 SQL assertions passed, 0 failed**, plus both orchestration summary
checks passed.

The script creates one disposable local cluster with two databases and never connects to Supabase:

1. Compatibility database:
   `schema-fixture.sql` -> `resident-checkins/up.sql` -> `paid-bookings/up.sql` -> functional and ACL
   tests -> idempotent `search-path-hardening.sql` overlay -> two-session concurrency test ->
   financial-history DOWN refusal -> `disable.sql`.
2. Empty rollback database:
   `schema-fixture.sql` -> both UP files -> search-path overlay -> `paid-bookings/down.sql` ->
   `resident-checkins/down.sql` -> rollback assertions.

Verified scenarios include:

- free registration through the existing web wrapper and direct resident INSERT;
- paid hold, idempotent retry, report-paid, founder confirmation, rejection, expiry, cancellation,
  late payment, cash and refund ledger behavior;
- non-resident/unapproved denial and founder/admin/trainer/other-super-admin boundaries;
- direct authenticated/service-role/server-function attempts cannot bypass the paid invariant;
- two concurrent requests for one seat create exactly one booking row;
- active hold and `pending_review` occupy capacity; expired hold releases it;
- full reverse-order rollback succeeds with zero financial rows and preserves base RLS, FK, UNIQUE,
  notification trigger and legacy web wrapper;
- full DOWN with financial history raises the expected refusal and leaves history intact.

## Application verification

Executed after the SQL changes:

```bash
bun test src/components sql/notification-release sql/stream-8
bunx tsc --noEmit
bun run build
```

Results:

- application/regression tests: **92 passed, 0 failed** across 11 files;
- TypeScript typecheck: passed with no diagnostics;
- Vite production build: passed (2,973 modules transformed);
- build emitted pre-existing non-fatal warnings for stale Browserslist data, a mixed static/dynamic
  `ContactForm.tsx` import and chunks over 500 kB.

The repository-wide unfiltered `bun test` also discovers a Deno-only test importing
`https://deno.land/...`; Bun reports `ENOENT` for that remote Deno import. The scoped application
suite above excludes that incompatible runner target and passes completely.

## Files

- `up.sql`: P0 trigger/invariant fixes.
- `search-path-hardening.sql`: idempotent overlay for databases where an earlier E1 draft already
  created the two append-only/delete guard functions; fresh `up.sql` now pins them directly.
- `down.sql`, `disable.sql`: corrected rollback semantics documentation.
- `schema-fixture.sql`: production-like base schema and no-network notification stub.
- `isolated-test.sql`: free/paid/ACL/capacity/notification/history tests.
- `concurrency-test.sql`: independent-session hold race.
- `down-test.sql`: financial-history refusal and soft-disable assertions.
- `empty-rollback-test.sql`: reverse-order full rollback assertions.
- `run-isolated.sh`: portable disposable PostgreSQL orchestration.

## Still not verified / intentionally not performed

- No migration was applied to production or any remote Supabase project.
- No write smoke-test was performed against the 50 real registrations.
- No real `net.http_post`, Telegram, Edge Function or payment notification was sent.
- No browser E2E was run against live paid RPCs; the schema is intentionally absent from
  production and the feature flag remains off.
- No merge, deploy or release was performed.

Before any future production step, re-read current schema/ACL/trigger definitions, review the exact
SQL diff, obtain separate release authorization and agree on notification behavior for the one-event
smoke test.
