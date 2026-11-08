import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { clubCalendarItems, usesClubCalendar } from './clubBooking';

describe('club event booking', () => {
  it('takes booking events only from the club calendar, never the intensive calendar', () => {
    assert.deepEqual(clubCalendarItems([{ id: 'club-event' }, { id: 'intensive-event' }], ['club-event']), [{ id: 'club-event' }]);
    assert.deepEqual(clubCalendarItems([{ id: 'intensive-event' }], []), []);
  });
  it('preserves resident-only club booking access', () => {
    assert.equal(usesClubCalendar('club_resident'), true);
    for (const status of ['intensive_active', 'intensive_completed', 'alumni', 'inactive', null, undefined]) {
      assert.equal(usesClubCalendar(status), false);
    }
  });
});