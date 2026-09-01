import React, { useEffect, useState, useCallback } from 'react';
import { Clock, CheckCircle, RotateCcw, Send, ClipboardList, Paperclip, X, AlertTriangle, FileText, Pencil } from 'lucide-react';
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
  submission_id: string | null;
  submission_content: string | null;
  submission_file_url?: string | null;
  submission_file_urls?: unknown;
  admin_comment: string | null;
}

/** Ссылки на файлы ответа: новое поле submission_file_urls (массив) + legacy submission_file_url. */
const submissionFiles = (item: HomeworkItem): string[] => {
  const arr = Array.isArray(item.submission_file_urls)
    ? item.submission_file_urls.filter((u): u is string => typeof u === 'string' && u.length > 0)
    : [];
  if (arr.length === 0 && item.submission_file_url) return [item.submission_file_url];
  return arr;
};

const fileToBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',')[1] ?? '');
    reader.onerror = () => reject(new Error('file_read_error'));
    reader.readAsDataURL(file);
  });

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
  const [file, setFile] = useState<File | null>(null);

  // Редактирование уже отправленного ответа (до проверки тренером)
  const [editSubmissionId, setEditSubmissionId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [editKeptFiles, setEditKeptFiles] = useState<string[]>([]);
  const [editNewFile, setEditNewFile] = useState<File | null>(null);
  const [editState, setEditState] = useState<SubmitState>('idle');

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
    setFile(null);
    setSubmitState('idle');
  }, []);

  const submit = useCallback(async (assignmentId: string) => {
    const initData = window.Telegram?.WebApp?.initData;
    if (!initData || (!text.trim() && !file) || submitState === 'loading') return;

    setSubmitState('loading');

    try {
      // 1. Если прикреплён файл — сначала загружаем его через сервер
      let fileUrl: string | null = null;
      if (file) {
        const base64 = await fileToBase64(file);

        const uploadRes = await fetch(`${SERVER_URL}/api/state`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            initData,
            action: 'upload_homework_file',
            file_name: file.name,
            file_base64: base64,
          }),
        });

        const uploadBody = await uploadRes.json() as { ok: boolean; data?: { file_url: string } };
        if (!uploadBody.ok || !uploadBody.data) {
          setSubmitState('error');
          return;
        }
        fileUrl = uploadBody.data.file_url;
      }

      // 2. Отправляем ответ
      const res = await fetch(`${SERVER_URL}/api/state`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          initData,
          action: 'submit_homework',
          assignment_id: assignmentId,
          content: text.trim(),
          file_url: fileUrl,
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
              ? {
                  ...item,
                  status: body.data!.status,
                  submission_content: submittedText || null,
                  submission_file_url: fileUrl,
                  submission_file_urls: fileUrl ? [fileUrl] : [],
                  admin_comment: null,
                }
              : item
          ),
        };
      });
      setOpenId(null);
      setText('');
      setFile(null);
      setSubmitState('idle');
    } catch {
      setSubmitState('error');
    }
  }, [text, file, submitState]);

  const openEdit = useCallback((item: HomeworkItem) => {
    setEditSubmissionId(item.submission_id);
    setEditText(item.submission_content ?? '');
    setEditKeptFiles(submissionFiles(item));
    setEditNewFile(null);
    setEditState('idle');
  }, []);

  const closeEdit = useCallback(() => {
    setEditSubmissionId(null);
    setEditText('');
    setEditKeptFiles([]);
    setEditNewFile(null);
    setEditState('idle');
  }, []);

  const saveEdit = useCallback(async (item: HomeworkItem) => {
    const initData = window.Telegram?.WebApp?.initData;
    if (!initData || !item.submission_id || editState === 'loading') return;
    if (!editText.trim() && editKeptFiles.length === 0 && !editNewFile) return;

    setEditState('loading');

    try {
      const fileUrls = [...editKeptFiles];

      if (editNewFile) {
        const base64 = await fileToBase64(editNewFile);
        const uploadRes = await fetch(`${SERVER_URL}/api/state`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            initData,
            action: 'upload_homework_file',
            file_name: editNewFile.name,
            file_base64: base64,
          }),
        });
        const uploadBody = await uploadRes.json() as { ok: boolean; data?: { file_url: string } };
        if (!uploadBody.ok || !uploadBody.data) {
          setEditState('error');
          return;
        }
        fileUrls.push(uploadBody.data.file_url);
      }

      const res = await fetch(`${SERVER_URL}/api/state`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          initData,
          action: 'update_homework_submission',
          submission_id: item.submission_id,
          content: editText.trim(),
          file_urls: fileUrls,
        }),
      });

      const body = await res.json() as { ok: boolean; error?: string };
      if (!body.ok) {
        setEditState('error');
        return;
      }

      const newText = editText.trim();
      setLoadState((prev) => {
        if (prev.status !== 'ok') return prev;
        return {
          ...prev,
          data: prev.data.map((it) =>
            it.id === item.id
              ? {
                  ...it,
                  submission_content: newText || null,
                  submission_file_urls: fileUrls,
                  submission_file_url: fileUrls[0] ?? null,
                }
              : it
          ),
        };
      });
      closeEdit();
    } catch {
      setEditState('error');
    }
  }, [editText, editKeptFiles, editNewFile, editState, closeEdit]);

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

  const formatDeadline = (deadline: string) =>
    `Срок: ${new Date(deadline).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}`;

  const deadlineBadge = (item: HomeworkItem) => {
    if (!item.deadline || item.status === 'accepted') return null;
    const diffMs = new Date(item.deadline).getTime() - Date.now();
    if (diffMs < 0) {
      return (
        <Badge variant="outline" className="bg-red-500/20 text-red-700 dark:text-red-300 border-red-500/40">
          <AlertTriangle className="w-3 h-3 mr-1" />Просрочено
        </Badge>
      );
    }
    if (diffMs < 2 * 24 * 60 * 60 * 1000) {
      return (
        <Badge variant="outline" className="bg-yellow-500/20 text-yellow-700 dark:text-yellow-300 border-yellow-500/40">
          <Clock className="w-3 h-3 mr-1" />Скоро дедлайн
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
          // Редактировать можно только ответ, который ещё на проверке ('submitted').
          // После проверки ('accepted' / 'rework') кнопки нет.
          const canEdit = item.status === 'submitted' && !!item.submission_id;
          const isEditing = canEdit && editSubmissionId === item.submission_id;
          const files = submissionFiles(item);

          return (
            <Card key={item.id}>
              <CardContent className="py-4 px-4 space-y-2">
                <div className="flex items-start justify-between gap-2 flex-wrap">
                  <div>
                    <h3 className="text-sm font-semibold">{item.title}</h3>
                    {item.deadline && (
                      <p className="text-xs text-muted-foreground mt-0.5">{formatDeadline(item.deadline)}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <Badge variant="outline">{item.points_reward} баллов</Badge>
                    {statusBadge(item.status)}
                    {deadlineBadge(item)}
                  </div>
                </div>

                {item.theme && <p className="text-xs text-muted-foreground">{item.theme}</p>}
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{item.content}</p>

                {item.file_signed_url && (
                  <div>
                    {/\.(png|jpe?g|gif|webp|bmp|heic)$/i.test(item.file_url ?? '') ? (
                      <a href={item.file_signed_url} target="_blank" rel="noopener noreferrer">
                        <img src={item.file_signed_url} alt="Файл задания" className="max-h-48 rounded border object-cover" />
                      </a>
                    ) : (
                      <Button variant="outline" size="sm" className="w-fit" asChild>
                        <a href={item.file_signed_url} target="_blank" rel="noopener noreferrer">
                          <FileText className="w-3.5 h-3.5 mr-1" /> Открыть файл задания
                        </a>
                      </Button>
                    )}
                  </div>
                )}

                {item.admin_comment && (
                  <div className="p-2 bg-muted/50 rounded text-sm">
                    <strong>Комментарий:</strong> {item.admin_comment}
                  </div>
                )}

                {(item.submission_content || files.length > 0) && item.status !== 'rework' && !isEditing && (
                  <div className="p-2 bg-muted/30 rounded text-sm">
                    <strong>Твой ответ:</strong>
                    {item.submission_content && (
                      <p className="whitespace-pre-wrap mt-1">{item.submission_content}</p>
                    )}
                    {files.map((url, i) => (
                      <a
                        key={url}
                        href={url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-kamp-primary underline flex items-center gap-1 w-fit mt-1"
                      >
                        <Paperclip className="w-3.5 h-3.5" /> Прикреплённый файл{files.length > 1 ? ` ${i + 1}` : ''}
                      </a>
                    ))}
                  </div>
                )}

                {canEdit && !isEditing && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full"
                    onClick={() => openEdit(item)}
                  >
                    <Pencil className="w-3.5 h-3.5 mr-1" /> Редактировать
                  </Button>
                )}

                {isEditing && (
                  <div className="space-y-2 pt-1">
                    <p className="text-xs text-muted-foreground">Ответ можно изменить, пока тренер его не проверил</p>
                    <Textarea
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      placeholder="Опиши выполнение, добавь ссылки..."
                      rows={4}
                      disabled={editState === 'loading'}
                    />

                    {editKeptFiles.map((url, i) => (
                      <div key={url} className="flex items-center justify-between text-xs bg-muted/40 rounded px-2 py-1.5">
                        <a
                          href={url}
                          target="_blank"
                          rel="noreferrer"
                          className="truncate flex items-center gap-1 text-kamp-primary underline"
                        >
                          <Paperclip className="w-3 h-3 shrink-0" /> Файл {i + 1}
                        </a>
                        <button
                          type="button"
                          onClick={() => setEditKeptFiles((prev) => prev.filter((u) => u !== url))}
                          disabled={editState === 'loading'}
                          aria-label="Убрать файл"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}

                    {editNewFile ? (
                      <div className="flex items-center justify-between text-xs bg-muted/40 rounded px-2 py-1.5">
                        <span className="truncate flex items-center gap-1">
                          <Paperclip className="w-3 h-3 shrink-0" />{editNewFile.name}
                        </span>
                        <button
                          type="button"
                          onClick={() => setEditNewFile(null)}
                          disabled={editState === 'loading'}
                          aria-label="Убрать файл"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <label className="flex items-center gap-1 text-xs text-muted-foreground cursor-pointer w-fit">
                        <Paperclip className="w-3 h-3" /> Прикрепить файл (до 10 МБ)
                        <input
                          type="file"
                          className="hidden"
                          disabled={editState === 'loading'}
                          onChange={(e) => {
                            const f = e.target.files?.[0] ?? null;
                            if (f && f.size > 10 * 1024 * 1024) {
                              e.target.value = '';
                              return;
                            }
                            setEditNewFile(f);
                          }}
                        />
                      </label>
                    )}

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        disabled={editState === 'loading'}
                        onClick={closeEdit}
                      >
                        Отмена
                      </Button>
                      <Button
                        size="sm"
                        className="flex-1 bg-kamp-primary hover:bg-kamp-primary/90 text-white"
                        disabled={(!editText.trim() && editKeptFiles.length === 0 && !editNewFile) || editState === 'loading'}
                        onClick={() => void saveEdit(item)}
                      >
                        {editState === 'loading' ? 'Сохраняем...' : editState === 'error' ? 'Ошибка — повторить' : 'Сохранить'}
                      </Button>
                    </div>
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

                    {file ? (
                      <div className="flex items-center justify-between text-xs bg-muted/40 rounded px-2 py-1.5">
                        <span className="truncate flex items-center gap-1">
                          <Paperclip className="w-3 h-3 shrink-0" />{file.name}
                        </span>
                        <button
                          type="button"
                          onClick={() => setFile(null)}
                          disabled={submitState === 'loading'}
                          aria-label="Убрать файл"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <label className="flex items-center gap-1 text-xs text-muted-foreground cursor-pointer w-fit">
                        <Paperclip className="w-3 h-3" /> Прикрепить файл (до 10 МБ)
                        <input
                          type="file"
                          className="hidden"
                          disabled={submitState === 'loading'}
                          onChange={(e) => {
                            const f = e.target.files?.[0] ?? null;
                            if (f && f.size > 10 * 1024 * 1024) {
                              e.target.value = '';
                              return;
                            }
                            setFile(f);
                          }}
                        />
                      </label>
                    )}

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        disabled={submitState === 'loading'}
                        onClick={() => { setOpenId(null); setText(''); setFile(null); setSubmitState('idle'); }}
                      >
                        Отмена
                      </Button>
                      <Button
                        size="sm"
                        className="flex-1 bg-kamp-primary hover:bg-kamp-primary/90 text-white"
                        disabled={(!text.trim() && !file) || submitState === 'loading'}
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
