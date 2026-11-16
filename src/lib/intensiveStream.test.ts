import { describe, it as test } from 'node:test';
import assert from 'node:assert/strict';
import { assignmentInStream, inStreamPeriod, streamBounds, submissionInStream, type IntensiveStream } from './intensiveStream';

const current: IntensiveStream = { id: '8', name: '8', is_active: true, start_date: '2026-11-08', end_date: '2026-12-26' };
const old = { ...current, id: '7', is_active: false, start_date: '2026-09-01', end_date: '2026-10-31' };
describe('Selected intensive stream isolation', () => {
  test('homework explicitly assigned to stream 7 never appears in stream 8 after participant transfer', () => {
    assert.equal(assignmentInStream({ stream_id: '7', target_user_id: 'transferred', created_at: '2026-11-10T12:00:00Z' }, current), false);
  });
  test('selected stream 8 homework remains visible', () => {
    assert.equal(assignmentInStream({ stream_id: '8', target_user_id: null, created_at: '2026-10-30T12:00:00Z' }, current), true);
  });
  test('legacy personal assignment remains in its original period, not the current profile stream', () => {
    const personal = { stream_id: null, target_user_id: 'transferred', created_at: '2026-10-12T12:00:00Z' };
    assert.equal(assignmentInStream(personal, current), false);
    assert.equal(assignmentInStream(personal, old), true);
  });
  test('unassigned group records are not guessed into a stream', () => {
    assert.equal(assignmentInStream({ stream_id: null, target_user_id: null, created_at: '2026-11-10T12:00:00Z' }, current), false);
  });
  test('late homework response belongs to assignment stream, not submission date', () => {
    const response = { assignment_id: 'old-assignment', created_at: '2026-11-12T12:00:00Z' };
    assert.equal(submissionInStream(response, [{ id: 'current-assignment' }], current), false);
    assert.equal(submissionInStream(response, [{ id: 'old-assignment' }], old), true);
  });
  test('records without assignment use their event period', () => {
    assert.equal(submissionInStream({ assignment_id: null, created_at: '2026-10-12T12:00:00Z' }, [], current), false);
  });
  test('Moscow boundaries include the full final day but exclude the next day', () => {
    assert.deepEqual(streamBounds(current), { start: '2026-11-08T00:00:00+03:00', end: '2026-12-26T21:00:00.000Z' });
    assert.equal(inStreamPeriod('2026-11-07T21:00:00Z', current), true);
    assert.equal(inStreamPeriod('2026-12-26T20:59:59Z', current), true);
    assert.equal(inStreamPeriod('2026-12-26T21:00:00Z', current), false);
  });
  test('missing selection never expands to all streams', () => {
    assert.equal(assignmentInStream({ stream_id: '8', target_user_id: null, created_at: '2026-11-12' }, null), false);
  });
});