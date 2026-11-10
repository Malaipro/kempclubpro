import React, { useCallback, useEffect, useState } from 'react';
import { CheckCheck } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { STATUS_LABELS, attendanceStatus } from '@/components/web-app/residentCheckins';

type Row = { user_id: string; name: string; is_resident: boolean; attended: boolean; self_marked_at: string | null; attended_marked_at: string | null; history_count: number };
type Data = { ok: boolean; error?: string; club_kind: string | null; week_anchor: string | null; participants: Row[] };
type Choice = 'keep' | 'present' | 'absent';

const KINDS: [string, string][] = [
  ['training_bjj', 'Тренировка БЖЖ (Пн)'], ['training_ofp', 'Тренировка ОФП (Ср)'], ['training_kick', 'Тренировка кикбоксинг (Пт)'],
  ['banya', 'Баня'], ['sport', 'Спорт'], ['excursion', 'Экскурсия к резиденту'], ['lecture', 'Лекция'],
  ['mastermind', 'Мастермайнд'], ['crash_test', 'Краш-тест'], ['other', 'Другое'],
];

const rpc = supabase.rpc.bind(supabase) as unknown as (fn: string, args: Record<string, unknown>) => PromiseLike<{ data: unknown; error: { message: string } | null }>;
const explain = (m: string) => /Could not find the function|schema cache/i.test(m) ? 'Подтверждение посещений ещё не включено на сервере' : m === 'event_not_started' ? 'Нельзя подтвердить присутствие до начала мероприятия' : m === 'forbidden' ? 'Только основатель может отмечать присутствие' : m;

export const FounderAttendancePanel: React.FC<{ scheduleId: string }> = ({ scheduleId }) => {
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [choice, setChoice] = useState<Record<string, Choice>>({});
  const [kind, setKind] = useState('');
  const [anchor, setAnchor] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const { data: d, error: e } = await rpc('founder_get_event_attendance', { p_schedule_id: scheduleId });
    const res = d as Data | null;
    if (e || !res?.ok) { setError(explain(e?.message ?? res?.error ?? 'Ошибка')); return; }
    setError(null); setData(res); setChoice({}); setKind(res.club_kind ?? ''); setAnchor(res.week_anchor ?? '');
  }, [scheduleId]);
  useEffect(() => { void load(); }, [load]);

  if (error) return <p className="text-sm text-muted-foreground">{error}</p>;
  if (!data) return null;

  const set = (id: string, c: Choice) => setChoice(v => ({ ...v, [id]: c }));
  const confirmPending = () => data.participants.forEach(p => { if (attendanceStatus(p) === 'pending') set(p.user_id, 'present'); });
  const marks = Object.entries(choice).filter(([, c]) => c !== 'keep').map(([user_id, c]) => ({ user_id, attended: c === 'present' }));

  const saveKind = async () => {
    const { data: d, error: e } = await rpc('founder_set_event_kind', { p_schedule_id: scheduleId, p_club_kind: kind, p_week_anchor: anchor || data.week_anchor || null });
    if (e || !(d as Data)?.ok) toast.error(explain(e?.message ?? (d as Data)?.error ?? 'Ошибка')); else { toast.success('Вид события сохранён'); void load(); }
  };
  const save = async () => {
    setSaving(true);
    const { data: d, error: e } = await rpc('founder_confirm_attendance', { p_schedule_id: scheduleId, p_marks: marks });
    setSaving(false);
    if (e || !(d as Data)?.ok) { toast.error(explain(e?.message ?? (d as Data)?.error ?? 'Ошибка')); return; }
    toast.success(`Сохранено: ${(d as { updated: number }).updated}`);
    void load();
  };

  return (
    <div className="space-y-3">
      <Label className="flex items-center gap-2 text-sm font-medium"><CheckCheck className="h-4 w-4" />Отметить присутствие</Label>
      <div className="grid gap-2 sm:grid-cols-[1fr_auto_auto]">
        <Select value={kind} onValueChange={setKind}>
          <SelectTrigger aria-label="Вид события"><SelectValue placeholder="Вид события не задан" /></SelectTrigger>
          <SelectContent>{KINDS.map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent>
        </Select>
        <Input type="date" aria-label="Неделя зачёта (для переноса)" value={anchor} onChange={e => setAnchor(e.target.value)} />
        <Button type="button" variant="outline" size="sm" onClick={() => void saveKind()}>Сохранить вид</Button>
      </div>
      {!data.club_kind && <p className="text-xs text-muted-foreground">Без вида событие не попадёт в недельную цель резидентов.</p>}
      {data.participants.map(p => {
        const st = attendanceStatus(p);
        const c = choice[p.user_id] ?? 'keep';
        return (
          <div key={p.user_id} className="flex flex-wrap items-center justify-between gap-2 border-b border-border py-2 text-sm">
            <div className="min-w-0">
              <p className="font-medium">{p.name}{!p.is_resident && <span className="text-xs text-muted-foreground"> · не резидент</span>}</p>
              <p className="text-xs text-muted-foreground">{p.self_marked_at ? 'Нажал «Я был»' : 'Без самоотметки'}{p.history_count > 1 ? ` · исправлений: ${p.history_count - 1}` : ''}</p>
            </div>
            <div className="flex items-center gap-1">
              <Badge variant="outline">{STATUS_LABELS[st]}</Badge>
              <Button type="button" size="sm" variant={c === 'present' ? 'default' : 'outline'} onClick={() => set(p.user_id, c === 'present' ? 'keep' : 'present')}>Был</Button>
              <Button type="button" size="sm" variant={c === 'absent' ? 'destructive' : 'outline'} onClick={() => set(p.user_id, c === 'absent' ? 'keep' : 'absent')}>Не был</Button>
            </div>
          </div>
        );
      })}
      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" variant="outline" onClick={confirmPending}>Подтвердить всех «Я был»</Button>
        <Button type="button" size="sm" disabled={!marks.length || saving} onClick={() => void save()}>Сохранить ({marks.length})</Button>
      </div>
      <p className="text-xs text-muted-foreground">Непомеченные остаются «Не отмечался» — отсутствие не ставится автоматически.</p>
    </div>
  );
};
