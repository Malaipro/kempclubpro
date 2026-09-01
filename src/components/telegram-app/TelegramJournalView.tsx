import React, { useEffect, useState, useCallback } from 'react';
import { Pencil } from 'lucide-react';
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

interface DailyPrompt {
  id: string;
  question_text: string;
  activity_type: string | null;
  sort_order: number;
}

const ACTIVITY_LABELS: Record<string, string> = {
  bjj: 'BJJ',
  kickboxing: 'Кикбоксинг',
  ofp: 'ОФП',
  nutrition: 'Питание',
  kamp_pyramid: 'Пирамида',
};

interface EntryEmotion {
  emotion_name: string;
  intensity: number;
}

interface EntryAnswer {
  id: string;
  prompt_id: string;
  answer_text: string | null;
}

interface Entry {
  id: string;
  entry_date: string;
  day_type: string;
  // Колонка появилась в миграции 20260901120000. Пока её нет — поле undefined,
  // запись считается редактируемой.
  is_reviewed?: boolean;
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
  const [dailyPrompts, setDailyPrompts] = useState<DailyPrompt[]>([]);
  const [intensities, setIntensities] = useState<Record<string, number>>({});
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [saveState, setSaveState] = useState<SaveState>('idle');

  // Редактирование уже сохранённой записи (до проверки тренером)
  const [editing, setEditing] = useState(false);
  const [editAnswers, setEditAnswers] = useState<Record<string, string>>({});
  const [editState, setEditState] = useState<SaveState>('idle');

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

  // Динамические вопросы рефлексии по дню недели — подсказки поверх формы
  useEffect(() => {
    const initData = window.Telegram?.WebApp?.initData;
    if (!initData) return;

    fetch(`${SERVER_URL}/api/state`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ initData, action: 'get_daily_prompts' }),
    })
      .then(async (res) => {
        const body = await res.json() as { ok: boolean; data?: { prompts: DailyPrompt[]; day_of_week: number }; error?: string };
        if (!body.ok || !body.data) throw new Error(body.error ?? 'rpc_error');
        return body.data.prompts ?? [];
      })
      .then((prompts) => {
        const sorted = [...prompts].sort((a, b) => a.sort_order - b.sort_order);
        setDailyPrompts(sorted);
      })
      .catch(() => {
        // Подсказки необязательны — молча пропускаем при ошибке
        setDailyPrompts([]);
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

  const startEdit = useCallback(() => {
    if (loadState.status !== 'ok' || !loadState.data.entry) return;
    const seed: Record<string, string> = {};
    for (const a of loadState.data.entry.answers) {
      seed[a.id] = a.answer_text ?? '';
    }
    setEditAnswers(seed);
    setEditState('idle');
    setEditing(true);
  }, [loadState]);

  const cancelEdit = useCallback(() => {
    setEditing(false);
    setEditAnswers({});
    setEditState('idle');
  }, []);

  const saveEdit = useCallback(async () => {
    const initData = window.Telegram?.WebApp?.initData;
    if (!initData || loadState.status !== 'ok' || !loadState.data.entry || editState === 'loading') return;

    const entry = loadState.data.entry;
    const answersPayload = entry.answers
      .filter((a) => a.id && editAnswers[a.id] !== undefined)
      .map((a) => ({ id: a.id, text: editAnswers[a.id].trim() }));

    if (answersPayload.length === 0) {
      setEditing(false);
      return;
    }

    setEditState('loading');

    try {
      const res = await fetch(`${SERVER_URL}/api/state`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          initData,
          action: 'update_journal_entry',
          entry_id: entry.id,
          answers: answersPayload,
        }),
      });

      const body = await res.json() as { ok: boolean; error?: string };
      if (!body.ok) {
        setEditState('error');
        return;
      }

      const textById = new Map(answersPayload.map((a) => [a.id, a.text]));
      setLoadState((prev) => {
        if (prev.status !== 'ok' || !prev.data.entry) return prev;
        return {
          ...prev,
          data: {
            ...prev.data,
            entry: {
              ...prev.data.entry,
              answers: prev.data.entry.answers.map((a) =>
                textById.has(a.id) ? { ...a, answer_text: textById.get(a.id) ?? '' } : a
              ),
            },
          },
        };
      });
      setEditing(false);
      setEditAnswers({});
      setEditState('idle');
    } catch {
      setEditState('error');
    }
  }, [loadState, editAnswers, editState]);

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

  // Запись редактируема, пока тренер её не проверил (is_reviewed отсутствует → считаем редактируемой)
  const entryEditable = !!data.entry && !data.entry.is_reviewed;
  const questionTextFor = (promptId: string) =>
    data.prompts.find((p) => p.id === promptId)?.question_text ?? 'Вопрос дня';

  return (
    <div className="min-h-screen bg-background pb-8">

      {/* Header */}
      <div className="bg-kamp-primary px-4 pt-8 pb-6 flex flex-col items-center gap-1">
        <h1 className="text-white text-xl font-bold">Ежедневник</h1>
        <p className="text-white/70 text-sm capitalize">{todayLabel}</p>
      </div>

      <div className="px-4 pt-4 space-y-4">
        {dailyPrompts.length > 0 && (
          <Card>
            <CardContent className="py-4 px-4 space-y-3">
              <p className="text-sm font-semibold">Рефлексия дня</p>
              <ul className="space-y-2.5">
                {dailyPrompts.map((prompt) => {
                  const activityLabel = prompt.activity_type
                    ? ACTIVITY_LABELS[prompt.activity_type] ?? prompt.activity_type
                    : null;
                  return (
                    <li key={prompt.id} className="space-y-1">
                      {activityLabel && (
                        <Badge variant="outline" className="text-[11px]">{activityLabel}</Badge>
                      )}
                      <p className="text-sm text-muted-foreground">{prompt.question_text}</p>
                    </li>
                  );
                })}
              </ul>
            </CardContent>
          </Card>
        )}

        {data.entry ? (
          // ---------- Режим просмотра / редактирования: запись уже есть ----------
          <>
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-semibold capitalize">{todayLabel}</p>
              {entryEditable && !editing && (
                <Button size="sm" variant="outline" onClick={startEdit}>
                  <Pencil className="w-3.5 h-3.5 mr-1" /> Редактировать
                </Button>
              )}
            </div>

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

            {editing ? (
              <>
                {data.entry.answers.map((answer) => (
                  <Card key={answer.id}>
                    <CardContent className="py-4 px-4 space-y-2">
                      <p className="text-sm font-semibold">{questionTextFor(answer.prompt_id)}</p>
                      <Textarea
                        value={editAnswers[answer.id] ?? ''}
                        onChange={(e) => setEditAnswers((prev) => ({ ...prev, [answer.id]: e.target.value }))}
                        placeholder="Твой ответ..."
                        rows={3}
                        disabled={editState === 'loading'}
                      />
                    </CardContent>
                  </Card>
                ))}

                {data.entry.answers.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center">
                    В этой записи нет ответов для редактирования
                  </p>
                )}

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    disabled={editState === 'loading'}
                    onClick={cancelEdit}
                  >
                    Отмена
                  </Button>
                  <Button
                    size="sm"
                    className="flex-1 bg-kamp-primary hover:bg-kamp-primary/90 text-white"
                    disabled={editState === 'loading' || data.entry.answers.length === 0}
                    onClick={() => void saveEdit()}
                  >
                    {editState === 'loading' ? 'Сохраняем...' : editState === 'error' ? 'Ошибка — повторить' : 'Сохранить'}
                  </Button>
                </div>
              </>
            ) : (
              <>
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
                  {entryEditable
                    ? 'Запись сохранена — можно редактировать до проверки тренером'
                    : 'Запись проверена тренером'}
                </p>
              </>
            )}
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
