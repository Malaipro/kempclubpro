export interface GoalReward {
  id: string;
  title: string;
  cost: number;
  condition?: string;
}

// Mock catalogue only; not linked to shop prices or purchasing APIs.
export const previewRewards: GoalReward[] = [
  { id: 'shirt', title: 'Футболка КЭМП', cost: 500, condition: 'Стаж резидента — от 6 месяцев' },
  { id: 'cap', title: 'Кепка КЭМП', cost: 700 },
  { id: 'hoodie', title: 'Худи КЭМП', cost: 1000, condition: 'Стаж резидента — от 6 месяцев' },
];

export function goalProgress(balance: number, reward: GoalReward) {
  return { current: Math.min(balance, reward.cost), remaining: Math.max(0, reward.cost - balance), enough: balance >= reward.cost };
}

export function selectGoal(state: { balance: number; reward: GoalReward | null }, reward: GoalReward | null) {
  return { ...state, reward };
}