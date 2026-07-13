import React, { useEffect, useState } from 'react';
import { Lock, Pyramid, ChevronRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const SERVER_URL = import.meta.env.VITE_TELEGRAM_SERVER_URL ?? 'https://tg.kempclub.pro';

// ---------- Types ----------

interface PyramidLevel {
  id: string;
  level_number: number;
  title: string;
  description: string | null;
  presentation_url: string | null;
  is_unlocked: boolean;
}

type LoadState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ok'; data: PyramidLevel[] };

interface Props {
  onBack: () => void;
}

// ---------- View ----------

export const TelegramPyramidView: React.FC<Props> = ({ onBack }) => {
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

  // Загрузка уровней пирамиды
  useEffect(() => {
    const initData = window.Telegram?.WebApp?.initData;
    if (!initData) {
      setLoadState({ status: 'error', message: 'Нет доступа к Telegram WebApp' });
      return;
    }

    fetch(`${SERVER_URL}/api/state`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ initData, action: 'get_pyramid' }),
    })
      .then(async (res) => {
        const body = await res.json() as { ok: boolean; data?: { levels: PyramidLevel[] }; error?: string };
        if (!body.ok || !body.data) throw new Error(body.error ?? 'rpc_error');
        return body.data.levels;
      })
      .then((levels) => setLoadState({ status: 'ok', data: levels }))
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : 'Ошибка загрузки';
        setLoadState({ status: 'error', message: msg });
      });
  }, []);

  // ---------- Render: loading ----------
  if (loadState.status === 'loading') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground text-sm">Загрузка пирамиды...</p>
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

  const levels = loadState.data;

  return (
    <div className="min-h-screen bg-background pb-8">

      {/* Header */}
      <div className="bg-kamp-primary px-4 pt-8 pb-6 flex flex-col items-center gap-1">
        <h1 className="text-white text-xl font-bold">Пирамида КЭМП</h1>
        <p className="text-white/70 text-sm">7 уровней трансформации</p>
      </div>

      <div className="px-4 pt-4 space-y-3">
        {levels.map((level) => {
          const locked = !level.is_unlocked;

          const content = (
            <CardContent className="py-4 px-4 flex items-center gap-3">
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-sm font-bold ${
                  locked ? 'bg-muted text-muted-foreground' : 'bg-kamp-primary/10 text-kamp-primary'
                }`}
              >
                {level.level_number}
              </div>
              <div className="min-w-0 flex-1">
                <p className={`text-sm font-semibold ${locked ? 'text-muted-foreground' : ''}`}>
                  {level.title}
                </p>
                {level.description && (
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{level.description}</p>
                )}
              </div>
              {locked ? (
                <Lock className="w-4 h-4 text-muted-foreground shrink-0" />
              ) : (
                <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
              )}
            </CardContent>
          );

          if (locked || !level.presentation_url) {
            return (
              <Card key={level.id} className="opacity-60 select-none">
                {content}
              </Card>
            );
          }

          return (
            <a
              key={level.id}
              href={level.presentation_url}
              target="_blank"
              rel="noopener noreferrer"
              className="block"
            >
              <Card className="cursor-pointer hover:bg-muted/40 transition-colors">
                {content}
              </Card>
            </a>
          );
        })}

        {levels.length === 0 && (
          <Card>
            <CardContent className="py-8 px-4 text-center">
              <Pyramid className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Уровни пирамиды пока не добавлены</p>
            </CardContent>
          </Card>
        )}
      </div>

    </div>
  );
};
