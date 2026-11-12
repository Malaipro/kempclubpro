import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { PAID_STATE_LABEL, paidCardState, validatePaidSettings, emptyPaidSettings, type PaidEventInfo } from './paidBooking';

const base: PaidEventInfo = { schedule_id: 's', price_total_rub: 5000, prepay_rub: 2000, cash_rub: 3000, payment_window_minutes: 120,
  cancellation_terms: null, payment_qr_url: 'https://qr', payment_link: null, max_participants: 2, seats_left: 1, legacy_registered: false, booking: null };
const now = new Date('2026-11-11T10:00:00Z');
const booking = (booking_status: never | string, hold = '2026-11-11T11:00:00Z') => ({ ...base, booking: { id: 'b', booking_status, payment_status: 'unpaid', hold_expires_at: hold, cash_received_rub: null } } as PaidEventInfo);

describe('paid card state', () => {
  it('free seat → can book', () => assert.equal(paidCardState(base, now), 'can_book'));
  it('no seats', () => assert.equal(paidCardState({ ...base, seats_left: 0 }, now), 'no_seats'));
  it('active hold', () => assert.equal(paidCardState(booking('hold'), now), 'hold'));
  it('expired hold returns to booking', () => assert.equal(paidCardState(booking('hold', '2026-11-11T09:00:00Z'), now), 'can_book'));
  it('reported payment is not a registration', () => {
    const s = paidCardState(booking('pending_review'), now);
    assert.equal(s, 'pending_review');
    assert.doesNotMatch(PAID_STATE_LABEL[s], /Вы записаны/);
    assert.doesNotMatch(PAID_STATE_LABEL.hold, /Вы записаны/);
  });
  it('only founder-confirmed booking says registered', () => assert.match(PAID_STATE_LABEL[paidCardState(booking('confirmed'), now)], /Вы записаны/));
  it('rejected booking can book again', () => assert.equal(paidCardState(booking('rejected'), now), 'can_book'));
  it('legacy registration preserved', () => assert.equal(paidCardState({ ...base, legacy_registered: true }, now), 'registered_legacy'));
});

describe('paid settings validation', () => {
  const ok = { ...emptyPaidSettings, mode: 'paid' as const, price_total_rub: '5000', prepay_rub: '2000', max_participants: '12', payment_qr_url: 'https://qr.nspk.ru/abc' };
  it('defaults are free', () => assert.deepEqual(validatePaidSettings(emptyPaidSettings), { ok: true, value: { mode: 'free' } }));
  it('default payment window 120 minutes', () => assert.equal(emptyPaidSettings.payment_window_minutes, '120'));
  it('cash remainder = total − prepay', () => { const r = validatePaidSettings(ok); assert.ok(r.ok && r.value.mode === 'paid' && r.value.cash_rub === 3000); });
  it('prepay must be > 0', () => assert.equal(validatePaidSettings({ ...ok, prepay_rub: '0' }).ok, false));
  it('prepay cannot exceed total', () => assert.equal(validatePaidSettings({ ...ok, prepay_rub: '6000' }).ok, false));
  it('requires founder QR or link', () => assert.equal(validatePaidSettings({ ...ok, payment_qr_url: '' }).ok, false));
  it('rejects non-https link', () => assert.equal(validatePaidSettings({ ...ok, payment_link: 'http://x' }).ok, false));
  it('requires seat limit', () => assert.equal(validatePaidSettings({ ...ok, max_participants: '' }).ok, false));
  it('rejects fractional rubles', () => assert.equal(validatePaidSettings({ ...ok, price_total_rub: '50.5' }).ok, false));
});

import { bookingGate, holdKeyScope, parsePaidMeta } from './paidBooking';
describe('fail-closed booking gate (P0-1)', () => {
  const meta = parsePaidMeta({ ok: true, modes: { f: 'free', s: 'paid', x: 'paid' }, events: [base] });
  it('flag off keeps old free behaviour', () => assert.equal(bookingGate('s', { status: 'error' }, false).kind, 'free'));
  it('failed paid metadata blocks every booking', () => {
    assert.equal(bookingGate('f', parsePaidMeta(null), true).kind, 'blocked');
    assert.equal(bookingGate('s', parsePaidMeta({ ok: false, error: 'boom' }), true).kind, 'blocked');
  });
  it('still loading blocks booking', () => assert.equal(bookingGate('f', { status: 'loading' }, true).kind, 'blocked'));
  it('known free event books as before', () => assert.equal(bookingGate('f', meta, true).kind, 'free'));
  it('paid event uses paid card', () => assert.equal(bookingGate('s', meta, true).kind, 'paid'));
  it('stale list: paid without details is blocked, not free', () => assert.equal(bookingGate('x', meta, true).kind, 'blocked'));
  it('unknown event (not in modes) is blocked', () => assert.equal(bookingGate('new', meta, true).kind, 'blocked'));
  it('response without modes is an error', () => assert.equal(parsePaidMeta({ ok: true, events: [] }).status, 'error'));
});
describe('idempotency key scope (P0-3)', () => {
  it('same lifecycle keeps key scope (network retry)', () => assert.equal(holdKeyScope(base), holdKeyScope({ ...base, seats_left: 0 })));
  it('after hold created scope changes', () => assert.notEqual(holdKeyScope(base), holdKeyScope(booking('hold'))));
  it('after expiry a new booking cycle gets a new key', () => assert.notEqual(holdKeyScope(booking('hold')), holdKeyScope(booking('expired'))));
});

import { eventSaveRoute } from './paidBooking';
describe('event save route (P0-2)', () => {
  it('flag off: old save path', () => assert.equal(eventSaveRoute(false, 'paid', true, 'loading'), 'legacy'));
  it('free event keeps old path', () => assert.equal(eventSaveRoute(true, 'free', false, 'ready'), 'legacy'));
  it('paid event uses one atomic server call', () => assert.equal(eventSaveRoute(true, 'paid', false, 'ready'), 'atomic'));
  it('paid → free also atomic', () => assert.equal(eventSaveRoute(true, 'free', true, 'ready'), 'atomic'));
  it('save blocked while settings load', () => assert.equal(eventSaveRoute(true, 'free', false, 'loading'), 'blocked'));
  it('save blocked when settings failed to load', () => assert.equal(eventSaveRoute(true, 'free', false, 'error'), 'blocked'));
});
