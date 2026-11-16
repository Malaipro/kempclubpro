import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Frequency, Occurrence } from './clubRecurrence';

export function ClubRecurrenceFields({ enabled, onEnabled, frequency, onFrequency, until, onUntil, plan }: {
  enabled: boolean; onEnabled(v: boolean): void; frequency: Frequency; onFrequency(v: Frequency): void;
  until: string; onUntil(v: string): void; plan: { dates: Occurrence[]; skipped: string[]; error: string | null };
}) {
  return <section className="space-y-3 border-t border-border pt-4 text-foreground">
    <div className="flex items-center gap-2"><Checkbox id="recurring" checked={enabled} onCheckedChange={v => onEnabled(v === true)} /><Label htmlFor="recurring">Повторяющееся событие</Label></div>
    {enabled && <>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div><Label htmlFor="frequency">Как часто</Label><Select value={frequency} onValueChange={v => onFrequency(v as Frequency)}><SelectTrigger id="frequency"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="weekly">Раз в неделю</SelectItem><SelectItem value="monthly">Раз в месяц</SelectItem></SelectContent></Select></div>
        <div><Label htmlFor="repeat-until">Повторять до</Label><Input id="repeat-until" type="date" value={until} onChange={e => onUntil(e.target.value)} /></div>
      </div>
      <div aria-label="Предпросмотр серии" className="space-y-2 text-sm">
        {plan.error ? <p className="text-destructive">{plan.error}</p> : <p className="font-semibold">Всего занятий: {plan.dates.length} · Уже есть: {plan.dates.filter(d => d.exists).length} · Будут созданы: {plan.dates.filter(d => !d.exists).length}</p>}
        <ul className="max-h-48 overflow-y-auto divide-y divide-border">{plan.dates.map(d => <li key={d.date} className="flex flex-wrap justify-between gap-2 py-2"><span>{d.date.split('-').reverse().join('.')} · {new Date(d.start).toLocaleTimeString('ru-RU', { timeZone: 'Europe/Moscow', hour: '2-digit', minute: '2-digit' })} МСК</span><span className="text-muted-foreground">{d.exists ? 'Уже есть — пропустить' : 'Создать'}</span></li>)}</ul>
        {plan.skipped.map(m => <p key={m} className="text-muted-foreground">{m} — такого числа нет, месяц пропущен</p>)}
      </div>
    </>}
  </section>;
}