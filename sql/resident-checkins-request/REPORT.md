# Attendance without advance booking — prepared only

## Changes
- «Я был» is in the current-week training row, from start through exactly 7 days (inclusive).
- Without registration it is available only with explicit free + active + club training metadata. Missing metadata does not grant access.
- Success becomes «Ожидает подтверждения»; pending/confirmed/absent hide the button. Founder decisions and history are preserved.
- `up.sql` replaces only `request_attendance_web` and extends the existing reader with booking_mode, schedule_type, is_active. Event row locking and the existing unique(schedule_id,user_id) prevent duplicate creation; replays return the same request ID/timestamp.
- Weekly BJJ/OFP/kickboxing are each rendered once; separate club events exclude these kinds and show only own participation/bookings with API statuses. The reader includes the latest own paid booking without participation.
- Schedule keeps existing free-event registration and paid booking controls; explicit free regular training metadata hides booking controls. The web adapter loads this metadata from the existing club schedule table. Intensive is unchanged.
- Other events still require existing participation. Paid guard, resident approval, intensive, founder authorization, ACL and rewards are unchanged.
- Attendance-only creation inserts `self_marked_at` immediately. Prepared `notify_booking_change` skips only INSERT of a self-marked, active, free club training within the seven-day window. It uses row/event data, no GUC or trigger disabling. Ordinary event registration and cancellation still run the original notification body; DOWN restores the original function.

## Preview
Development-only `/app/preview/checkins` shows a fixed test week: Mon 16 Nov BJJ already started, Wed OFP and Fri kickboxing upcoming, plus a separately registered residents' meeting. No session, Supabase call, booking or notification is made. The actual view is reused with an injected fixture API; production builds do not register this route. Refresh resets test data.

## Validation
- 19 unit/regression tests pass (residentCheckins + clubBooking), including separation of training and bookings and 0/3 pending versus 1/3 confirmed.
- 27 isolated PostgreSQL assertions pass, including previous access/window/replay/rollback checks, reader booking status, no new-booking notification on attendance insert/replay, ordinary registration/cancellation notifications and restoration of original notification behavior on DOWN. Existing notification function and AFTER INSERT/DELETE trigger execute against local `net.http_post` capture; no actual HTTP or secrets are used.
- A further parallel-session assertion passes: both requests return one ID and the same timestamp, exactly one row remains.
- Browser: desktop 1280×1800 and mobile 390×944; BJJ appears once, OFP/kickboxing show future dates, separate meeting shows «Вы записаны» and no booking button. One in-row click changes to pending, repeat button disappears, counter stays 0/3, no runtime errors or horizontal overflow. Mock-only; real signed-in flow not tested against external Supabase.
- Preview build telemetry: build OK. No manual build/typecheck invoked.

## Enable / rollback — NOT executed
1. Separately approve production use. Recheck live function definitions, ACL, unique constraint and attendance/paid triggers against this baseline.
2. Recheck the existing `trg_notify_booking_change` and its current function against the preserved `notification-baseline.sql`; apply the narrow function change together with the attendance insert update. Trigger ACL/routing and notification sender are unchanged; verify the two notification cases before release.
3. Apply the prepared UP via the approved migration process, then release the UI and test one approved resident. No migrations or Edge Functions are in auto-deploy paths.
4. Roll back with `down.sql` and the previous UI release; existing requests and founder decisions are not deleted. Do not use this snapshot if functions changed after 16 Nov without re-review.

Local test runner requires explicit `/tmp` PostgreSQL socket and a new disposable database; it cannot target a hosted database by inheriting PGHOST.