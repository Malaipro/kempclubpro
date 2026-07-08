import React, { useEffect, useState, useCallback } from 'react';
import { Clock, CheckCircle, RotateCcw, Send, ClipboardList, FileText } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

const SERVER_URL = import.meta.env.VITE_TELEGRAM_SERVER_URL ?? 'https://tg.kempclub.pro';

// ---------- Types ----------

type SubmissionStatus = 'submitted' | 'accepted' | 'rework';

interface HomeworkItem {
  id: string;
  title: string;
  theme: string | null;
  content: string;
  deadline: string | null;
  points_reward: number;
  file_url: string | null;
  file_signed_url?: string | null;
  status: SubmissionStatus | null;
  submission_content: string | null;
  admin_comment: string | null;
}

type LoadState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ok'; data: HomeworkItem[] };

type SubmitState = 'idle' | 'loading' | 'error';

interface Props {
  onBack: () => void;
}

// ---------- View ----------

export const TelegramHomeworkView: React.FC<Props> = ({ onBack }) => {
  const [loadState, setLoadState] = useState<LoadState>({ status: 'loading' });
  const [openId, setOpenId] = useState<string | null>(null);
  const [text, setText] = useState('');
  const [submitState, setSubmitState] = useState<SubmitState>('idle');

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

  // Загрузка списка ДЗ
  useEffect(() => {
    const initData = window.Telegram?.WebApp?.initData;
    if (!initData) {
      setLoadState({ status: 'error', message: 'Нет доступа к Telegram WebApp' });
      return;
    }

    fetch(`${SERVER_URL}/api/state`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ initData, action: 'get_homework' }),
    })
      .then(async (res) => {
        const body = await res.json() as {
          ok: boolean;
          data?: { homework: HomeworkItem[] };
          error?: string;
        };
        if (!body.ok || !body.data) throw new Error(body.error ?? 'rpc_error');
        return body.data.homework;
      })
      .then((homework) => setLoadState({ status: 'ok', data: homework }))
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : 'Ошибка загрузки';
        setLoadState({ status: 'error', message: msg });
      });
  }, []);

  const openSubmit = useCallback((item: HomeworkItem) => {
    setOpenId(item.id);
    setText(item.status === 'rework' ? item.submission_content ?? '' : '');
    setSubmitState('idle');
  }, []);

  const submit = useCallback(async (assignmentId: string) => {
    const initData = window.Telegram?.WebApp?.initData;
    if (!initData || !text.trim() || submitState === 'loading') return;

    setSubmitState('loading');

    try {
      const res = await fetch(`${SERVER_URL}/api/state`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          initData,
          action: 'submit_homework',
          assignment_id: assignmentId,
          content: text.trim(),
        }),
      });

      const body = await res.json() as { ok: boolean; data?: { status: SubmissionStatus }; error?: string };

      if (!body.ok || !body.data) {
        setSubmitState('error');
        return;
      }

      const submittedText = text.trim();
      setLoadState((prev) => {
        if (prev.status !== 'ok') return prev;
        return {
          ...prev,
          data: prev.data.map((item) =>
            item.id === assignmentId
              ? { ...item, status: body.data!.status, submission_content: submittedText, admin_comment: null }
              : item
          ),
        };
      });
      setOpenId(null);
      setText('');
      setSubmitState('idle');
    } catch {
      setSubmitState('error');
    }
  }, [text, submitState]);

  // ---------- Render: loading ----------
  if (loadState.status === 'loading') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground text-sm">Загрузка домашних заданий...</p>
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

  const statusBadge = (status: SubmissionStatus | null) => {
    if (status === 'submitted') {
      return (
        <Badge variant="outline" className="bg-yellow-500/20 text-yellow-700 dark:text-yellow-300 border-yellow-500/40">
          <Clock className="w-3 h-3 mr-1" />На проверке
        </Badge>
      );
    }
    if (status === 'accepted') {
      return (
        <Badge variant="outline" className="bg-green-500/20 text-green-700 dark:text-green-300 border-green-500/40">
          <CheckCircle className="w-3 h-3 mr-1" />Принято ✓
        </Badge>
      );
    }
    if (status === 'rework') {
      return (
        <Badge variant="outline" className="bg-red-500/20 text-red-700 dark:text-red-300 border-red-500/40">
          <RotateCcw className="w-3 h-3 mr-1" />На доработку
        </Badge>
      );
    }
    return null;
  };

  return (
    <div className="min-h-screen bg-background pb-8">

      {/* Header */}
      <div className="bg-kamp-primary px-4 pt-8 pb-6 flex flex-col items-center gap-1">
        <h1 className="text-white text-xl font-bold">Домашние задания</h1>
        <p className="text-white/70 text-sm">Выполняй и получай баллы</p>
      </div>

      <div className="px-4 pt-4 space-y-3">
        {data.length === 0 && (
          <Card>
            <CardContent className="py-8 px-4 text-center">
              <ClipboardList className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Пока нет назначенных заданий</p>
            </CardContent>
          </Card>
        )}

        {data.map((item) => {
          const canSubmit = !item.status || item.status === 'rework';
          const isOpen = openId === item.id;

          return (
            <Card key={item.id}>
              <CardContent className="py-4 px-4 space-y-2">
                <div className="flex items-start justify-between gap-2 flex-wrap">
                  <h3 className="text-sm font-semibold">{item.title}</h3>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <Badge variant="outline">{item.points_reward} баллов</Badge>
                    {statusBadge(item.status)}
                  </div>
                </div>

                {item.theme && <p className="text-xs text-muted-foreground">{item.theme}</p>}
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{item.content}</p>

                {item.deadline && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="w-3 h-3" /> До {new Date(item.deadline).toLocaleString('ru-RU')}
                  </p>
                )}

                {item.file_signed_url && (
                  <div>
                    {/\.(png|jpe?g|gif|webp|bmp|heic)$/i.test(item.file_url ?? '') ? (
                      <a href={item.file_signed_url} target="_blank" rel="noopener noreferrer">
                        <img src={item.file_signed_url} alt="Файл задания" className="max-h-48 rounded border object-cover" />
                      </a>
                    ) : (
                      <a
                        href={item.file_signed_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-sm text-kamp-primary underline"
                      >
                        <FileText className="w-4 h-4" /> Открыть файл задания
                      </a>
                    )}
                  </div>
                )}



                {item.admin_comment && (
                  <div className="p-2 bg-muted/50 rounded text-sm">
                    <strong>Комментарий:</strong> {item.admin_comment}
                  </div>
                )}

                {item.submission_content && item.status !== 'rework' && (
                  <div className="p-2 bg-muted/30 rounded text-sm">
                    <strong>Твой ответ:</strong>
                    <p className="whitespace-pre-wrap mt-1">{item.submission_content}</p>
                  </div>
                )}

                {canSubmit && !isOpen && (
                  <Button
                    size="sm"
                    className="w-full bg-kamp-primary hover:bg-kamp-primary/90 text-white"
                    onClick={() => openSubmit(item)}
                  >
                    <Send className="w-4 h-4 mr-1" />
                    {item.status === 'rework' ? 'Отправить заново' : 'Отправить'}
                  </Button>
                )}

                {canSubmit && isOpen && (
                  <div className="space-y-2 pt-1">
                    <Textarea
                      value={text}
                      onChange={(e) => setText(e.target.value)}
                      placeholder="Опиши выполнение, добавь ссылки..."
                      rows={4}
                      disabled={submitState === 'loading'}
                    />
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        disabled={submitState === 'loading'}
                        onClick={() => { setOpenId(null); setText(''); setSubmitState('idle'); }}
                      >
                        Отмена
                      </Button>
                      <Button
                        size="sm"
                        className="flex-1 bg-kamp-primary hover:bg-kamp-primary/90 text-white"
                        disabled={!text.trim() || submitState === 'loading'}
                        onClick={() => void submit(item.id)}
                      >
                        {submitState === 'loading' ? 'Отправляем...' : submitState === 'error' ? 'Ошибка — повторить' : 'Подтвердить'}
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

    </div>
  );
};
