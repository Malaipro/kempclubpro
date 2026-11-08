import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { restrictToClub } from './clubBroadcastQuery';

describe('broadcast event options', () => {
  it('selects only club events, excluding intensive events', () => {
    const events = [
      { id: 'club-event', schedule_type: 'club' },
      { id: 'intensive-event', schedule_type: 'intensive' },
    ];
    const result = restrictToClub({
      eq: (column: string, value: string) => events.filter(event => event[column as keyof typeof event] === value),
    });
    assert.deepEqual(result.map(event => event.id), ['club-event']);
  });
});