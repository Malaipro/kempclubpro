# Tasks

- [ ] Ensure /app event booking uses the club calendar, never the intensive calendar; preserve existing resident-only access and intensive viewing.
- [ ] Intensive notifications: participant app push, founder-only Telegram team summaries and Taynik generation — KEMP/Amvera contour wfjvjvbjjxcgkaolkgdq confirmed in writing; remote push/Telegram credentials and deployment targeting must still be verified before server changes.
- [x] Daily check-in UI cache: account-scoped browser persistence and Moscow date expiry; three rule tests and isolated browser remount check pass. No authenticated production flow verified.
- [ ] Daily check-in server hydration across devices and Moscow server date — requires separately approved authorized server read path; activity_checkins has no exposed table grants.

- [x] Connect Taynik AI gateway (taynik.store/v1) via custom connector udc_taynik; key saved as UDC_TAYNIK_API_KEY; verified GET /v1/models returns 200 with 45 models.
- [x] Resident path: audit and full staged plan (E0–E8) approved; no code/DB changes.
- [x] Plan v3 (founder corrections) approved; A0 read-only ACL/status audit done (sql/resident-path/audit-a0.md).
- [x] E0 written contour confirmation: user confirmed KEMP/Amvera uses wfjvjvbjjxcgkaolkgdq; config.toml remains MIRA and must not drive KEMP deployment.
- [ ] E1–E8 resident path implementation — blocked: E0, founder Telegram ID(s), admin_adjust_coins narrowing approval, rank list; each stage needs separate APPROVE BREAKING.

- [x] Reset the three approved stream-8 participants: protected snapshot of 451 removed progress records, zero ratings, unchanged coins and unrelated data; atomic dry-run and 16 live SQL checks passed. Review-only restore saved; authenticated UI checks unavailable for external unmanaged Supabase.

- [x] Activate stream 8 (2026-11-08 through 2026-12-26) with 39 approved events; verify database readback, zero participants/bookings/assignments and seven passing schedule tests. Assignments deferred by user; real authenticated UI check unavailable for external unmanaged Supabase.

- [x] Group mastermind topics, plans and tasks by track; show track information, participants and dashboards in superadmin cabinet and participant /app; keep legacy records separate.
- [x] Verify selected-track plan/task/outcome/report readback, admin filtering, legacy isolation and mobile layout with isolated UI data; five track-rule tests pass.
- [x] Implement two-month mastermind tracks, goals and outcome history — previous approved phase.
- [x] Add shared meeting dates, manual attendance and participant/card/group summaries — previous approved phase.
- [x] Add mastermind-push function, service-only reminder claims, deadline deduplication, expired-subscription cleanup and six passing rule tests.
- [ ] Activate daily mastermind-push schedule and verify delivery — blocked: configured public app key returns 401; remote VAPID secret presence cannot be verified. No schedule created.
- [ ] Verify participant/admin mastermind flows — blocked: authenticated end-to-end checks unavailable for external unmanaged Supabase.

- [x] Apply isolated dark glass styling to all /app screens and login; preserve approved Home and all functionality/access.
- [x] Verify all sections, chat bubbles, forms, schedule expansion and shop dialog with isolated data for both statuses at 1280, 390 and 320 widths; no page errors or horizontal overflow.

- [x] Apply approved photo and glass styling to /app Home and bottom navigation without changing other pages.
- [x] Generate thematic tile, athlete and reward imagery.
- [x] Verify both status layouts, images and Home navigation callbacks with isolated data at 1280, 390 and 320 widths.

- [x] Apply approved tactical styling only to /app Home for both statuses.
- [x] Verify layout, equal tiles and navigation at desktop and mobile sizes with isolated data.

- [x] Move Chat navigation to prominent Home tiles for both participant statuses.
- [x] Apply the agreed isolated dark palette to both /app chats.
- [x] Verify both chats visually with isolated messages and check that Chat is absent from navigation.
- [ ] Verify the real signed-in Home-to-Chat flow — blocked: authenticated end-to-end checks are unavailable for external unmanaged Supabase.