import React, { useEffect, useState, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

const SERVER_URL = import.meta.env.VITE_TELEGRAM_SERVER_URL ?? 'https://tg.kempclub.pro';

const EMOTIONS = [
  'Радость', 'Спокойствие', 'Энергия', 'Уверенность', 'Тревога',
  'Усталость', 'Раздражение', 'Злость', 'Грусть', 'Вдохновение',
];

// ---------- Types ----------

interface Prompt {
  id: string;
  question_text: string;
  sort_order: number;
}

interface EntryEmotion {
  emotion_name: string;
  intensity: number;
}

interface EntryAnswer {
  prompt_id: string;
  answer_text: string | null;
}

interface Entry {
  id: string;
  entry_date: string;
  day_type: string;
  emotions: EntryEmotion[];
  answers: EntryAnswer[];
}

interface JournalData {
  date: string;
  day_type: string;
  prompts: Prompt[];
  entry: Entry | null;
}

type LoadState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ok'; data: JournalData };

type SaveState = 'idle' | 'loading' | 'error';

interface Props {
  onBack: () => void;
}

// ---------- View ----------

export const TelegramJournalView: React.FC<Props> = ({ onBack }) => {
  const [loadState, setLoadState] = useState<LoadState>({ status: 'loading' });
  const [intensities, setIntensities] = useState<Record<string, number>>({});
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [saveState, setSaveState] = useState<SaveState>('idle');

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

  // Загрузка вопросов дня + записи участника, если уже есть
  useEffect(() => {
    const initData = window.Telegram?.WebApp?.initData;
    if (!initData) {
      setLoadState({ status: 'error', message: 'Нет доступа к Telegram WebApp' });
      return;
    }

    fetch(`${SERVER_URL}/api/state`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ initData, action: 'get_journal' }),
    })
      .then(async (res) => {
        const body = await res.json() as { ok: boolean; data?: JournalData; error?: string };
        if (!body.ok || !body.data) throw new Error(body.error ?? 'rpc_error');
        return body.data;
      })
      .then((data) => setLoadState({ status: 'ok', data }))
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : 'Ошибка загрузки';
        setLoadState({ status: 'error', message: msg });
      });
  }, []);

  const toggleIntensity = useCallback((emotion: string, value: number) => {
    setIntensities((prev) => {
      const next = { ...prev };
      if (next[emotion] === value) {
        delete next[emotion];
      } else {
        next[emotion] = value;
      }
      return next;
    });
  }, []);

  const save = useCallback(async () => {
    const initData = window.Telegram?.WebApp?.initData;
    if (!initData || loadState.status !== 'ok' || saveState === 'loading') return;

    const { date, day_type } = loadState.data;

    const emotionsPayload = Object.entries(intensities).map(([name, intensity]) => ({ name, intensity }));
    const answersPayload = Object.entries(answers)
      .filter(([, value]) => value.trim().length > 0)
      .map(([prompt_id, text]) => ({ prompt_id, text: text.trim() }));

    setSaveState('loading');

    try {
      const res = await fetch(`${SERVER_URL}/api/state`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          initData,
          action: 'save_journal',
          entry_date: date,
          day_type,
          emotions: emotionsPayload,
          answers: answersPayload,
        }),
      });

      const body = await res.json() as { ok: boolean; data?: { entry: Entry }; error?: string };

      if (!body.ok || !body.data) {
        setSaveState('error');
        return;
      }

      const savedEntry = body.data.entry;
      setLoadState((prev) => (prev.status === 'ok' ? { ...prev, data: { ...prev.data, entry: savedEntry } } : prev));
      setSaveState('idle');
    } catch {
      setSaveState('error');
    }
  }, [loadState, intensities, answers, saveState]);

  // ---------- Render: loading ----------
  if (loadState.status === 'loading') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground text-sm">Загрузка ежедневника...</p>
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
  const todayLabel = new Date(data.date).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const canSave =
    Object.keys(intensities).length > 0 || Object.values(answers).some((v) => v.trim().length > 0);

  return (
    <div className="min-h-screen bg-background pb-8">

      {/* Header */}
      <div className="bg-kamp-primary px-4 pt-8 pb-6 flex flex-col items-center gap-1">
        <h1 className="text-white text-xl font-bold">Ежедневник</h1>
        <p className="text-white/70 text-sm capitalize">{todayLabel}</p>
      </div>

      <div className="px-4 pt-4 space-y-4">
        {data.entry ? (
          // ---------- Режим просмотра: запись за сегодня уже есть ----------
          <>
            <Card>
              <CardContent className="py-4 px-4 space-y-3">
                <p className="text-sm font-semibold">Эмоции дня</p>
                {data.entry.emotions.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Эмоции не отмечены</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {data.entry.emotions.map((e) => (
                      <Badge key={e.emotion_name} variant="outline">
                        {e.emotion_name} · {e.intensity}
                      </Badge>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {data.prompts.map((prompt) => {
              const answer = data.entry!.answers.find((a) => a.prompt_id === prompt.id);
              return (
                <Card key={prompt.id}>
                  <CardContent className="py-4 px-4 space-y-1.5">
                    <p className="text-sm font-semibold">{prompt.question_text}</p>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {answer?.answer_text?.trim() ? answer.answer_text : '—'}
                    </p>
                  </CardContent>
                </Card>
              );
            })}

            <p className="text-xs text-muted-foreground text-center pt-1">
              Запись за сегодня уже сохранена
            </p>
          </>
        ) : (
          // ---------- Форма заполнения ----------
          <>
            <Card>
              <CardContent className="py-4 px-4 space-y-4">
                <p className="text-sm font-semibold">Эмоции дня</p>
                <div className="space-y-3">
                  {EMOTIONS.map((emotion) => (
                    <div key={emotion} className="space-y-1.5">
                      <p className="text-sm">{emotion}</p>
                      <div className="flex gap-1.5">
                        {[1, 2, 3, 4, 5].map((level) => (
                          <button
                            key={level}
                            type="button"
                            disabled={saveState === 'loading'}
                            onClick={() => toggleIntensity(emotion, level)}
                            className={cn(
                              'w-8 h-8 rounded-full text-xs font-semibold border transition-colors shrink-0',
                              intensities[emotion] === level
                                ? 'bg-kamp-primary text-white border-kamp-primary'
                                : 'bg-muted/40 text-muted-foreground border-border'
                            )}
                          >
                            {level}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {data.prompts.map((prompt) => (
              <Card key={prompt.id}>
                <CardContent className="py-4 px-4 space-y-2">
                  <p className="text-sm font-semibold">{prompt.question_text}</p>
                  <Textarea
                    value={answers[prompt.id] ?? ''}
                    onChange={(e) => setAnswers((prev) => ({ ...prev, [prompt.id]: e.target.value }))}
                    placeholder="Твой ответ..."
                    rows={3}
                    disabled={saveState === 'loading'}
                  />
                </CardContent>
              </Card>
            ))}

            <Button
              className="w-full bg-kamp-primary hover:bg-kamp-primary/90 text-white"
              disabled={!canSave || saveState === 'loading'}
              onClick={() => void save()}
            >
              {saveState === 'loading' ? 'Сохраняем...' : saveState === 'error' ? 'Ошибка — повторить' : 'Сохранить запись'}
            </Button>
          </>
        )}
      </div>

    </div>
  );
};
