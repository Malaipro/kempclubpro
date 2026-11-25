import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import type { ClubRecurrenceFrequency, ClubRecurrencePlan, ClubRecurrencePreview, ClubRecurrenceStatus } from './clubRecurrence';

const statusLabel: Record<ClubRecurrenceStatus, string> = {
  new: 'Создать',
  existing: 'Уже есть — пропустить',
  moved: 'Уже есть — перенесено',
  cancelled: 'Уже есть — отменено',
  occupied_moved: 'Слот занят перенесённой тренировкой',
};

function skippedLabel(month: string): string {
  const [year, monthNumber] = month.split('-').map(Number);
  return new Intl.DateTimeFormat('ru-RU', { month: 'long', year: 'numeric', timeZone: 'UTC' })
    .format(new Date(Date.UTC(year, monthNumber - 1, 1)));
}

export function ClubRecurrenceFields({
  enabled,
  onEnabled,
  frequency,
  onFrequency,
  until,
  onUntil,
  localPlan,
  preview,
  loading,
  serverError,
}: {
  enabled: boolean;
  onEnabled(value: boolean): void;
  frequency: ClubRecurrenceFrequency;
  onFrequency(value: ClubRecurrenceFrequency): void;
  until: string;
  onUntil(value: string): void;
  localPlan: ClubRecurrencePlan;
  preview: ClubRecurrencePreview | null;
  loading: boolean;
  serverError: string | null;
}) {
  const occurrences = preview?.occurrences ?? localPlan.dates;
  const skipped = preview?.skipped ?? localPlan.skipped;
  const existing = preview?.existing ?? 0;
  const occupied = preview?.occupied ?? 0;
  const create = preview?.create ?? localPlan.dates.length;

  return (
    <section className="space-y-3 border-t border-gray-700 pt-4 text-white">
      <div className="flex items-center justify-between gap-4">
        <div className="space-y-1">
          <Label htmlFor="club-recurring">Повторяющееся событие</Label>
          <p className="text-xs text-gray-400">Только для бесплатных клубных тренировок</p>
        </div>
        <Switch id="club-recurring" checked={enabled} onCheckedChange={onEnabled} />
      </div>

      {enabled && (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="club-recurring-frequency">Как часто</Label>
              <Select value={frequency} onValueChange={(value) => onFrequency(value as ClubRecurrenceFrequency)}>
                <SelectTrigger id="club-recurring-frequency" className="bg-white text-black"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="weekly">Каждую неделю</SelectItem>
                  <SelectItem value="monthly">Каждый месяц</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="club-recurring-until">Повторять до включительно</Label>
              <Input id="club-recurring-until" type="date" value={until} onChange={(event) => onUntil(event.target.value)} className="bg-white text-black" />
            </div>
          </div>

          <div aria-label="Предпросмотр серии" className="space-y-2 text-sm">
            {localPlan.error ? (
              <p className="text-red-300">{localPlan.error}</p>
            ) : serverError ? (
              <p className="text-red-300">{serverError}</p>
            ) : loading ? (
              <p className="text-gray-300">Сверяем с календарём…</p>
            ) : (
              <p className="font-semibold">
                Всего тренировок: {occurrences.length} · Уже есть: {existing} · Будет создано: {create}
                {occupied > 0 ? ` · Занято переносом: ${occupied}` : ''}
              </p>
            )}
            <ul className="max-h-48 divide-y divide-gray-700 overflow-y-auto">
              {occurrences.map((occurrence) => (
                <li key={occurrence.date} className="flex flex-wrap justify-between gap-2 py-2">
                  <span>{occurrence.date.split('-').reverse().join('.')} · {new Date(occurrence.start).toLocaleTimeString('ru-RU', { timeZone: 'Europe/Moscow', hour: '2-digit', minute: '2-digit' })} МСК</span>
                  <span className="text-gray-400">{statusLabel[occurrence.status]}</span>
                </li>
              ))}
            </ul>
            {skipped.map((month) => <p key={month} className="text-gray-400">{skippedLabel(month)} — такого числа нет, месяц пропущен</p>)}
          </div>
        </>
      )}
    </section>
  );
}
