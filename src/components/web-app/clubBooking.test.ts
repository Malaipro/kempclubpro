import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { clubCalendarItems, usesClubCalendar, isFreeRegularTraining } from './clubBooking';

describe('club event booking', () => {
  it('без записи только бесплатные регулярные тренировки; отдельные и платные сохраняют запись', () => {
    for (const club_kind of ['training_bjj','training_ofp','training_kick']) {
      assert.equal(isFreeRegularTraining({ club_kind, booking_mode: 'free' }), true);
      assert.equal(isFreeRegularTraining({ club_kind, booking_mode: 'paid' }), false);
    }
    assert.equal(isFreeRegularTraining({ club_kind: 'lecture', booking_mode: 'free' }), false);
    assert.equal(isFreeRegularTraining({ club_kind: 'training_bjj' }), false);
  });
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