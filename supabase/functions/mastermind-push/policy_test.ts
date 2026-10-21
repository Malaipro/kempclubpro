import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { eligible, moscowDate, reminderKind } from './policy.ts';

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