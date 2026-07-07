import React, { useEffect, useState } from 'react';
import { Clock, MapPin, User, Users } from 'lucide-react';
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

function fmt_time(iso: string): string {
  return new Date(iso).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
}

function fmt_date(iso: string): string {
  return new Date(iso).toLocaleDateString('ru-RU', {
    weekday: 'long', day: 'numeric', month: 'long',
  });
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
}

const BookingStatus: React.FC<BookingStatusProps> = ({ booked, isFull }) => {
  if (booked) {
    return (
      <div className="mt-3 rounded-lg bg-green-600/10 border border-green-600/25 px-3 py-1.5 text-center">
        <span className="text-xs font-semibold text-green-500">Вы записаны</span>
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

  return null;
};

// ---------- View ----------

export const TelegramScheduleView: React.FC<Props> = ({ onBack }) => {
  const [loadState, setLoadState] = useState<LoadState>({ status: 'loading' });

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
        setLoadState({ status: 'ok', data });
      })
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : 'Ошибка загрузки';
        setLoadState({ status: 'error', message: msg });
      });
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
                    const isFull =
                      item.max_participants !== null &&
                      item.booked_count >= item.max_participants;

                    const activityColor = ACTIVITY_COLORS[getActivityColorKey(item.activity_type, item.title)];

                    return (
                      <Card
                        key={item.id}
                        className={`border-l-4 ${activityColor.border}`}
                      >
                        <CardContent className="py-3 px-4">

                          {/* Title */}
                          <p
                            className="font-semibold text-sm leading-snug mb-2"
                            style={{ color: activityColor.hex }}
                          >
                            {item.title}
                          </p>

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

                          <BookingStatus booked={item.booked} isFull={isFull} />

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
