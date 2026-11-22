import { describe, expect, it } from 'vitest';
import { pushRecipients, pushTargetUrl } from './broadcastPush';

const people = [
  { user_id: 'r1', name: 'Р1', status: 'club_resident', subscribed: true },
  { user_id: 'r2', name: 'Р2', status: 'club_resident', subscribed: false },
  { user_id: 'i1', name: 'И1', status: 'intensive_active', subscribed: true },
  { user_id: 'x', name: 'Х', status: 'inactive', subscribed: true },
];

describe('broadcast push', () => {
  it('residents audience gets push only for subscribed residents', () => {
    expect(pushRecipients(people, 'resident').subscribed.map(p => p.user_id)).toEqual(['r1']);
  });
  it('intensive audience excludes residents', () => {
    expect(pushRecipients(people, 'intensive').subscribed.map(p => p.user_id)).toEqual(['i1']);
  });
  it('all audience excludes inactive users', () => {
    expect(pushRecipients(people, 'all').subscribed.map(p => p.user_id)).toEqual(['r1', 'i1']);
  });
  it('book button opens the event card', () => {
    expect(pushTargetUrl([{ type: 'book_event', target_id: 'ev1' }])).toBe('/app/schedule?event=ev1');
  });
  it('no buttons opens app home', () => {
    expect(pushTargetUrl([])).toBe('/app');
  });
});
