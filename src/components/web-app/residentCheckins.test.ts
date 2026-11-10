import { describe, expect, it } from 'vitest';
import { attendanceStatus, canSelfMark, fullWeekStreak, trainingTotals, weekProgress, type ResidentEvent } from './residentCheckins';

const ev = (p: Partial<ResidentEvent>): ResidentEvent => ({
  schedule_id: Math.random().toString(36), title: 'BJJ', theme: null, start_time: '2026-11-02T16:00:00Z',
  club_kind: 'training_bjj', week_start: '2026-11-02', registered: true, attended: false,
  self_marked_at: null, attended_marked_at: null, ...p,
});
const ok = { attended: true, attended_marked_at: '2026-11-08T10:00:00Z' };
const fullWeek = (w: string) => [
  ev({ week_start: w, club_kind: 'training_bjj', ...ok }),
  ev({ week_start: w, club_kind: 'training_ofp', ...ok }),
  ev({ week_start: w, club_kind: 'training_kick', ...ok }),
];

describe('статусы отметки', () => {
  it('attended=false по умолчанию без решения основателя — «Не отмечался», не «Не был»', () => {
    expect(attendanceStatus(ev({ attended: false }))).toBe('none');
  });
  it('«Я был» без решения — ожидает', () => {
    expect(attendanceStatus(ev({ self_marked_at: '2026-11-02T18:00:00Z' }))).toBe('pending');
  });
  it('решение основателя: подтверждено / не был', () => {
    expect(attendanceStatus(ev(ok))).toBe('confirmed');
    expect(attendanceStatus(ev({ attended: false, attended_marked_at: '2026-11-08T10:00:00Z' }))).toBe('absent');
  });
  it('«Я был» только для записанного, после начала и не позже 7 дней', () => {
    const now = new Date('2026-11-03T10:00:00Z');
    expect(canSelfMark(ev({}), now)).toBe(true);
    expect(canSelfMark(ev({ registered: false }), now)).toBe(false);
    expect(canSelfMark(ev({ start_time: '2026-11-04T10:00:00Z' }), now)).toBe(false);
    expect(canSelfMark(ev({ start_time: '2026-10-20T10:00:00Z' }), now)).toBe(false);
    expect(canSelfMark(ev({ self_marked_at: '2026-11-02T18:00:00Z' }), now)).toBe(false);
  });
});

describe('цель недели', () => {
  it('три подтверждённые плановые тренировки дают 3/3', () => {
    expect(weekProgress(fullWeek('2026-11-02'), '2026-11-02')).toMatchObject({ done: 3, full: true });
  });
  it('ожидающие и непроверенные не засчитываются', () => {
    const w = [ev({ ...ok }), ev({ club_kind: 'training_ofp', self_marked_at: 'x' }), ev({ club_kind: 'training_kick' })];
    expect(weekProgress(w, '2026-11-02').done).toBe(1);
  });
  it('две БЖЖ не заменяют ОФП', () => {
    expect(weekProgress([ev(ok), ev(ok), ev({ club_kind: 'training_kick', ...ok })], '2026-11-02').done).toBe(2);
  });
  it('незаведённое в календаре ОФП помечается и не даёт 3/3', () => {
    const p = weekProgress([ev(ok), ev({ club_kind: 'training_kick', ...ok })], '2026-11-02');
    expect(p.missing).toEqual(['training_ofp']);
    expect(p.full).toBe(false);
  });
  it('перенесённое занятие считается в неделю зачёта, а не в неделю даты', () => {
    const moved = ev({ club_kind: 'training_kick', start_time: '2026-11-10T16:00:00Z', week_start: '2026-11-02', ...ok });
    expect(weekProgress([ev(ok), ev({ club_kind: 'training_ofp', ...ok }), moved], '2026-11-02').full).toBe(true);
    expect(weekProgress([moved], '2026-11-09').done).toBe(0);
  });
});

describe('серии и итоги', () => {
  it('серия считает подряд полные недели и рвётся на неполной', () => {
    const events = [...fullWeek('2026-10-12'), ...fullWeek('2026-10-26'), ...fullWeek('2026-11-02')];
    expect(fullWeekStreak(events, '2026-11-09')).toBe(2);
    expect(fullWeekStreak(events, '2026-11-02')).toBe(2);
  });
  it('итоги по направлениям — только подтверждённые', () => {
    expect(trainingTotals([...fullWeek('2026-11-02'), ev({ self_marked_at: 'x' })])).toEqual({ training_bjj: 1, training_ofp: 1, training_kick: 1, total: 3 });
  });
});
