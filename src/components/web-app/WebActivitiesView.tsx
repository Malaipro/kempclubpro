import React, { useState } from 'react';
import { Activity, Dumbbell, Flame, Pyramid, Salad, Swords, Target } from 'lucide-react';
import { useAppApi } from '@/components/app-shared/apiAdapter';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

type ActivityType = 'bjj' | 'kickboxing' | 'ofp' | 'pyramid' | 'nutrition' | 'tactics';
type CheckState = 'idle' | 'loading' | 'checked' | 'error';

const ACTIVITIES: Array<{ type: ActivityType; title: string; icon: React.ReactNode }> = [
  { type: 'bjj', title: 'BJJ', icon: <Swords className="h-5 w-5" /> },
  { type: 'kickboxing', title: 'Кикбоксинг', icon: <Flame className="h-5 w-5" /> },
  { type: 'ofp', title: 'ОФП', icon: <Dumbbell className="h-5 w-5" /> },
  { type: 'pyramid', title: 'Пирамида КЭМП', icon: <Pyramid className="h-5 w-5" /> },
  { type: 'nutrition', title: 'Нутрициология', icon: <Salad className="h-5 w-5" /> },
  { type: 'tactics', title: 'Тактика', icon: <Target className="h-5 w-5" /> },
];

export const WebActivitiesView: React.FC = () => {
  const { callApi } = useAppApi();
  const [states, setStates] = useState<Record<ActivityType, CheckState>>({
    bjj: 'idle', kickboxing: 'idle', ofp: 'idle', pyramid: 'idle', nutrition: 'idle', tactics: 'idle',
  });

  const checkIn = async (type: ActivityType) => {
    setStates((current) => ({ ...current, [type]: 'loading' }));
    try {
      const result = await callApi<{ checked_in: boolean; already_checked: boolean }>('check_in', { activity_type: type });
      setStates((current) => ({ ...current, [type]: result.checked_in || result.already_checked ? 'checked' : 'error' }));
    } catch {
      setStates((current) => ({ ...current, [type]: 'error' }));
    }
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="bg-kamp-primary px-4 pb-6 pt-8 text-center text-primary-foreground">
        <Activity className="mx-auto mb-2 h-6 w-6" />
        <h1 className="text-xl font-bold text-primary-foreground">Отметки</h1>
        <p className="text-sm text-primary-foreground/75">Отметь выполненную активность</p>
      </header>
      <div className="space-y-3 px-4 pt-4">
        {ACTIVITIES.map((item) => {
          const state = states[item.type];
          return (
            <Card key={item.type}>
              <CardContent className="flex items-center gap-3 px-4 py-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">{item.icon}</div>
                <p className="min-w-0 flex-1 text-sm font-semibold">{item.title}</p>
                <Button
                  size="sm"
                  variant={state === 'checked' ? 'secondary' : 'default'}
                  disabled={state === 'loading' || state === 'checked'}
                  onClick={() => void checkIn(item.type)}
                >
                  {state === 'checked' ? 'Отмечено' : state === 'loading' ? '...' : state === 'error' ? 'Повторить' : 'Отметить'}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};