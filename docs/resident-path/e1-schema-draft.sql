-- KEMP / E1 paid booking: DRAFT FOR REVIEW ONLY
-- DO NOT APPLY TO PRODUCTION. Not a Supabase migration.
-- Prepared against read-only schema inventory of project wfjvjvbjjxcgkaolkgdq.
-- Generate an actual migration with 'supabase migration new' in the approved
-- TEST environment, then move reviewed statements into its generated file.
-- The application, bot, production DB, and existing registrations are untouched.

-- 1) Additive columns on the existing schedule.
alter table public.schedules
  add column if not exists is_paid boolean not null default false,
  add column if not exists price_total_rub integer,
  add column if not exists prepayment_rub integer,
  add column if not exists cash_balance_rub integer,
  add column if not exists payment_url text,
  add column if not exists payment_qr_storage_path text,
  add column if not exists payment_window_minutes integer not null default 120,
  add column if not exists cancellation_terms text;

-- Cost invariants are illustrative and must be reviewed against actual event data.
-- Existing events default free. Do not set is_paid=true until E1+E2 validated.
alter table public.schedules
  add constraint e1_paid_event_prices_ck check (
    (
      is_paid = false
    ) or (
      price_total_rub is not null
      and prepayment_rub is not null
      and cash_balance_rub is not null
      and price_total_rub > 0
      and prepayment_rub > 0
      and cash_balance_rub >= 0
      and prepayment_rub + cash_balance_rub = price_total_rub
    )
  ),
  add constraint e1_payment_window_ck check (
    payment_window_minutes between 5 and 10080
  );

-- 2) Retain legacy attendance column and all existing registrations.
-- Historical bookings keep confirmed/not_required defaults.
alter table public.schedule_participants
  add column if not exists booking_status text not null default 'confirmed',
  add column if not exists payment_status text not null default 'not_required',
  add column if not exists hold_expires_at timestamptz,
  add column if not exists payment_reported_at timestamptz,
  add column if not exists payment_confirmed_at timestamptz,
  add column if not exists payment_confirmed_by uuid,
  add column if not exists prepayment_received_rub integer not null default 0,
  add column if not exists cash_received_rub integer not null default 0,
  add column if not exists booking_source text not null default 'legacy',
  add column if not exists booking_idempotency_key text;

alter table public.schedule_participants
  add constraint e1_booking_status_ck check (
    booking_status in ('hold','pending_review','confirmed','cancelled','expired','rejected')
  ),
  add constraint e1_payment_status_ck check (
    payment_status in ('not_required','awaiting','reported','prepaid','paid_full','refunded','partially_refunded','rejected')
  ),
  add constraint e1_payments_nonnegative_ck check (
    prepayment_received_rub >= 0 and cash_received_rub >= 0
  ),
  add constraint e1_booking_source_ck check (
    booking_source in ('legacy','web','tg_bc','tg_gc','admin')
  );

-- Needed only if a new RPC uses an idempotency key. Existing
-- unique(schedule_id,user_id) must be preserved; an expired booking may need
-- safe reactivation instead of a fresh insert.
create unique index if not exists e1_booking_idempotency_uniq
  on public.schedule_participants (booking_idempotency_key)
  where booking_idempotency_key is not null;

-- Intentionally NOT included:
-- * Booking RPCs and server-side BEFORE INSERT/UPDATE protection.
-- * RLS or GRANT changes.
-- * Payment journal (requires full access policy and operational review).
-- * Expiry jobs / cron / webhook notifications.
-- * Money collection, Telegram callbacks, and point awards.
-- These are required for the complete feature and must be tested together.
-- Until then, feature flags remain OFF and no paid event may be published.

-- MANUAL REVIEW-ONLY ROLLBACK SKETCH (not executable automatically):
-- Drop e1_booking_idempotency_uniq; the six E1 constraints; added columns;
-- preserve any booking payment records before removal. Never deploy a DOWN
-- operation to production without an explicit data-retention decision.
