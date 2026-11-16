import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { recurrencePlan, createClubScheduleFixture, trainingKind, weekAnchor, type ClubFixture, type PreviewSave } from './clubRecurrence';
import { emptyPaidSettings, validatePaidSettings, eventSaveRoute } from '../web-app/paidBooking';
import { canSelfMark, attendanceStatus, weekProgress, type ResidentEvent } from '../web-app/residentCheckins';

const initial: ClubFixture = { id: 'existing', title: 'BJJ', start_time: '2026-11-16T09:00:00.000Z', end_time: '2026-11-16T11:00:00.000Z', location: 'Зал',
  club_kind: 'training_bjj', week_anchor: '2026-11-16', is_active: true, description: null, booking_mode: 'free' };
const plan = (events: ClubFixture[]) => recurrencePlan('2026-11-16','2026-12-07','weekly','12:00','14:00','BJJ',events);
const input = (events: ClubFixture[]): PreviewSave => ({ id: null, title: 'BJJ', location: 'Зал', description: null, paid: emptyPaidSettings, key: 'series-1', occurrences: plan(events).dates });
describe('club recurrence Preview business rules', () => {
  it('four Mondays inclusive, one existing and three new', () => {
    const p = plan([initial]);
    assert.deepEqual(p.dates.map(d => d.date), ['2026-11-16','2026-11-23','2026-11-30','2026-12-07']);
    assert.equal(p.dates.filter(d => d.exists).length, 1);
    assert.equal(p.dates.filter(d => !d.exists).length, 3);
  });
  it('save then retry then new key still yields exactly four sessions', () => {
    const api = createClubScheduleFixture([initial]);
    api.save(input(api.list())); api.save(input(api.list())); api.save({ ...input(api.list()), key: 'new-key' });
    assert.equal(api.list().length, 4);
    assert.equal(plan(api.list()).dates.filter(d => d.exists).length, 4);
  });
  it('same Moscow time, location and club training kind for every occurrence', () => {
    const api = createClubScheduleFixture([initial]); api.save(input(api.list()));
    for (const e of api.list()) { assert.equal(e.start_time.slice(11,16),'09:00'); assert.equal(e.end_time.slice(11,16),'11:00'); assert.equal(e.location,'Зал'); assert.equal(e.club_kind,'training_bjj'); }
    assert.equal(trainingKind('ОФП'),'training_ofp'); assert.equal(trainingKind('Кикбоксинг'),'training_kick');
  });
  it('monthly 31 skips February and April, never drifts to day 28/30', () => {
    const p = recurrencePlan('2027-01-31','2027-05-31','monthly','19:00','21:00','BJJ',[]);
    assert.deepEqual(p.dates.map(d=>d.date),['2027-01-31','2027-03-31','2027-05-31']); assert.deepEqual(p.skipped,['2027-02','2027-04']);
  });
  it('weekly date bounds and invalid end time are enforced', () => {
    assert.equal(recurrencePlan('2026-11-16','2026-11-22','weekly','12:00','14:00','BJJ',[]).dates.length,1);
    assert.ok(recurrencePlan('2026-11-16','2026-11-15','weekly','12:00','14:00','BJJ',[]).error);
    assert.ok(recurrencePlan('2026-11-16','2026-11-16','weekly','14:00','12:00','BJJ',[]).error);
  });
  it('unbooked free training permits self-mark and pending stays 0/3', () => {
    const e: ResidentEvent = { schedule_id: initial.id, title: initial.title, start_time: initial.start_time, club_kind: initial.club_kind, week_start: initial.week_anchor,
      theme: null, registered: false, attended: false, self_marked_at: null, attended_marked_at: null, booking_mode: 'free', schedule_type: 'club', is_active: true };
    assert.equal(canSelfMark(e,new Date('2026-11-16T12:00:00Z')),true);
    const pending = { ...e, self_marked_at: '2026-11-16T12:00:00Z' };
    assert.equal(attendanceStatus(pending),'pending'); assert.equal(weekProgress([pending],'2026-11-16').done,0);
  });
  it('moving across weeks retains original credit week, cancellation affects only one', () => {
    const api = createClubScheduleFixture([initial]); api.save(input(api.list()));
    const move = recurrencePlan('2026-11-24','2026-11-24','weekly','12:00','14:00','BJJ',[]);
    api.save({ ...input(api.list()), id: initial.id, occurrences: move.dates });
    const moved = api.list().find(e=>e.id===initial.id);
    assert.equal(moved?.week_anchor,'2026-11-16'); assert.equal(moved?.start_time,'2026-11-24T09:00:00.000Z');
    assert.equal(weekAnchor('2026-11-24'),'2026-11-23');
    api.cancel(initial.id); assert.equal(api.list().filter(e=>e.is_active).length,3);
  });
  it('single paid save keeps atomic route and payment settings without recurrence', () => {
    const paid = { ...emptyPaidSettings, mode: 'paid' as const, price_total_rub: '2000', prepay_rub: '500', max_participants: '10', payment_link: 'https://example.test/payment' };
    assert.equal(validatePaidSettings(paid).ok,true); assert.equal(eventSaveRoute(true,'paid',false,'ready'),'atomic');
    const api = createClubScheduleFixture([]);
    api.save({ ...input([]), title: 'Встреча клуба', paid, occurrences: [plan([]).dates[0]] });
    assert.equal(api.list().length,1); assert.equal(api.list()[0].booking_mode,'paid'); assert.equal(api.list()[0].paid?.prepay_rub,'500');
  });
});