# Mastermind deadline reminders

Status: deployed, NOT scheduled. Six policy tests pass. Invalid credentials return 401.
The existing public app key also returned 401 during dry-run verification; correct the connected project key before scheduling. Existing remote VAPID secret presence is not verified by the workspace secrets list. Do not rotate VAPID keys casually: existing device subscriptions depend on the public key.

Requires `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY`, `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` in the connected Supabase Edge Function environment. Never put private keys in code, SQL or tables.

POST `{ "dry_run": true }` with project anon key in `apikey` and `Authorization: Bearer ...` validates configuration without sending or claiming. POST `{}` processes eligible reminders. No arbitrary dates, recipients or text are accepted. This fixed-purpose idempotent endpoint may be invoked using the public project key; privileged claims are not exposed to clients.

After successful dry run, schedule one daily invocation at 07:00 UTC (10:00 Moscow), body `{}`, stable job name `mastermind-push`. Date-only deadlines are evaluated in Europe/Moscow: tomorrow and today. Existing Telegram reminder jobs remain unchanged.

Only active members, approved or admin-created incomplete/nonfailed tasks and active tracks (or legacy untracked tasks) qualify. Each task/deadline/kind is claimed once, and unsuccessful claims can retry after 15 minutes on a later invocation. Successful delivery to at least one device marks that reminder sent. Device-specific partial failures do not resend to already successful devices. Provider acceptance is not proof of display on a device. A process crash after delivery but before recording success may cause a retry duplicate. Notifications expire after one hour at the push provider.

Operational rollback: if enabled, find this exact job in `cron.job`, then unschedule it by its actual job id. This stops pushes without removing tasks or subscriptions. Additive schema rollback, only after separately approving data loss:

```sql
DROP FUNCTION public.claim_mastermind_push_reminders(date);
DROP TABLE public.mastermind_task_reminders;
```

Keep the existing subscription controls, service worker, Telegram Mini App and task completion logic unchanged.