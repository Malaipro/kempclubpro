import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const plan = JSON.parse(readFileSync(new URL('./schedule.json', import.meta.url), 'utf8')) as { start: string; end: string; limit: number; events: string[][] };
describe('approved stream 8 schedule', () => {
  it('starts November 8, 2026', () => assert.equal(plan.start, '2026-11-08'));
  it('ends on the last Saturday of December', () => {
    assert.equal(plan.end, '2026-12-26');
    assert.equal(new Date(`${plan.end}T12:00:00+03:00`).getUTCDay(), 6);
    assert.equal(new Date('2027-01-02T12:00:00+03:00').getUTCMonth(), 0);
  });
  it('retains the approved participant limit', () => assert.equal(plan.limit, 20));
  it('has 39 approved events', () => assert.equal(plan.events.length, 39));
  it('keeps all events inside the stream and ends after start', () => {
    for (const [day, start, end] of plan.events) {
      assert.ok(`2026-${day}` >= plan.start && `2026-${day}` <= plan.end);
      assert.ok(end > start);
    }
  });
  it('has no duplicates or overlapping events', () => {
    assert.equal(new Set(plan.events.map(e => JSON.stringify(e))).size, 39);
    for (const [i, a] of plan.events.entries()) {
      for (const b of plan.events.slice(i + 1)) {
        assert.ok(a[0] !== b[0] || a[2] <= b[1] || b[2] <= a[1]);
      }
    }
  });
  it('holds the final race on December 26 at 10:00 MSK', () => assert.deepEqual(plan.events.at(-1), ['12-26', '10:00', '13:00', 'Гонка Героев']));
});