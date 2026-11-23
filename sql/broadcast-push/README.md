# broadcast-push — approved implementation

User approved `APPROVE BREAKING broadcast-push`. Target: KEMP `wfjvjvbjjxcgkaolkgdq`; never change MIRA config or deploy via it.

- UP applied through the migration tool: nullable `push_sent`, `push_subscribed`, `push_failed`, `push_started_at` on `broadcast_messages`; `internal_settings.broadcast_push_enabled` starts false. DOWN is in `DOWN.sql` (not applied).
- New `broadcast-push` validates the caller JWT and existing server-side `is_admin`. Normal dispatch accepts only stored `broadcastId` (optional read-only `dry_run`). Preview mode returns audience/subscription counts without sending. Test mode uses only the fixed Dmitriy 116 account and harmless Home payload.
- Audience matches Telegram's status mapping (`intensive_active`, `club_resident`, `alumni`) or an explicit target list, but does not require Telegram binding. Only approved users qualify; an explicit empty target list sends to nobody. Club-event pushes require resident status; intensive-event pushes require the matching active participant stream. Existing booking and payment rules remain unchanged.
- Do not use `get_broadcast_audience`: its current implementation requires Telegram binding and admin role specifically, so it would incorrectly omit push-only subscribers. Read profiles with the existing status mapping instead; no role/RLS edits.
- Use existing Supabase VAPID secrets. Expired 404/410 subscriptions are removed; other errors leave subscriptions intact. Counts represent unique users, not devices.
- `push_started_at` is an atomic claim: concurrent/repeated calls cannot redeliver this broadcast. Interrupted dispatch is not auto-retried (at-most-once attempt), avoiding duplicate notifications; inspect logs and stored results before any manual recovery.
- Event URL uses the already implemented `/app?section=schedule&event=<uuid>`, not the nonexistent `/app/schedule` route. App-shell worker is untouched; this is messaging only.
- Production switch must remain false until the single-account provider acceptance test succeeds. Provider acceptance is not proof that a phone displayed/opened the notification; confirm that separately with the recipient.
- No Telegram, intensive summaries, payment changes or publication.

## Verification on 2026-11-23
- Deployed only `broadcast-push` through the connected KEMP tool; MIRA config unchanged.
- Existing administrator signed in through `/app/login`; server confirmed `is_admin` before sending.
- Fixed-account dry run: configured true, total 1, subscribed 1, enabled false. Test dispatch: sent 1, subscribed 1, failed 0, expired 0. Only after that result was the switch enabled through a second migration.
- Authenticated `/dashboard` → Рассылки: real preview returned «Пуш получат: 11 из 52»; event selector showed themes, Moscow times and «Без темы». No broad dispatch or bookings performed.
- Eight Deno policy tests and eleven frontend tests passed. Mobile mock flow ends with «Вы записаны», no overflow or page errors. Physical-phone receipt/opening and live participant booking remain unverified; no publication performed.
- Migration reported 239 pre-existing security findings and no new findings. They were not changed in this task.

Disable immediately with a migration setting `broadcast_push_enabled` to `false`; restore the prior frontend files with `git restore --source=c204274 -- src/components/admin/BroadcastManagement.tsx src/components/web-app/broadcastPush.ts src/components/web-app/broadcastPush.test.ts src/components/web-app/BroadcastPushPreview.tsx`. Removing schema fields is optional and requires separate review.
