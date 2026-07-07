import React, { useEffect, useState, useCallback } from 'react';
import { Swords, Flame, Dumbbell } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

const SERVER_URL = import.meta.env.VITE_TELEGRAM_SERVER_URL ?? 'https://tg.kempclub.pro';

// ---------- Types ----------

type ActivityType = 'bjj' | 'kickboxing' | 'ofp';

interface ActivityDef {
  type: ActivityType;
  title: string;
  icon: React.ReactNode;
}

const ACTIVITIES: ActivityDef[] = [
  { type: 'bjj', title: 'BJJ', icon: <Swords className="w-5 h-5" /> },
  { type: 'kickboxing', title: 'Кикбоксинг', icon: <Flame className="w-5 h-5" /> },
  { type: 'ofp', title: 'ОФП', icon: <Dumbbell className="w-5 h-5" /> },
];

type CheckInState = 'idle' | 'loading' | 'checked' | 'error';

interface Props {
  onBack: () => void;
}

// ---------- CheckInButton ----------

interface CheckInButtonProps {
  state: CheckInState;
  onCheckIn: () => void;
}

const CheckInButton: React.FC<CheckInButtonProps> = ({ state, onCheckIn }) => {
  if (state === 'checked') {
    return (
      <Button
        size="sm"
        disabled
        className="mt-3 w-full bg-green-600 hover:bg-green-600 text-white disabled:opacity-100"
      >
        ✓ Отмечено сегодня
      </Button>
    );
  }

  return (
    <Button
      size="sm"
      className="mt-3 w-full bg-kamp-primary hover:bg-kamp-primary/90 text-white"
      disabled={state === 'loading'}
      onClick={onCheckIn}
    >
      {state === 'loading' ? 'Отмечаем...' : state === 'error' ? 'Ошибка — повторить' : 'Отметить присутствие'}
    </Button>
  );
};

// ---------- View ----------

export const TelegramTrainingView: React.FC<Props> = ({ onBack }) => {
  const [checkInStates, setCheckInStates] = useState<Record<ActivityType, CheckInState>>({
    bjj: 'idle',
    kickboxing: 'idle',
    ofp: 'idle',
  });

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

  const checkIn = useCallback(async (activityType: ActivityType) => {
    const initData = window.Telegram?.WebApp?.initData;
    if (!initData) return;

    setCheckInStates((prev) => ({ ...prev, [activityType]: 'loading' }));

    try {
      const res = await fetch(`${SERVER_URL}/api/state`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ initData, action: 'check_in', activity_type: activityType }),
      });

      const body = await res.json() as {
        ok: boolean;
        data?: { checked_in: boolean; already_checked: boolean; date: string | null };
        error?: string;
      };

      if (!body.ok || !body.data) {
        setCheckInStates((prev) => ({ ...prev, [activityType]: 'error' }));
        return;
      }

      const { checked_in, already_checked } = body.data;
      setCheckInStates((prev) => ({
        ...prev,
        [activityType]: checked_in || already_checked ? 'checked' : 'error',
      }));
    } catch {
      setCheckInStates((prev) => ({ ...prev, [activityType]: 'error' }));
    }
  }, []);

  return (
    <div className="min-h-screen bg-background pb-8">

      {/* Header */}
      <div className="bg-kamp-primary px-4 pt-8 pb-6 flex flex-col items-center gap-1">
        <h1 className="text-white text-xl font-bold">Тренировки</h1>
        <p className="text-white/70 text-sm">Отметь своё присутствие</p>
      </div>

      <div className="px-4 pt-4 space-y-3">
        {ACTIVITIES.map((activity) => (
          <Card key={activity.type}>
            <CardContent className="py-3 px-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
                    {activity.icon}
                  </div>
                  <p className="font-semibold text-sm">{activity.title}</p>
                </div>
                <Badge variant="secondary" className="text-[10px] px-1.5 shrink-0">
                  {activity.type}
                </Badge>
              </div>

              <CheckInButton
                state={checkInStates[activity.type]}
                onCheckIn={() => checkIn(activity.type)}
              />
            </CardContent>
          </Card>
        ))}
      </div>

    </div>
  );
};
