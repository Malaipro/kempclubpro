import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  clubRecurrencePlan,
  clubTrainingKind,
  clubWeekAnchor,
  parseClubRecurrencePreview,
} from './clubRecurrence';
import { emptyPaidSettings, eventSaveRoute, validatePaidSettings } from '../web-app/paidBooking';

describe('club recurring calendar rules', () => {
  it('plans four Mondays inclusively in Moscow time', () => {
    const plan = clubRecurrencePlan('2026-11-16', '2026-12-07', 'weekly', '06:00', '07:30');
    assert.equal(plan.error, null);
    assert.deepEqual(plan.dates.map((item) => item.date), ['2026-11-16', '2026-11-23', '2026-11-30', '2026-12-07']);
    assert.deepEqual(plan.dates.map((item) => item.start), [
      '2026-11-16T03:00:00.000Z',
      '2026-11-23T03:00:00.000Z',
      '2026-11-30T03:00:00.000Z',
      '2026-12-07T03:00:00.000Z',
    ]);
  });

  it('skips months without the 31st instead of drifting', () => {
    const plan = clubRecurrencePlan('2027-01-31', '2027-05-31', 'monthly', '19:00', '21:00');
    assert.equal(plan.error, null);
    assert.deepEqual(plan.dates.map((item) => item.date), ['2027-01-31', '2027-03-31', '2027-05-31']);
    assert.deepEqual(plan.skipped, ['2027-02', '2027-04']);
  });

  it('preserves the original Monday anchor independently of a later move', () => {
    assert.equal(clubWeekAnchor('2026-11-30'), '2026-11-30');
    assert.equal(clubWeekAnchor('2026-12-03'), '2026-11-30');
  });

  it('normalizes only supported free training titles', () => {
    assert.equal(clubTrainingKind('BJJ'), 'training_bjj');
    assert.equal(clubTrainingKind(' БЖЖ '), 'training_bjj');
    assert.equal(clubTrainingKind('ОФП'), 'training_ofp');
    assert.equal(clubTrainingKind('Кикбоксинг'), 'training_kick');
    assert.equal(clubTrainingKind('Встреча клуба'), null);
  });

  it('rejects invalid bounds, times and overlong series', () => {
    assert.ok(clubRecurrencePlan('2026-11-16', '2026-11-15', 'weekly', '06:00', '07:00').error);
    assert.ok(clubRecurrencePlan('2026-11-16', '2026-11-16', 'weekly', '07:00', '06:00').error);
    assert.ok(clubRecurrencePlan('2026-01-01', '2040-01-01', 'weekly', '06:00', '07:00').error);
  });

  it('accepts a complete server preview including moved and cancelled occurrences', () => {
    const raw = {
      ok: true,
      total: 4,
      existing: 3,
      create: 1,
      skipped: [],
      occurrences: [
        { date: '2026-11-16', start: '2026-11-16T03:00:00Z', end: '2026-11-16T04:30:00Z', week: '2026-11-16', status: 'existing', schedule_id: 'one' },
        { date: '2026-11-23', start: '2026-11-23T03:00:00Z', end: '2026-11-23T04:30:00Z', week: '2026-11-23', status: 'cancelled', schedule_id: null },
        { date: '2026-11-30', start: '2026-11-30T03:00:00Z', end: '2026-11-30T04:30:00Z', week: '2026-11-30', status: 'moved', schedule_id: 'three' },
        { date: '2026-12-07', start: '2026-12-07T03:00:00Z', end: '2026-12-07T04:30:00Z', week: '2026-12-07', status: 'new', schedule_id: null },
      ],
    };
    assert.deepEqual(parseClubRecurrencePreview(raw), raw);
    assert.equal(parseClubRecurrencePreview({ ...raw, create: 2 }), null);
  });

  it('leaves one-off paid events on the existing atomic route', () => {
    const paid = {
      ...emptyPaidSettings,
      mode: 'paid' as const,
      price_total_rub: '2000',
      prepay_rub: '500',
      max_participants: '10',
      payment_link: 'https://example.test/payment',
    };
    assert.equal(validatePaidSettings(paid).ok, true);
    assert.equal(eventSaveRoute(true, 'paid', false, 'ready'), 'atomic');
    assert.equal(eventSaveRoute(true, 'free', false, 'ready'), 'legacy');
  });
});
