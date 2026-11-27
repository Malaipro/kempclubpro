import { awardToastSuffix } from './residentRewards';

describe('awardToastSuffix', () => {
  it('пусто без наград', () => {
    expect(awardToastSuffix(undefined)).toBe('');
    expect(awardToastSuffix([])).toBe('');
    expect(awardToastSuffix([{ points_delta: 0, coins_delta: 0 }])).toBe('');
  });

  it('начисление баллов и коинов', () => {
    expect(awardToastSuffix([{ points_delta: 10, coins_delta: 0 }])).toBe(' · Начислено: +10 баллов, 0 коинов');
    expect(awardToastSuffix([
      { points_delta: 10, coins_delta: 0 },
      { points_delta: 10, coins_delta: 70 },
    ])).toBe(' · Начислено: +20 баллов, +70 коинов');
  });

  it('обращение наград', () => {
    expect(awardToastSuffix([{ points_delta: -20, coins_delta: -70 }])).toBe(' · Скорректировано: -20 баллов, -70 коинов');
  });
});
