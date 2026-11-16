# Attendance without advance booking — prepared only

## Changes
- «Я был» is in the current-week training row, from start through exactly 7 days (inclusive).
- Without registration it is available only with explicit free + active + club training metadata. Missing metadata does not grant access.
- Success becomes «Ожидает подтверждения»; pending/confirmed/absent hide the button. Founder decisions and history are preserved.
- `up.sql` replaces only `request_attendance_web` and extends the existing reader with booking_mode, schedule_type, is_active. Event row locking and the existing unique(schedule_id,user_id) prevent duplicate creation; replays return the same request ID/timestamp.
- Other events still require existing participation. Paid guard, resident approval, intensive, founder authorization, ACL, rewards and notification code are unchanged.

## Preview
Development-only `/app/preview/checkins` shows a fixed test week: Mon 16 Nov BJJ already started, Wed OFP and Fri kickboxing upcoming. No session, Supabase call, booking or notification is made. The actual view is reused with an injected fixture API; production builds do not register this route. Refresh resets test data.

## Validation
- 16 unit/regression tests pass (residentCheckins + clubBooking).
- 22 isolated PostgreSQL assertions pass, including access, free unregistered creation, paid/lecture registration requirements, inactive/intensive exclusion, exact boundaries, replay, preserved positive/negative decisions and UP/DOWN/UP.
- A further parallel-session assertion passes: both requests return one ID and the same timestamp, exactly one row remains.
- Browser: desktop 1280×1800 and mobile 390×844; in-row click without registration changes to pending, repeat button disappears, no runtime errors or horizontal overflow. Mock-only; real signed-in flow not tested against external Supabase.
- Preview build telemetry: build OK. No manual build/typecheck invoked.

## Enable / rollback — NOT executed
1. Separately approve production use. Recheck live function definitions, ACL, unique constraint and attendance/paid triggers against this baseline.
2. Review existing `trg_notify_booking_change`: creating participation invokes that existing trigger; notification routing is not altered here. Check it before enabling to avoid unwanted production notifications.
3. Apply the prepared UP via the approved migration process, then release the UI and test one approved resident. No migrations or Edge Functions are in auto-deploy paths.
4. Roll back with `down.sql` and the previous UI release; existing requests and founder decisions are not deleted. Do not use this snapshot if functions changed after 16 Nov without re-review.

Local test runner requires explicit `/tmp` PostgreSQL socket and a new disposable database; it cannot target a hosted database by inheriting PGHOST.