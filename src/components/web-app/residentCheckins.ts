export type AttendanceStatus = 'none' | 'pending' | 'confirmed' | 'absent';
export type TrainingKind = 'training_bjj' | 'training_ofp' | 'training_kick';
export const TRAINING_KINDS: TrainingKind[] = ['training_bjj', 'training_ofp', 'training_kick'];
export const TRAINING_LABELS: Record<TrainingKind, string> = {
  training_bjj: 'Пн · БЖЖ', training_ofp: 'Ср · ОФП', training_kick: 'Пт · Кикбоксинг',
};
export const STATUS_LABELS: Record<AttendanceStatus, string> = {
  none: 'Не отмечался', pending: 'Ожидает подтверждения', confirmed: 'Подтверждено', absent: 'Не был',
};

export type ResidentEvent = {
  schedule_id: string;
  title: string;
  theme: string | null;
  start_time: string;
  club_kind: string | null;
  week_start: string;
  registered: boolean;
  attended: boolean;
  self_marked_at: string | null;
  attended_marked_at: string | null;
};

/** attended=false — значение по умолчанию; без решения основателя это НЕ «Не был». */
export function attendanceStatus(e: Pick<ResidentEvent, 'attended' | 'self_marked_at' | 'attended_marked_at'>): AttendanceStatus {
  if (e.attended_marked_at) return e.attended ? 'confirmed' : 'absent';
  return e.self_marked_at ? 'pending' : 'none';
}

export function canSelfMark(e: ResidentEvent, now: Date): boolean {
  const start = new Date(e.start_time).getTime();
  return e.registered && attendanceStatus(e) === 'none' && start <= now.getTime() && start >= now.getTime() - 7 * 86400000;
}

export type WeekSlot = { kind: TrainingKind; planned: ResidentEvent[]; confirmed: boolean };
export type WeekProgress = { week_start: string; slots: WeekSlot[]; done: number; full: boolean; missing: TrainingKind[] };

const isTraining = (k: string | null): k is TrainingKind => TRAINING_KINDS.includes(k as TrainingKind);

/** Цель недели — по конкретным плановым занятиям календаря; отсутствующее занятие не засчитывается и не снимается. */
export function weekProgress(events: ResidentEvent[], weekStart: string): WeekProgress {
  const slots = TRAINING_KINDS.map(kind => {
    const planned = events.filter(e => e.week_start === weekStart && e.club_kind === kind);
    return { kind, planned, confirmed: planned.some(e => attendanceStatus(e) === 'confirmed') };
  });
  const done = slots.filter(s => s.confirmed).length;
  return { week_start: weekStart, slots, done, full: done === 3, missing: slots.filter(s => !s.planned.length).map(s => s.kind) };
}

const addDays = (iso: string, days: number) => {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};

/** Подряд полные недели: текущая засчитывается, только если уже полная; иначе считаем от прошлой. */
export function fullWeekStreak(events: ResidentEvent[], currentWeek: string): number {
  let week = weekProgress(events, currentWeek).full ? currentWeek : addDays(currentWeek, -7);
  let streak = 0;
  while (weekProgress(events, week).full) { streak += 1; week = addDays(week, -7); }
  return streak;
}

export function trainingTotals(events: ResidentEvent[]): Record<TrainingKind, number> & { total: number } {
  const totals = { training_bjj: 0, training_ofp: 0, training_kick: 0, total: 0 };
  events.forEach(e => {
    if (isTraining(e.club_kind) && attendanceStatus(e) === 'confirmed') { totals[e.club_kind] += 1; totals.total += 1; }
  });
  return totals;
}
