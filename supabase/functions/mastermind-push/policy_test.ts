import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { canCheckin, eligible, moscowDate, moscowMinutes, parseKind, payload, reminderKind } from './policy.ts';

Deno.test('Reminder one calendar day before task deadline', () => {
  assertEquals(reminderKind('2026-10-22', '2026-10-21'), 'day_before');
  assertEquals(reminderKind('2026-10-23', '2026-10-21'), null);
});
Deno.test('Reminder on task deadline day, not after', () => {
  assertEquals(reminderKind('2026-10-21', '2026-10-21'), 'due_day');
  assertEquals(reminderKind('2026-10-20', '2026-10-21'), null);
});
Deno.test('Completed tasks receive no reminders', () => {
  assertEquals(eligible({ is_completed: true, is_failed: false, approval_status: 'approved' }, true), false);
  assertEquals(eligible({ is_completed: false, is_failed: false, approval_status: 'approved' }, true), true);
});
Deno.test('Failed and unapproved tasks receive no reminders', () => {
  assertEquals(eligible({ is_completed: false, is_failed: true, approval_status: 'approved' }, true), false);
  assertEquals(eligible({ is_completed: false, is_failed: false, approval_status: 'pending' }, true), false);
});
Deno.test('Inactive members receive no reminders', () => {
  assertEquals(eligible({ is_completed: false, is_failed: false, approval_status: null }, false), false);
});
Deno.test('Deadline calendar uses Moscow even around UTC midnight', () => {
  assertEquals(moscowDate(new Date('2026-10-21T21:30:00Z')), '2026-10-22');
});
Deno.test('Check-in open on meeting day until 23:55 MSK', () => {
  // Meeting 2026-10-22 13:00 MSK = 10:00 UTC
  const meeting = '2026-10-22T10:00:00Z';
  assertEquals(canCheckin(meeting, new Date('2026-10-22T09:00:00Z')), true); // 12:00 MSK
  assertEquals(canCheckin(meeting, new Date('2026-10-22T20:55:00Z')), true); // 23:55 MSK
  assertEquals(canCheckin(meeting, new Date('2026-10-22T20:56:00Z')), false); // 23:56 MSK
});
Deno.test('Check-in closed on other days', () => {
  const meeting = '2026-10-22T10:00:00Z';
  assertEquals(canCheckin(meeting, new Date('2026-10-21T09:00:00Z')), false);
  assertEquals(canCheckin(meeting, new Date('2026-10-23T09:00:00Z')), false);
});
Deno.test('Moscow minutes computed in MSK', () => {
  assertEquals(moscowMinutes(new Date('2026-10-22T20:55:00Z')), 23 * 60 + 55);
});
Deno.test('Job kind defaults to tasks and rejects unknown values', () => {
  assertEquals(parseKind(undefined), 'tasks');
  assertEquals(parseKind('meetings'), 'meetings');
  assertEquals(parseKind('auto_absent'), 'auto_absent');
  assertEquals(parseKind('broadcast'), null);
});
Deno.test('Meeting reminder payload mentions the 23:55 MSK deadline', () => {
  assertEquals(payload('meeting').body, 'Сегодня встреча мастермайнда. Отметьтесь в приложении до 23:55 МСК.');
});
