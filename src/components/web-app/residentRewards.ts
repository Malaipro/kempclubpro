export type AwardDelta = { points_delta: number; coins_delta: number };

export type ResidentRewardEntry = {
  id: string;
  award_kind: 'training' | 'week_full';
  week_start: string | null;
  points: number;
  coins: number;
  status: 'active' | 'reversed';
  created_at: string;
};

export type ResidentRewardsPayload = {
  ok: boolean;
  error?: string;
  points_total: number;
  trainings_confirmed: number;
  week_bonuses: number;
  coins_from_awards: number;
  awards: ResidentRewardEntry[];
};

const signed = (n: number) => (n > 0 ? `+${n}` : `${n}`);

/** Подпись к тосту основателя после сохранения отметок; пусто, если наград не было. */
export function awardToastSuffix(awards: AwardDelta[] | undefined): string {
  const pts = (awards ?? []).reduce((s, a) => s + (a.points_delta || 0), 0);
  const cns = (awards ?? []).reduce((s, a) => s + (a.coins_delta || 0), 0);
  if (!pts && !cns) return '';
  const verb = pts < 0 || cns < 0 ? 'Скорректировано' : 'Начислено';
  return ` · ${verb}: ${signed(pts)} баллов, ${signed(cns)} коинов`;
}
