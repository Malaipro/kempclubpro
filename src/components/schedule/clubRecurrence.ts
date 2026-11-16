import type { PaidSettingsInput } from '@/components/web-app/paidBooking';

export type Frequency = 'weekly' | 'monthly';
export type ClubFixture = {
  id: string; title: string; start_time: string; end_time: string; location: string | null;
  club_kind: string | null; week_anchor: string; is_active: boolean; description: string | null;
  booking_mode: 'free' | 'paid'; paid?: PaidSettingsInput;
};
export type Occurrence = { date: string; start: string; end: string; week: string; exists: boolean };
export const trainingKind = (title: string): string | null =>
  ({ BJJ: 'training_bjj', БЖЖ: 'training_bjj', ОФП: 'training_ofp', Кикбоксинг: 'training_kick' } as Record<string, string>)[title] ?? null;
export function weekAnchor(date: string): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - (d.getUTCDay() + 6) % 7);
  return d.toISOString().slice(0, 10);
}
const validDate = (date: string) => /^\d{4}-\d{2}-\d{2}$/.test(date) && !Number.isNaN(Date.parse(date)) && new Date(`${date}T00:00:00Z`).toISOString().slice(0,10) === date;
export function recurrencePlan(first: string, until: string, frequency: Frequency, startTime: string, endTime: string, title: string, existing: ClubFixture[]) {
  if (!validDate(first) || !validDate(until) || until < first) return { dates: [] as Occurrence[], skipped: [] as string[], error: 'Укажите последнюю дату не раньше первого занятия' };
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(startTime) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(endTime) || endTime <= startTime) return { dates: [] as Occurrence[], skipped: [] as string[], error: 'Окончание должно быть позже начала' };
  const dates: Occurrence[] = [], skipped: string[] = [];
  const initial = new Date(`${first}T00:00:00Z`);
  for (let n = 0; n < 1200; n++) {
    const d = new Date(initial);
    if (frequency === 'weekly') d.setUTCDate(initial.getUTCDate() + n * 7);
    else {
      d.setUTCDate(1); d.setUTCMonth(initial.getUTCMonth() + n);
      const month = d.toISOString().slice(0, 7);
      if (`${month}-01` > until) break;
      const last = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
      if (initial.getUTCDate() > last) { skipped.push(month); continue; }
      d.setUTCDate(initial.getUTCDate());
    }
    const date = d.toISOString().slice(0, 10);
    if (date > until) break;
    const start = new Date(`${date}T${startTime}:00+03:00`).toISOString();
    dates.push({ date, start, end: new Date(`${date}T${endTime}:00+03:00`).toISOString(), week: weekAnchor(date),
      exists: existing.some(e => e.is_active && e.start_time === start && (trainingKind(title) ? e.club_kind === trainingKind(title) : e.title === title)) });
  }
  return { dates, skipped, error: dates.length >= 1200 ? 'Слишком длинная серия' : null };
}

export type PreviewSave = { id: string | null; title: string; description: string | null; location: string | null; occurrences: Occurrence[]; paid: PaidSettingsInput; key: string };
export interface ClubSchedulePreviewApi {
  list(): ClubFixture[];
  save(input: PreviewSave): void;
  cancel(id: string): void;
}
export function createClubScheduleFixture(initial: ClubFixture[]): ClubSchedulePreviewApi {
  let events = structuredClone(initial);
  const saved = new Set<string>();
  return {
    list: () => structuredClone(events),
    save(input) {
      if (input.id) {
        const occurrence = input.occurrences[0];
        if (!occurrence) throw new Error('Нет даты');
        events = events.map(e => e.id === input.id ? { ...e, title: input.title, start_time: occurrence.start, end_time: occurrence.end,
          location: input.location, description: input.description, club_kind: trainingKind(input.title), booking_mode: input.paid.mode, paid: input.paid } : e);
        return;
      }
      if (saved.has(input.key)) return;
      for (const o of input.occurrences) {
        if (events.some(e => e.is_active && e.start_time === o.start && (trainingKind(input.title) ? e.club_kind === trainingKind(input.title) : e.title === input.title))) continue;
        events.push({ id: crypto.randomUUID(), title: input.title, start_time: o.start, end_time: o.end, week_anchor: o.week,
          location: input.location, description: input.description, club_kind: trainingKind(input.title), is_active: true, booking_mode: input.paid.mode, paid: structuredClone(input.paid) });
      }
      saved.add(input.key);
    },
    cancel(id) { events = events.map(e => e.id === id ? { ...e, is_active: false } : e); },
  };
}