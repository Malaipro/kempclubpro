import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { checkedActivities, markActivity, moscowDay } from './dailyCheckin';

describe('daily activity check-in', () => {
  it('keeps a successful activity disabled when its stored state is reopened', () => {
    const saved = markActivity(null, '2026-11-08', 'bjj');
    assert.deepEqual(checkedActivities(JSON.parse(JSON.stringify(saved)), '2026-11-08'), ['bjj']);
  });
  it('unlocks at the next Moscow calendar day, not after 24 hours', () => {
    const saved = markActivity(null, moscowDay(new Date('2026-11-08T20:58:00Z')), 'bjj');
    assert.deepEqual(checkedActivities(saved, moscowDay(new Date('2026-11-08T20:59:59Z'))), ['bjj']);
    assert.deepEqual(checkedActivities(saved, moscowDay(new Date('2026-11-08T21:00:00Z'))), []);
  });
  it('keeps other activities independent and repeated success unique', () => {
    const saved = markActivity(markActivity(null, '2026-11-08', 'bjj'), '2026-11-08', 'bjj');
    assert.equal(checkedActivities(saved, '2026-11-08').includes('kickboxing'), false);
    assert.deepEqual(saved.activities, ['bjj']);
  });
});