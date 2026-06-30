import React, { useEffect, useState, useCallback } from 'react';
import { Clock, MapPin, User, Users } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

const SERVER_URL = import.meta.env.VITE_TELEGRAM_SERVER_URL;

// ---------- Types ----------

interface ScheduleItem {
  id: string;
  title: string;
  activity_type: string;
  description: string | null;
  start_time: string;
  end_time: string;
  location: string | null;
  color: string | null;
  max_participants: number | null;
  booked_count: number;
  instructor: { id: string; name: string; role: string } | null;
  booked: boolean;
  attended: boolean | null;
}

interface ScheduleResponse {
  found: boolean;
  stream_id: string | null;
  status: string | null;
  schedule: ScheduleItem[];
  error?: string;
}

type LoadState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ok'; data: ScheduleResponse };

type BookState = 'idle' | 'loading' | 'booked' | 'full' | 'error';

interface Props {
  onBack: () => void;
}

// ---------- Helpers ----------

function fmt_time(iso: string): string {
  return new Date(iso).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
}

function fmt_date(iso: string): string {
  return new Date(iso).toLocaleDateString('ru-RU', {
    weekday: 'long', day: 'numeric', month: 'long',
  });
}

// ---------- BookButton ----------

interface BookButtonProps {
  state: BookState;
  isFull: boolean;
  onBook: () => void;
}

const BookButton: React.FC<BookButtonProps> = ({ state, isFull, onBook }) => {
  if (state === 'booked') {
    return (
      <div className="mt-3 rounded-lg bg-green-600/10 border border-green-600/25 px-3 py-1.5 text-center">
        <span className="text-xs font-semibold text-green-500">Вы записаны</span>
      </div>
    );
  }

  if (state === 'full' || (isFull && state === 'idle')) {
    return (
      <div className="mt-3 rounded-lg bg-muted/50 px-3 py-1.5 text-center">
        <span className="text-xs text-muted-foreground">Мест нет</span>
      </div>
    );
  }

  return (
    <Button
      size="sm"
      className="mt-3 w-full bg-kamp-primary hover:bg-kamp-primary/90 text-white"
      disabled={state === 'loading'}
      onClick={onBook}
    >
      {state === 'loading' ? 'Запись...' : state === 'error' ? 'Ошибка — повторить' : 'Записаться'}
    </Button>
  );
};

// ---------- View ----------

export const TelegramScheduleView: React.FC<Props> = ({ onBack }) => {
  const [loadState, setLoadState] = useState<LoadState>({ status: 'loading' });
  const [bookStates, setBookStates] = useState<Record<string, BookState>>({});

  // Telegram BackButton — показываем при маунте, скрываем при размонтировании
  useEffect(() => {
    const btn = window.Telegram?.WebApp?.BackButton;
    if (!btn) return;
    btn.show();
    btn.onClick(onBack);
    return () => {
      btn.offClick(onBack);
      btn.hide();
    };
  }, [onBack]);

  // Загрузка расписания
  useEffect(() => {
    const initData = window.Telegram?.WebApp?.initData;
    if (!initData) {
      setLoadState({ status: 'error', message: 'Нет доступа к Telegram WebApp' });
      return;
    }

    fetch(`${SERVER_URL}/api/state`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ initData, action: 'get_schedule' }),
    })
      .then(async (res) => {
        const body = await res.json() as { ok: boolean; data?: ScheduleResponse; error?: string };
        if (!body.ok) throw new Error(body.error ?? 'rpc_error');
        return body.data!;
      })
      .then((data) => {
        const initial: Record<string, BookState> = {};
        for (const item of data.schedule ?? []) {
          initial[item.id] = item.booked ? 'booked' : 'idle';
        }
        setBookStates(initial);
        setLoadState({ status: 'ok', data });
      })
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : 'Ошибка загрузки';
        setLoadState({ status: 'error', message: msg });
      });
  }, []);

  const book = useCallback(async (scheduleId: string) => {
    const initData = window.Telegram?.WebApp?.initData;
    if (!initData) return;

    setBookStates((prev) => ({ ...prev, [scheduleId]: 'loading' }));

    try {
      const res = await fetch(`${SERVER_URL}/api/state`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ initData, action: 'book_session', schedule_id: scheduleId }),
      });
      const body = await res.json() as {
        ok: boolean;
        data?: { booked: boolean; reason?: string };
        error?: string;
      };

      if (!body.ok) {
        setBookStates((prev) => ({ ...prev, [scheduleId]: 'error' }));
        return;
      }

      const result = body.data;
      if (result?.booked) {
        setBookStates((prev) => ({ ...prev, [scheduleId]: 'booked' }));
        // Обновляем счётчик локально чтобы не делать повторный запрос
        setLoadState((prev) => {
          if (prev.status !== 'ok') return prev;
          return {
            ...prev,
            data: {
              ...prev.data,
              schedule: prev.data.schedule.map((s) =>
                s.id === scheduleId
                  ? { ...s, booked: true, booked_count: s.booked_count + 1 }
                  : s
              ),
            },
          };
        });
      } else if (result?.reason === 'already_booked') {
        setBookStates((prev) => ({ ...prev, [scheduleId]: 'booked' }));
      } else if (result?.reason === 'session_full') {
        setBookStates((prev) => ({ ...prev, [scheduleId]: 'full' }));
      } else {
        setBookStates((prev) => ({ ...prev, [scheduleId]: 'error' }));
      }
    } catch {
      setBookStates((prev) => ({ ...prev, [scheduleId]: 'error' }));
    }
  }, []);

  // ---------- Render: loading ----------
  if (loadState.status === 'loading') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground text-sm">Загрузка расписания...</p>
      </div>
    );
  }

  // ---------- Render: error ----------
  if (loadState.status === 'error') {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-3 px-6">
        <p className="text-destructive text-sm text-center">{loadState.message}</p>
        <Button size="sm" variant="outline" onClick={onBack}>Назад</Button>
      </div>
    );
  }

  const { schedule } = loadState.data;

  // Группируем по дате (порядок сохраняется — SQL возвращает ORDER BY start_time)
  const grouped: Record<string, ScheduleItem[]> = {};
  for (const item of schedule) {
    const key = fmt_date(item.start_time);
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(item);
  }

  // ---------- Render: ok ----------
  return (
    <div className="min-h-screen bg-background pb-8">

      {/* Header */}
      <div className="bg-kamp-primary px-4 pt-8 pb-6 flex flex-col items-center gap-1">
        <h1 className="text-white text-xl font-bold">Расписание</h1>
        <p className="text-white/70 text-sm">Ближайшие 7 дней</p>
      </div>

      <div className="px-4 pt-4">
        {schedule.length === 0 ? (
          <p className="text-muted-foreground text-sm text-center pt-12">
            Занятий в ближайшие 7 дней нет
          </p>
        ) : (
          <div className="space-y-6">
            {Object.entries(grouped).map(([date, items]) => (
              <div key={date}>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 capitalize">
                  {date}
                </p>

                <div className="space-y-3">
                  {items.map((item) => {
                    const bookState = bookStates[item.id] ?? 'idle';
                    const isFull =
                      item.max_participants !== null &&
                      item.booked_count >= item.max_participants;

                    return (
                      <Card key={item.id}>
                        <CardContent className="py-3 px-4">

                          {/* Title + badge */}
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <p className="font-semibold text-sm leading-snug">{item.title}</p>
                            <Badge variant="secondary" className="text-[10px] px-1.5 shrink-0">
                              {item.activity_type}
                            </Badge>
                          </div>

                          {/* Meta */}
                          <div className="flex flex-col gap-1 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1.5">
                              <Clock className="w-3 h-3 shrink-0" />
                              {fmt_time(item.start_time)}–{fmt_time(item.end_time)}
                            </span>

                            {item.location && (
                              <span className="flex items-center gap-1.5">
                                <MapPin className="w-3 h-3 shrink-0" />
                                {item.location}
                              </span>
                            )}

                            {item.instructor && (
                              <span className="flex items-center gap-1.5">
                                <User className="w-3 h-3 shrink-0" />
                                {item.instructor.name}
                                {item.instructor.role && (
                                  <span className="opacity-60">· {item.instructor.role}</span>
                                )}
                              </span>
                            )}

                            {item.max_participants !== null && (
                              <span className="flex items-center gap-1.5">
                                <Users className="w-3 h-3 shrink-0" />
                                {item.booked_count} / {item.max_participants} мест
                                {isFull && (
                                  <span className="text-destructive font-medium">· заполнено</span>
                                )}
                              </span>
                            )}
                          </div>

                          {/* Description */}
                          {item.description && (
                            <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
                              {item.description}
                            </p>
                          )}

                          <BookButton
                            state={bookState}
                            isFull={isFull}
                            onBook={() => book(item.id)}
                          />

                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
};
