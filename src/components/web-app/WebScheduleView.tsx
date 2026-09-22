import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { CalendarDays, ChevronDown, ChevronUp, MapPin } from 'lucide-react';
import { useAppApi } from '@/components/app-shared/apiAdapter';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface ScheduleItem {
  id: string;
  title: string;
  activity_type: string;
  description: string | null;
  start_time: string;
  end_time: string;
  location: string | null;
  max_participants: number | null;
  booked_count: number;
  booked: boolean;
}

interface ScheduleResponse {
  found: boolean;
  schedule: ScheduleItem[];
  error?: string;
}

const moscowDate = (iso: string) => new Date(new Date(iso).getTime() + 3 * 60 * 60 * 1000);
const dateKey = (iso: string) => moscowDate(iso).toISOString().slice(0, 10);
const formatTime = (iso: string) => moscowDate(iso).toLocaleTimeString('ru-RU', {
  hour: '2-digit', minute: '2-digit', timeZone: 'UTC',
});
const formatDate = (iso: string) => moscowDate(iso).toLocaleDateString('ru-RU', {
  weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC',
});

export const WebScheduleView: React.FC = () => {
  const { callApi } = useAppApi();
  const [data, setData] = useState<ScheduleResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const response = await callApi<ScheduleResponse>('get_schedule', { days: 90 });
      if (!response.found) throw new Error(response.error ?? 'Расписание недоступно');
      setData(response);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Не удалось загрузить расписание');
    }
  }, [callApi]);

  useEffect(() => { void load(); }, [load]);

  const updateBooking = async (action: 'book_session' | 'cancel_booking', id: string) => {
    setBusyId(id);
    setError(null);
    try {
      const result = await callApi<{ ok?: boolean; error?: string }>(action, { schedule_id: id });
      if (result.ok === false) throw new Error(result.error ?? 'Операция не выполнена');
      await load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Операция не выполнена');
    } finally {
      setBusyId(null);
    }
  };

  const groups = useMemo(() => {
    const result = new Map<string, ScheduleItem[]>();
    for (const item of data?.schedule ?? []) {
      const key = dateKey(item.start_time);
      result.set(key, [...(result.get(key) ?? []), item]);
    }
    return [...result.entries()];
  }, [data]);

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="bg-kamp-primary px-4 pb-6 pt-8 text-center text-primary-foreground">
        <CalendarDays className="mx-auto mb-2 h-6 w-6" />
        <h1 className="text-xl font-bold text-primary-foreground">Расписание</h1>
        <p className="text-sm text-primary-foreground/75">Занятия и запись</p>
      </header>

      <div className="space-y-5 px-4 pt-4">
        {error && (
          <div className="space-y-2 text-center">
            <p className="text-sm text-destructive">{error}</p>
            {!data && <Button variant="outline" size="sm" onClick={() => void load()}>Повторить</Button>}
          </div>
        )}
        {!data && !error && <p className="pt-10 text-center text-sm text-muted-foreground">Загрузка расписания...</p>}
        {data?.schedule.length === 0 && <p className="pt-10 text-center text-sm text-muted-foreground">Ближайших занятий нет</p>}

        {groups.map(([key, items]) => (
          <section key={key}>
            <p className="mb-3 text-xs font-semibold uppercase text-muted-foreground">{formatDate(items[0].start_time)}</p>
            <div className="space-y-3">
              {items.map((item) => {
                const expanded = expandedId === item.id;
                const full = item.max_participants !== null && item.booked_count >= item.max_participants;
                return (
                  <Card key={item.id} className="overflow-hidden border-l-4 border-l-kamp-primary">
                    <button
                      type="button"
                      className="flex w-full items-center gap-3 px-4 py-3 text-left"
                      onClick={() => setExpandedId(expanded ? null : item.id)}
                    >
                      <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                        {formatTime(item.start_time)}–{formatTime(item.end_time)}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-sm font-semibold">{item.title}</span>
                      {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </button>
                    {expanded && (
                      <CardContent className="space-y-3 px-4 pb-4 pt-0">
                        {item.location && <p className="flex items-center gap-1.5 text-xs text-muted-foreground"><MapPin className="h-3.5 w-3.5" />{item.location}</p>}
                        {item.description && <p className="whitespace-pre-wrap text-sm text-muted-foreground">{item.description.replace('|||', '\n')}</p>}
                        {item.booked ? (
                          <div className="space-y-2">
                            <p className="rounded-md bg-primary/10 px-3 py-2 text-center text-xs font-semibold text-primary">Вы записаны</p>
                            <Button variant="outline" className="w-full" disabled={busyId === item.id} onClick={() => void updateBooking('cancel_booking', item.id)}>
                              {busyId === item.id ? 'Отменяем...' : 'Отменить запись'}
                            </Button>
                          </div>
                        ) : (
                          <Button className="w-full" disabled={full || busyId === item.id} onClick={() => void updateBooking('book_session', item.id)}>
                            {full ? 'Мест нет' : busyId === item.id ? 'Записываем...' : 'Записаться'}
                          </Button>
                        )}
                      </CardContent>
                    )}
                  </Card>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
};