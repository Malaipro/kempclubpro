import { describe, it as test } from 'node:test';
import assert from 'node:assert/strict';
import { canCheckin, initialTrack, tasksForTrack, taskStats, Track, TrackTask } from './trackModel';
const track: Track = { id: 'current', group_id: 'g', title: 'T', start_date: '2026-10-01', end_date: '2026-11-30', status: 'active' };
const task = (overrides: Partial<TrackTask>): TrackTask => ({ id: 'x', member_id: 'm', track_id: 'current', title: 'T', description: null, deadline: null, is_completed: false, is_failed: false, completed_at: null, participant_comment: null, file_url: null, approval_status: null, admin_comment: null, ...overrides });
describe('track isolation', () => {
  test('tasks from other tracks do not appear in selected track', () => assert.deepEqual(tasksForTrack([task({}), task({ id: 'other', track_id: 'other' })], 'current').map(t => t.id), ['x']));
  test('unassigned tasks remain separate', () => assert.deepEqual(tasksForTrack([task({}), task({ id: 'old', track_id: null })], 'legacy').map(t => t.id), ['old']));
  test('current dated active track wins over future track', () => assert.equal(initialTrack([{ ...track, id: 'future', start_date: '2026-12-01', end_date: '2027-01-31' }, track], '2026-10-21'), 'current'));
  test('completed, overdue and failed tasks are separate', () => assert.deepEqual(taskStats([task({ is_completed: true }), task({ deadline: '2026-10-20' }), task({ is_failed: true }), task({})], track, '2026-10-21'), { total: 4, done: 1, late: 0, overdue: 1, notDone: 1, inWork: 1 }));
  test('unfinished tasks in ended track count as not done', () => assert.deepEqual(taskStats([task({ deadline: '2026-10-20' })], track, '2026-12-01'), { total: 1, done: 0, late: 0, overdue: 0, notDone: 1, inWork: 0 }));
});
describe('meeting self check-in window', () => {
  const meeting = '2026-10-22T10:00:00Z'; // 13:00 MSK Thursday
  test('open on meeting day until 23:55 MSK', () => {
    assert.equal(canCheckin(meeting, new Date('2026-10-22T09:00:00Z')), true);
    assert.equal(canCheckin(meeting, new Date('2026-10-22T20:55:00Z')), true);
  });
  test('closed after 23:55 MSK and on other days', () => {
    assert.equal(canCheckin(meeting, new Date('2026-10-22T20:56:00Z')), false);
    assert.equal(canCheckin(meeting, new Date('2026-10-21T09:00:00Z')), false);
    assert.equal(canCheckin(meeting, new Date('2026-10-23T09:00:00Z')), false);
  });
});