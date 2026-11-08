import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { broadcastScheduleType } from './clubBroadcastQuery';

describe('broadcast event options', () => {
  it('selects only club events, excluding intensive events', () => {
    const events = [
      { id: 'club-event', schedule_type: 'club' },
      { id: 'intensive-event', schedule_type: 'intensive' },
    ];
    const result = events.filter(event => event.schedule_type === broadcastScheduleType);
    assert.deepEqual(result.map(event => event.id), ['club-event']);
  });
});