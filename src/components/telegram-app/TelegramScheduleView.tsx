import React, { useCallback, useEffect, useState } from 'react';
import { ChevronDown, ChevronUp, MapPin } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const SERVER_URL = import.meta.env.VITE_TELEGRAM_SERVER_URL ?? 'https://tg.kempclub.pro';

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

interface Props {
  onBack: () => void;
}

// ---------- Helpers ----------

// Europe/Moscow — фиксированный UTC+3 круглый год (переход на летнее время отменён в 2014).
// Вместо toLocaleString(..., { timeZone: 'Europe/Moscow' }) — которое зависит от поддержки
// базы часовых поясов в ICU движка WebView и может тихо откатиться на локальный часовой пояс
// устройства — сдвигаем момент времени на +3ч вручную и форматируем как UTC. Так результат
// не зависит ни от часового пояса устройства пользователя, ни от полноты ICU в WebView.
const MOSCOW_OFFSET_MS = 3 * 60 * 60 * 1000;

function toMoscow(iso: string): Date {
  return new Date(new Date(iso).getTime() + MOSCOW_OFFSET_MS);
}

function fmt_time(iso: string): string {
  return toMoscow(iso).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' });
}

function fmt_date(iso: string): string {
  return toMoscow(iso).toLocaleDateString('ru-RU', { timeZone: 'UTC',
    weekday: 'long', day: 'numeric', month: 'long',
  });
}

// Ключ группировки по календарной дате в Москве — строится из того же сдвинутого момента,
// что и fmt_date, поэтому дата в заголовке группы всегда совпадает с датой, по которой
// сгруппированы карточки.
function dateKey(iso: string): string {
  const d = toMoscow(iso);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
}

// Цветовая маркировка карточки по типу занятия — один источник цвета для
// полоски карточки (Tailwind-класс) и названия (inline color, тот же оттенок)
const ACTIVITY_COLORS = {
  bjj: { border: 'border-blue-500', hex: '#3b82f6' },
  kickboxing: { border: 'border-red-500', hex: '#ef4444' },
  ofp: { border: 'border-orange-500', hex: '#f97316' },
  pyramid: { border: 'border-purple-500', hex: '#a855f7' },
  nutrition: { border: 'border-green-500', hex: '#22c55e' },
  tactics: { border: 'border-yellow-500', hex: '#eab308' },
  default: { border: 'border-gray-300', hex: '#d1d5db' },
} as const;

type ActivityColorKey = keyof typeof ACTIVITY_COLORS;

function getActivityColorKey(activityType: string, title: string): ActivityColorKey {
  const key = `${activityType} ${title}`.toLowerCase();

  if (key.includes('bjj') || key.includes('бжж')) return 'bjj';
  if (key.includes('kickbox') || key.includes('кикбокс')) return 'kickboxing';
  if (key.includes('ofp') || key.includes('офп')) return 'ofp';
  if (key.includes('pyramid') || key.includes('пирамид') || key.includes('лекци')) return 'pyramid';
  if (key.includes('nutrition') || key.includes('нутрициолог')) return 'nutrition';
  if (key.includes('tactic') || key.includes('тактик')) return 'tactics';
  return 'default';
}

// ---------- BookingStatus ----------

interface BookingStatusProps {
  booked: boolean;
  isFull: boolean;
  scheduleId: string;
  onBook: (id: string) => void;
  onCancel: (id: string) => void;
  loading: boolean;
}

const BookingStatus: React.FC<BookingStatusProps> = ({ booked, isFull, scheduleId, onBook, onCancel, loading }) => {
  if (booked) {
    return (
      <div className="mt-3 space-y-2">
        <div className="rounded-lg bg-green-600/10 border border-green-600/25 px-3 py-1.5 text-center">
          <span className="text-xs font-semibold text-green-500">Вы записаны</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="w-full text-destructive hover:text-destructive"
          disabled={loading}
          onClick={() => onCancel(scheduleId)}
        >
          {loading ? 'Отменяю...' : 'Отменить запись'}
        </Button>
      </div>
    );
  }

  if (isFull) {
    return (
      <div className="mt-3 rounded-lg bg-muted/50 px-3 py-1.5 text-center">
        <span className="text-xs text-muted-foreground">Мест нет</span>
      </div>
    );
  }

  return (
    <Button
      size="sm"
      className="mt-3 w-full bg-kamp-primary hover:bg-kamp-primary/90"
      disabled={loading}
      onClick={() => onBook(scheduleId)}
    >
      {loading ? 'Записываю...' : 'Записаться'}
    </Button>
  );
};

// ---------- View ----------

export const TelegramScheduleView: React.FC<Props> = ({ onBack }) => {
  const [loadState, setLoadState] = useState<LoadState>({ status: 'loading' });
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

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
  const fetchSchedule = useCallback(async () => {
    const initData = window.Telegram?.WebApp?.initData;
    if (!initData) {
      setLoadState({ status: 'error', message: 'Нет доступа к Telegram WebApp' });
      return;
    }

    try {
      const res = await fetch(`${SERVER_URL}/api/state`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ initData, action: 'get_schedule', days: 90 }),
      });
      const body = await res.json() as { ok: boolean; data?: ScheduleResponse; error?: string };
      if (!body.ok) throw new Error(body.error ?? 'rpc_error');
      setLoadState({ status: 'ok', data: body.data! });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Ошибка загрузки';
      setLoadState({ status: 'error', message: msg });
    }
  }, []);

  useEffect(() => { fetchSchedule(); }, [fetchSchedule]);

  const handleBook = async (scheduleId: string) => {
    const initData = window.Telegram?.WebApp?.initData;
    if (!initData) return;
    setBookingId(scheduleId);
    try {
      const res = await fetch(`${SERVER_URL}/api/state`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ initData, action: 'book_session', schedule_id: scheduleId }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || 'Ошибка записи');
      await fetchSchedule();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Ошибка записи');
    } finally {
      setBookingId(null);
    }
  };

  const handleCancel = async (scheduleId: string) => {
    const initData = window.Telegram?.WebApp?.initData;
    if (!initData) return;
    setBookingId(scheduleId);
    try {
      const res = await fetch(`${SERVER_URL}/api/state`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ initData, action: 'cancel_booking', schedule_id: scheduleId }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || 'Ошибка отмены');
      await fetchSchedule();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Ошибка отмены');
    } finally {
      setBookingId(null);
    }
  };



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

  // Группируем по календарной дате в Москве (порядок сохраняется — SQL возвращает ORDER BY start_time).
  // Ключ группировки (dateKey) и подпись группы (fmt_date) выводятся из одного и того же
  // сдвинутого в Москву момента времени, поэтому не могут разойтись.
  const grouped: Record<string, ScheduleItem[]> = {};
  const groupLabels: Record<string, string> = {};
  for (const item of schedule) {
    const key = dateKey(item.start_time);
    if (!grouped[key]) {
      grouped[key] = [];
      groupLabels[key] = fmt_date(item.start_time);
    }
    grouped[key].push(item);
  }

  // ---------- Render: ok ----------
  return (
    <div className="min-h-screen bg-background pb-8">

      {/* Header */}
      <div className="bg-kamp-primary px-4 pt-8 pb-6 flex flex-col items-center gap-1">
        <h1 className="text-white text-xl font-bold">Расписание</h1>
        <p className="text-white/70 text-sm">Расписание</p>
      </div>

      <div className="px-4 pt-4">
        {schedule.length === 0 ? (
          <p className="text-muted-foreground text-sm text-center pt-12">
            Занятий в ближайшие 7 дней нет
          </p>
        ) : (
          <div className="space-y-6">
            {Object.entries(grouped).map(([key, items]) => (
              <div key={key}>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 capitalize">
                  {groupLabels[key]}
                </p>

                <div className="space-y-3">
                  {items.map((item) => {
                    const isFull =
                      item.max_participants !== null &&
                      item.booked_count >= item.max_participants;

                    const activityColor = ACTIVITY_COLORS[getActivityColorKey(item.activity_type, item.title)];
                    const isExpanded = expandedId === item.id;

                    return (
                      <Card
                        key={item.id}
                        className={`border-l-4 ${activityColor.border}`}
                      >
                        <button
                          type="button"
                          className="w-full flex items-center gap-3 py-3 px-4 text-left"
                          onClick={() => setExpandedId(isExpanded ? null : item.id)}
                        >
                          <span className="text-xs text-muted-foreground shrink-0 tabular-nums">
                            {fmt_time(item.start_time)}–{fmt_time(item.end_time)}
                          </span>

                          <span
                            className="flex-1 min-w-0 font-semibold text-sm leading-snug truncate"
                            style={{ color: activityColor.hex }}
                          >
                            {item.title}
                          </span>

                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4 shrink-0 text-muted-foreground" />
                          ) : (
                            <ChevronDown className="w-4 h-4 shrink-0 text-muted-foreground" />
                          )}
                        </button>

                        {isExpanded && (
                          <CardContent className="pt-0 pb-3 px-4">

                            {item.location && (
                              <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                <MapPin className="w-3 h-3 shrink-0" />
                                {item.location}
                              </span>
                            )}

                            {/* Description */}
                            {item.description && (() => {
                              const [descTitle, ...rest] = item.description.split('|||');
                              const descBody = rest.join('|||').trim();
                              return (
                                <div className="mt-2 text-xs leading-relaxed">
                                  <p className={descBody ? 'font-semibold text-foreground' : 'text-muted-foreground'}>
                                    {descTitle.trim()}
                                  </p>
                                  {descBody && (
                                    <p className="mt-0.5 text-muted-foreground">{descBody}</p>
                                  )}
                                </div>
                              );
                            })()}

                            <BookingStatus
                              booked={item.booked}
                              isFull={isFull}
                              scheduleId={item.id}
                              onBook={handleBook}
                              onCancel={handleCancel}
                              loading={bookingId === item.id}
                            />

                          </CardContent>
                        )}
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
