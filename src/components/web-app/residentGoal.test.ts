import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { goalProgress, selectGoal, previewRewards } from './residentGoal';

const shirt = previewRewards[0];
describe('resident goal mock rules', () => {
  it('380 of 500 leaves 120 coins', () => {
    assert.deepEqual(goalProgress(380, shirt), { current: 380, remaining: 120, enough: false });
  });
  it('500 coins is enough and does not imply meeting the extra condition', () => {
    assert.deepEqual(goalProgress(500, shirt), { current: 500, remaining: 0, enough: true });
    assert.equal(shirt.condition, 'Стаж резидента — от 6 месяцев');
  });
  it('selecting, changing and removing a goal does not deduct coins or mutate the previous choice', () => {
    const initial = { balance: 380, reward: null };
    const selected = selectGoal(initial, shirt);
    const changed = selectGoal(selected, previewRewards[1]);
    const removed = selectGoal(changed, null);
    assert.equal(selected.reward?.id, 'shirt');
    assert.equal(changed.reward?.id, 'cap');
    assert.equal(removed.reward, null);
    for (const state of [initial, selected, changed, removed]) assert.equal(state.balance, 380);
    assert.equal(initial.reward, null);
  });
});