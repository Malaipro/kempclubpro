import React, { useCallback, useEffect, useState } from 'react';
import { Activity, Loader2 } from 'lucide-react';
import { useAppApi } from '@/components/app-shared/apiAdapter';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  STATUS_LABELS, TRAINING_KINDS, TRAINING_LABELS, attendanceStatus, canSelfMark,
  fullWeekStreak, trainingTotals, weekProgress, type ResidentEvent,
} from './residentCheckins';

type Payload = { error?: string; ok: boolean; now: string; current_week: string; events: ResidentEvent[] };

const ERRORS: Record<string, string> = {
  not_resident: 'Резидентские отметки доступны только подтверждённым резидентам клуба.',
  not_registered: 'Сначала запишитесь на это мероприятие.',
  event_not_started: 'Отметиться можно после начала мероприятия.',
  mark_window_closed: 'Срок отметки (7 дней) истёк.',
  already_reviewed: 'Основатель уже принял решение по этой отметке.',
  event_started: 'Запись закрыта: мероприятие уже началось.',
  not_authenticated: 'Войдите в приложение заново.',
  not_club_event: 'Это не мероприятие клуба.',
};
const explain = (m: string) => /Could not find the function|schema cache/i.test(m)
  ? 'Резидентские отметки подготовлены, но ещё не включены на сервере.'
  : ERRORS[m] ?? m;

const fmt = (iso: string) => new Date(iso).toLocaleString('ru-RU', {
  timeZone: 'Europe/Moscow', weekday: 'short', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
});
const statusVariant = (s: string) => (s === 'confirmed' ? 'default' : s === 'pending' ? 'secondary' : 'outline');

export const WebResidentCheckinsView: React.FC = () => {
  const { callApi } = useAppApi();
  const [data, setData] = useState<Payload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(() => {
    setError(null);
    callApi<Payload>('get_resident_checkins').then(res => { if (!res?.ok) throw new Error(res?.error ?? 'Не удалось загрузить отметки'); setData(res); }).catch((e: Error) => setError(explain(e.message)));
  }, [callApi]);
  useEffect(load, [load]);

  const mark = async (id: string, book = false) => {
    setBusy(id);
    try { const res = await callApi<{ ok: boolean; error?: string }>(book ? 'book_session' : 'request_attendance', { schedule_id: id }); if (!res?.ok) throw new Error(res?.error ?? 'Операция не выполнена'); load(); }
    catch (e) { setError(explain((e as Error).message)); }
    finally { setBusy(null); }
  };

  const events = data?.events ?? [];
  const week = data ? weekProgress(events, data.current_week) : null;
  const totals = trainingTotals(events);
  const streak = data ? fullWeekStreak(events, data.current_week) : 0;
  const now = data ? new Date(data.now) : new Date();
  const own = events;
  const weeks = [...new Set(events.map(e => e.week_start))].filter(w => w <= (data?.current_week ?? '')).sort().reverse();

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="app-section-header px-4 pb-6 pt-8 text-center text-primary-foreground">
        <Activity className="mx-auto mb-2 h-6 w-6" />
        <h1 className="text-xl font-bold text-primary-foreground">Отметки</h1>
        <p className="text-sm text-primary-foreground/75">Отметьте присутствие — основатель подтвердит</p>
      </header>
      <div className="space-y-4 px-4 pt-4">
        {error && <Card><CardContent className="p-4 text-sm text-muted-foreground">{error}</CardContent></Card>}
        {!data && !error && <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>}
        {week && (
          <Card>
            <CardContent className="space-y-3 p-4">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold">Моя тренировочная неделя</h2>
                <span className="text-lg font-bold text-primary">{week.done}/3</span>
              </div>
              {week.missing.length > 0 && <p className="text-xs text-muted-foreground">Неделя не настроена полностью: {week.missing.map(k => TRAINING_LABELS[k]).join(', ')}. Требуется решение основателя.</p>}
              {week.slots.map(slot => {
                const e = slot.planned[0];
                const st = slot.confirmed ? 'confirmed' : e ? attendanceStatus(e) : null;
                return (
                  <div key={slot.kind} className="flex items-center justify-between gap-2 text-sm">
                    <span>{TRAINING_LABELS[slot.kind]}{e ? ` · ${fmt(e.start_time)}` : ''}</span>
                    {st ? <Badge variant={statusVariant(st)}>{STATUS_LABELS[st]}</Badge>
                      : <span className="text-xs text-muted-foreground">Нет в календаре</span>}
                  </div>
                );
              })}
              <div className="grid grid-cols-2 gap-2 border-t border-border pt-3 text-xs text-muted-foreground">
                <span>Полных недель подряд: <b className="text-foreground">{streak}</b></span>
                <span>Всего тренировок: <b className="text-foreground">{totals.total}</b></span>
                {TRAINING_KINDS.map(k => <span key={k}>{TRAINING_LABELS[k].split(' · ')[1]}: <b className="text-foreground">{totals[k]}</b></span>)}
              </div>
            </CardContent>
          </Card>
        )}
        {weeks.length > 0 && <section className="space-y-2"><h2 className="font-semibold">История недель</h2>{weeks.map(w => <div key={w} className="flex justify-between border-b border-border py-2 text-sm"><span>{new Date(`${w}T12:00:00Z`).toLocaleDateString('ru-RU')}</span><span>{weekProgress(events, w).done}/3</span></div>)}</section>}
        {data && (
          <div className="space-y-2">
            <h2 className="font-semibold">Мои мероприятия клуба</h2>
            {!own.length && <p className="text-sm text-muted-foreground">Вы пока не записаны на мероприятия клуба.</p>}
            {own.map(e => {
              const st = attendanceStatus(e);
              return (
                <Card key={e.schedule_id}>
                  <CardContent className="flex items-center gap-3 p-4">
                    <div className="min-w-0 flex-1">
                      <p className="break-words text-sm font-semibold">{e.theme || e.title}</p>
                      <p className="text-xs text-muted-foreground">{e.title} · {fmt(e.start_time)}</p>
                    </div>
                    {!e.registered && new Date(e.start_time) > now
                      ? <Button size="sm" disabled={busy === e.schedule_id} onClick={() => void mark(e.schedule_id, true)}>Записаться</Button>
                      : canSelfMark(e, now)
                      ? <Button size="sm" disabled={busy === e.schedule_id} onClick={() => void mark(e.schedule_id)}>{busy === e.schedule_id ? '...' : 'Я был'}</Button>
                      : <Badge variant={statusVariant(st)}>{STATUS_LABELS[st]}</Badge>}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
