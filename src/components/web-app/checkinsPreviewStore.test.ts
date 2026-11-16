import { it } from 'node:test';
import assert from 'node:assert/strict';
import { createCheckinsPreviewStore } from './checkinsPreviewStore';
import { attendanceStatus, weekProgress, type ResidentEvent } from './residentCheckins';
import type { ResidentCheckinsPayload } from './WebResidentCheckinsView';

const initial: ResidentCheckinsPayload = { ok: true, now: '2026-11-16T12:00:00Z', current_week: '2026-11-16', events: [
  { schedule_id: 'bjj', club_kind: 'training_bjj' }, { schedule_id: 'ofp', club_kind: 'training_ofp' }, { schedule_id: 'kick', club_kind: 'training_kick' },
].map(e => ({ ...e, title: e.schedule_id, theme: null, start_time: '2026-11-16T09:00:00Z', week_start: '2026-11-16',
  registered: false, attended: false, attended_marked_at: null, self_marked_at: null } as ResidentEvent)) };

it('resident request stays 0/3, founder saves presence, resident reads confirmed 1/3', async () => {
  const store = createCheckinsPreviewStore(initial);
  await store.callApi('request_attendance', { schedule_id: 'bjj' });
  const pending = await store.callApi<ResidentCheckinsPayload>('get_resident_checkins');
  assert.equal(attendanceStatus(pending.events[0]), 'pending');
  assert.equal(weekProgress(pending.events, initial.current_week).done, 0);
  const response = await store.attendanceRpc('founder_get_event_attendance', { p_schedule_id: 'bjj' });
  const participants = (response.data as { participants: { user_id: string; self_marked_at: string | null }[] }).participants;
  assert.equal(participants.length, 1);
  assert.equal(participants[0].self_marked_at, initial.now);
  await store.attendanceRpc('founder_confirm_attendance', { p_schedule_id: 'bjj', p_marks: [{ user_id: participants[0].user_id, attended: true }] });
  const confirmed = await store.callApi<ResidentCheckinsPayload>('get_resident_checkins');
  assert.equal(attendanceStatus(confirmed.events[0]), 'confirmed');
  assert.equal(weekProgress(confirmed.events, initial.current_week).done, 1);
  assert.equal(initial.events[0].self_marked_at, null);
});

it('unselected attendance is not marked absent; repeated self-request preserves saved decision', async () => {
  const store = createCheckinsPreviewStore(initial);
  await store.callApi('request_attendance', { schedule_id: 'bjj' });
  await store.attendanceRpc('founder_confirm_attendance', { p_schedule_id: 'bjj', p_marks: [] });
  let result = await store.callApi<ResidentCheckinsPayload>('get_resident_checkins');
  assert.equal(attendanceStatus(result.events[0]), 'pending');
  await store.attendanceRpc('founder_confirm_attendance', { p_schedule_id: 'bjj', p_marks: [{ user_id: 'preview-resident', attended: true }] });
  await store.callApi('request_attendance', { schedule_id: 'bjj' });
  result = await store.callApi<ResidentCheckinsPayload>('get_resident_checkins');
  assert.equal(attendanceStatus(result.events[0]), 'confirmed');
  assert.equal(attendanceStatus(result.events[1]), 'none');
});