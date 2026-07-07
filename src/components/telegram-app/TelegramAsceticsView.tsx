import React, { useEffect, useState, useCallback } from 'react';
import { Flame } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

const SERVER_URL = import.meta.env.VITE_TELEGRAM_SERVER_URL ?? 'https://tg.kempclub.pro';

// ---------- Types ----------

interface AsceticData {
  hasAscetic: boolean;
  id?: string;
  text?: string;
  streak?: number;
  checkedInToday?: boolean;
}

type LoadState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ok'; data: AsceticData };

type SubmitState = 'idle' | 'loading' | 'error';
type CheckInState = 'idle' | 'loading' | 'checked' | 'error';

interface Props {
  onBack: () => void;
}

// ---------- View ----------

export const TelegramAsceticsView: React.FC<Props> = ({ onBack }) => {
  const [loadState, setLoadState] = useState<LoadState>({ status: 'loading' });
  const [text, setText] = useState('');
  const [submitState, setSubmitState] = useState<SubmitState>('idle');
  const [checkInState, setCheckInState] = useState<CheckInState>('idle');

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

  // Загрузка текущей аскезы
  useEffect(() => {
    const initData = window.Telegram?.WebApp?.initData;
    if (!initData) {
      setLoadState({ status: 'error', message: 'Нет доступа к Telegram WebApp' });
      return;
    }

    fetch(`${SERVER_URL}/api/state`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ initData, action: 'get_ascetics' }),
    })
      .then(async (res) => {
        const body = await res.json() as {
          ok: boolean;
          data?: { has_ascetic: boolean; id?: string; text?: string; streak?: number; checked_in_today?: boolean };
          error?: string;
        };
        if (!body.ok || !body.data) throw new Error(body.error ?? 'rpc_error');
        return body.data;
      })
      .then((data) => {
        const asceticData: AsceticData = {
          hasAscetic: data.has_ascetic,
          id: data.id,
          text: data.text,
          streak: data.streak,
          checkedInToday: data.checked_in_today,
        };
        setCheckInState(asceticData.checkedInToday ? 'checked' : 'idle');
        setLoadState({ status: 'ok', data: asceticData });
      })
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : 'Ошибка загрузки';
        setLoadState({ status: 'error', message: msg });
      });
  }, []);

  const takeAscetic = useCallback(async () => {
    const initData = window.Telegram?.WebApp?.initData;
    if (!initData || !text.trim() || submitState === 'loading') return;

    setSubmitState('loading');

    try {
      const res = await fetch(`${SERVER_URL}/api/state`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ initData, action: 'take_ascetic', text: text.trim() }),
      });

      const body = await res.json() as {
        ok: boolean;
        data?: { id: string; text: string; streak: number; checked_in_today: boolean };
        error?: string;
      };

      if (!body.ok || !body.data) {
        setSubmitState('error');
        return;
      }

      setCheckInState(body.data.checked_in_today ? 'checked' : 'idle');
      setLoadState({
        status: 'ok',
        data: {
          hasAscetic: true,
          id: body.data.id,
          text: body.data.text,
          streak: body.data.streak,
          checkedInToday: body.data.checked_in_today,
        },
      });
      setSubmitState('idle');
    } catch {
      setSubmitState('error');
    }
  }, [text, submitState]);

  const checkIn = useCallback(async (asceticId: string) => {
    const initData = window.Telegram?.WebApp?.initData;
    if (!initData) return;

    setCheckInState('loading');

    try {
      const res = await fetch(`${SERVER_URL}/api/state`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ initData, action: 'checkin_ascetic', ascetic_id: asceticId }),
      });

      const body = await res.json() as {
        ok: boolean;
        data?: { checked_in: boolean; already_checked: boolean; streak: number };
        error?: string;
      };

      if (!body.ok || !body.data) {
        setCheckInState('error');
        return;
      }

      const { checked_in, already_checked, streak } = body.data;
      if (!checked_in && !already_checked) {
        setCheckInState('error');
        return;
      }

      setCheckInState('checked');
      setLoadState((prev) => {
        if (prev.status !== 'ok') return prev;
        return { ...prev, data: { ...prev.data, streak } };
      });
    } catch {
      setCheckInState('error');
    }
  }, []);

  // ---------- Render: loading ----------
  if (loadState.status === 'loading') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground text-sm">Загрузка аскезы...</p>
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

  const { data } = loadState;

  return (
    <div className="min-h-screen bg-background pb-8">

      {/* Header */}
      <div className="bg-kamp-primary px-4 pt-8 pb-6 flex flex-col items-center gap-1">
        <h1 className="text-white text-xl font-bold">Аскезы</h1>
        <p className="text-white/70 text-sm">Держи слово каждый день</p>
      </div>

      <div className="px-4 pt-4">
        {!data.hasAscetic ? (
          // ---------- Форма: взять аскезу ----------
          <Card>
            <CardContent className="py-4 px-4 space-y-3">
              <p className="text-sm font-semibold">Напиши свою аскезу</p>
              <Textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Например: холодный душ каждое утро"
                rows={4}
                disabled={submitState === 'loading'}
              />
              <Button
                className="w-full bg-kamp-primary hover:bg-kamp-primary/90 text-white"
                disabled={!text.trim() || submitState === 'loading'}
                onClick={() => void takeAscetic()}
              >
                {submitState === 'loading' ? 'Сохраняем...' : submitState === 'error' ? 'Ошибка — повторить' : 'Взять аскезу'}
              </Button>
            </CardContent>
          </Card>
        ) : (
          // ---------- Текущая аскеза ----------
          <Card>
            <CardContent className="py-4 px-4 space-y-3">
              <p className="text-sm leading-relaxed">{data.text}</p>

              <div className="flex items-center gap-2 text-sm">
                <Flame className="w-4 h-4 text-orange-500" />
                <span className="font-semibold">{data.streak ?? 0}</span>
                <span className="text-muted-foreground">
                  {data.streak === 1 ? 'день подряд' : 'дней подряд'}
                </span>
              </div>

              {checkInState === 'checked' ? (
                <Button
                  disabled
                  className="w-full bg-green-600 hover:bg-green-600 text-white disabled:opacity-100"
                >
                  ✓ Отмечено сегодня
                </Button>
              ) : (
                <Button
                  className="w-full bg-kamp-primary hover:bg-kamp-primary/90 text-white"
                  disabled={checkInState === 'loading'}
                  onClick={() => data.id && checkIn(data.id)}
                >
                  {checkInState === 'loading' ? 'Отмечаем...' : checkInState === 'error' ? 'Ошибка — повторить' : 'День +'}
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </div>

    </div>
  );
};
