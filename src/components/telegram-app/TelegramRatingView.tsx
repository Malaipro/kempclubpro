import React, { useEffect, useState } from 'react';
import { Trophy, Star, Swords, Flame, Dumbbell, Pyramid, Salad, Target, BookOpen, Award } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const SERVER_URL = import.meta.env.VITE_TELEGRAM_SERVER_URL ?? 'https://tg.kempclub.pro';

// ---------- Types ----------

interface Breakdown {
  bjj: number;
  kickboxing: number;
  ofp: number;
  theory: number;
  tactical: number;
  nutrition: number;
  kamp_pyramid: number;
  challenges: number;
}

interface Attendance {
  total: number;
  by_type: { activity_type: string; count: number }[];
}

interface MyStats {
  rank_position: number | null;
  total_points: number;
  breakdown: Breakdown;
  attendance: Attendance;
}

interface LeaderboardRow {
  user_id: string;
  display_name: string | null;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  rank_position: number | null;
  total_points: number;
  is_me: boolean;
}

interface RatingData {
  my: MyStats;
  leaderboard: LeaderboardRow[];
}

type LoadState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ok'; data: RatingData };

interface Props {
  onBack: () => void;
}

// ---------- Labels ----------

const BREAKDOWN_LABELS: { key: keyof Breakdown; label: string; icon: React.ReactNode }[] = [
  { key: 'bjj', label: 'BJJ', icon: <Swords className="w-4 h-4" /> },
  { key: 'kickboxing', label: 'Кикбоксинг', icon: <Flame className="w-4 h-4" /> },
  { key: 'ofp', label: 'ОФП', icon: <Dumbbell className="w-4 h-4" /> },
  { key: 'tactical', label: 'Тактика', icon: <Target className="w-4 h-4" /> },
  { key: 'theory', label: 'Теория', icon: <BookOpen className="w-4 h-4" /> },
  { key: 'nutrition', label: 'Нутрициология', icon: <Salad className="w-4 h-4" /> },
  { key: 'kamp_pyramid', label: 'Пирамида КЭМП', icon: <Pyramid className="w-4 h-4" /> },
  { key: 'challenges', label: 'Челленджи', icon: <Award className="w-4 h-4" /> },
];

const ATTENDANCE_LABELS: Record<string, string> = {
  bjj: 'BJJ',
  kickboxing: 'Кикбоксинг',
  ofp: 'ОФП',
  pyramid: 'Пирамида КЭМП',
  nutrition: 'Нутрициология',
  tactics: 'Тактика',
};

const nameOf = (row: LeaderboardRow): string =>
  row.display_name || [row.first_name, row.last_name].filter(Boolean).join(' ') || 'Участник';

const initialOf = (name: string): string => name.trim().charAt(0).toUpperCase() || 'K';

// ---------- View ----------

export const TelegramRatingView: React.FC<Props> = ({ onBack }) => {
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

  // Загрузка рейтинга
  useEffect(() => {
    const initData = window.Telegram?.WebApp?.initData;
    if (!initData) {
      setLoadState({ status: 'error', message: 'Нет доступа к Telegram WebApp' });
      return;
    }

    fetch(`${SERVER_URL}/api/state`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ initData, action: 'get_rating' }),
    })
      .then(async (res) => {
        const body = await res.json() as { ok: boolean; data?: RatingData; error?: string };
        if (!body.ok || !body.data) throw new Error(body.error ?? 'rpc_error');
        return body.data;
      })
      .then((data) => setLoadState({ status: 'ok', data }))
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : 'Ошибка загрузки';
        setLoadState({ status: 'error', message: msg });
      });
  }, []);

  // ---------- Render: loading ----------
  if (loadState.status === 'loading') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground text-sm">Загрузка рейтинга...</p>
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

  const { my, leaderboard } = loadState.data;

  return (
    <div className="min-h-screen bg-background pb-8">

      {/* Header */}
      <div className="bg-kamp-primary px-4 pt-8 pb-6 flex flex-col items-center gap-1">
        <h1 className="text-white text-xl font-bold">Рейтинг</h1>
        <p className="text-white/70 text-sm">Твой прогресс и топ потока</p>
      </div>

      {/* ── Моя статистика ── */}
      <div className="px-4 pt-4">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Моя статистика
        </p>

        <div className="grid grid-cols-2 gap-3 mb-3">
          <Card>
            <CardContent className="flex items-center gap-3 py-3">
              <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
                <Star className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Место в рейтинге</p>
                <p className="text-base font-bold truncate">
                  {my.rank_position != null ? `#${my.rank_position}` : '—'}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 py-3">
              <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
                <Trophy className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Очки всего</p>
                <p className="text-base font-bold truncate">{my.total_points}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="mb-3">
          <CardContent className="py-3 px-4">
            <p className="text-xs text-muted-foreground mb-2">Детализация по активностям</p>
            <div className="space-y-1.5">
              {BREAKDOWN_LABELS.map(({ key, label, icon }) => (
                <div key={key} className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 text-muted-foreground">
                    {icon}{label}
                  </span>
                  <span className="font-semibold">{my.breakdown[key]}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="py-3 px-4">
            <p className="text-xs text-muted-foreground mb-2">
              Посещаемость{my.attendance.total > 0 ? ` — ${my.attendance.total} отметок всего` : ''}
            </p>
            {my.attendance.by_type.length === 0 ? (
              <p className="text-sm text-muted-foreground">Пока нет отметок</p>
            ) : (
              <div className="space-y-1.5">
                {my.attendance.by_type.map((item) => (
                  <div key={item.activity_type} className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      {ATTENDANCE_LABELS[item.activity_type] ?? item.activity_type}
                    </span>
                    <span className="font-semibold">{item.count}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Лидерборд ── */}
      <div className="px-4 pt-6">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Топ потока
        </p>

        {leaderboard.length === 0 ? (
          <Card>
            <CardContent className="py-8 px-4 text-center">
              <Trophy className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Рейтинг потока пока пуст</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {leaderboard.map((row) => {
              const name = nameOf(row);
              return (
                <Card
                  key={row.user_id}
                  className={row.is_me ? 'border-kamp-primary bg-kamp-primary/10' : undefined}
                >
                  <CardContent className="flex items-center gap-3 py-2.5 px-4">
                    <span className={`w-6 text-sm font-bold shrink-0 ${row.is_me ? 'text-kamp-primary' : 'text-muted-foreground'}`}>
                      #{row.rank_position ?? '—'}
                    </span>
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden shrink-0">
                      {row.avatar_url ? (
                        <img src={row.avatar_url} alt={name} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-primary text-xs font-black">{initialOf(name)}</span>
                      )}
                    </div>
                    <span className={`text-sm truncate flex-1 ${row.is_me ? 'font-semibold' : ''}`}>
                      {name}{row.is_me ? ' (ты)' : ''}
                    </span>
                    <span className="text-sm font-bold shrink-0">{row.total_points}</span>
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
