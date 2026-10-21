import { describe, expect, test } from 'bun:test';
import { initialTrack, tasksForTrack, taskStats, Track, TrackTask } from './trackModel';
const track: Track = { id: 'current', group_id: 'g', title: 'T', start_date: '2026-10-01', end_date: '2026-11-30', status: 'active' };
const task = (overrides: Partial<TrackTask>): TrackTask => ({ id: 'x', member_id: 'm', track_id: 'current', title: 'T', description: null, deadline: null, is_completed: false, is_failed: false, completed_at: null, participant_comment: null, file_url: null, approval_status: null, admin_comment: null, ...overrides });
describe('track isolation', () => {
  test('tasks from other tracks do not appear in selected track', () => expect(tasksForTrack([task({}), task({ id: 'other', track_id: 'other' })], 'current').map(t => t.id)).toEqual(['x']));
  test('unassigned tasks remain separate', () => expect(tasksForTrack([task({}), task({ id: 'old', track_id: null })], 'legacy').map(t => t.id)).toEqual(['old']));
  test('current dated active track wins over future track', () => expect(initialTrack([{ ...track, id: 'future', start_date: '2026-12-01', end_date: '2027-01-31' }, track], '2026-10-21')).toBe('current'));
  test('completed, overdue and failed tasks are separate', () => expect(taskStats([task({ is_completed: true }), task({ deadline: '2026-10-20' }), task({ is_failed: true }), task({})], track, '2026-10-21')).toMatchObject({ total: 4, done: 1, overdue: 1, notDone: 1, inWork: 1 }));
  test('unfinished tasks in ended track count as not done', () => expect(taskStats([task({ deadline: '2026-10-20' })], track, '2026-12-01')).toMatchObject({ overdue: 0, notDone: 1 }));
});