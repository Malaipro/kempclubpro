# Tasks

- [x] Implement approved broadcast push in KEMP: audience targeting, existing VAPID secrets, history counts, event deep links; authenticated fixed-account provider test accepted 1/1. No publication or Telegram changes.
- [x] Show event theme (or «Без темы») and Moscow time in the broadcast event selector, verified in the authenticated admin UI.
- [ ] Confirm text push displays on Dmitriy 116 iPhone after WebCrypto encryption fix (payload-less test displayed; text test accepted 1/1) — waits for user confirmation.
- [ ] Apply the same encryption fix to mastermind-push — waits for user approval (production reminder function).

- [x] Add and verify recurring club sessions in isolated Preview: existing occurrence + three new, retry deduplication, monthly day 31, attendance without booking, moved-week preservation, and single paid event. Persistent server recurrence is not activated in this Preview-only phase.

- [x] Verify resident → founder → resident attendance flow using a shared in-memory store on the existing checkins Preview.

- [x] Add a local-only resident Home goal Preview with three mobile states, reward selection/change/removal, and verify no purchases or coin deductions.

- [x] Separate weekly training from booked club events, preserve schedule booking actions, suppress new-booking notifications for attendance-only requests in staging SQL, and verify mobile Preview with a screenshot.

- [x] Add in-row resident attendance requests without advance booking for free club training; prepare isolated SQL UP/DOWN and regression tests, and verify a development-only test week in Preview. No production changes.

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