import React, { useCallback, useEffect, useState } from 'react';
import { CheckCircle, ClipboardList, Clock, FileText, RotateCcw, Send } from 'lucide-react';
import { useAppApi } from '@/components/app-shared/apiAdapter';
import { proxyStorageUrl } from '@/lib/storageUrl';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';

type SubmissionStatus = 'submitted' | 'accepted' | 'rework';
interface HomeworkItem {
  id: string;
  title: string;
  theme: string | null;
  content: string;
  deadline: string | null;
  points_reward: number;
  file_url: string | null;
  status: SubmissionStatus | null;
  submission_content: string | null;
  admin_comment: string | null;
}

const StatusBadge: React.FC<{ status: SubmissionStatus | null }> = ({ status }) => {
  if (status === 'accepted') return <Badge variant="secondary"><CheckCircle className="mr-1 h-3 w-3" />Принято</Badge>;
  if (status === 'submitted') return <Badge variant="outline"><Clock className="mr-1 h-3 w-3" />На проверке</Badge>;
  if (status === 'rework') return <Badge variant="destructive"><RotateCcw className="mr-1 h-3 w-3" />На доработку</Badge>;
  return null;
};

export const WebHomeworkView: React.FC = () => {
  const { callApi } = useAppApi();
  const [items, setItems] = useState<HomeworkItem[] | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const response = await callApi<{ found: boolean; homework: HomeworkItem[]; error?: string }>('get_homework');
      if (!response.found) throw new Error(response.error ?? 'Домашние задания недоступны');
      setItems(response.homework ?? []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Не удалось загрузить задания');
    }
  }, [callApi]);

  useEffect(() => { void load(); }, [load]);

  const open = (item: HomeworkItem) => {
    setOpenId(item.id);
    setText(item.status === 'rework' ? item.submission_content ?? '' : '');
    setError(null);
  };

  const submit = async (item: HomeworkItem) => {
    if (!text.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const response = await callApi<{ ok: boolean; status?: SubmissionStatus; error?: string }>('submit_homework', {
        assignment_id: item.id,
        content: text.trim(),
        file_url: null,
      });
      if (!response.ok) throw new Error(response.error ?? 'Ответ не отправлен');
      setOpenId(null);
      setText('');
      await load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Ответ не отправлен');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="bg-kamp-primary px-4 pb-6 pt-8 text-center text-primary-foreground">
        <ClipboardList className="mx-auto mb-2 h-6 w-6" />
        <h1 className="text-xl font-bold text-primary-foreground">Домашние задания</h1>
        <p className="text-sm text-primary-foreground/75">Выполняй и получай баллы</p>
      </header>
      <div className="space-y-3 px-4 pt-4">
        {error && <p className="text-center text-sm text-destructive">{error}</p>}
        {!items && !error && <p className="pt-10 text-center text-sm text-muted-foreground">Загрузка заданий...</p>}
        {items?.length === 0 && <p className="pt-10 text-center text-sm text-muted-foreground">Пока нет назначенных заданий</p>}
        {items?.map((item) => {
          const canSubmit = !item.status || item.status === 'rework';
          const isOpen = openId === item.id;
          return (
            <Card key={item.id}>
              <CardContent className="space-y-3 px-4 py-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <h2 className="text-base font-semibold text-foreground">{item.title}</h2>
                    {item.deadline && <p className="text-xs text-muted-foreground">Срок: {new Date(item.deadline).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}</p>}
                  </div>
                  <div className="flex flex-wrap gap-1.5"><Badge variant="outline">{item.points_reward} баллов</Badge><StatusBadge status={item.status} /></div>
                </div>
                {item.theme && <p className="text-xs font-medium text-muted-foreground">{item.theme}</p>}
                <p className="whitespace-pre-wrap text-sm">{item.content}</p>
                {item.file_url && <Button variant="outline" size="sm" asChild><a href={proxyStorageUrl(item.file_url)} target="_blank" rel="noreferrer"><FileText className="mr-1.5 h-4 w-4" />Открыть файл</a></Button>}
                {item.admin_comment && <div className="rounded-md bg-muted px-3 py-2 text-sm"><strong>Комментарий:</strong> {item.admin_comment}</div>}
                {item.submission_content && item.status !== 'rework' && <div className="rounded-md bg-muted/60 px-3 py-2 text-sm"><strong>Твой ответ:</strong><p className="mt-1 whitespace-pre-wrap">{item.submission_content}</p></div>}
                {canSubmit && !isOpen && <Button className="w-full" onClick={() => open(item)}>{item.status === 'rework' ? 'Исправить ответ' : 'Ответить'}</Button>}
                {canSubmit && isOpen && (
                  <div className="space-y-2">
                    <Textarea value={text} onChange={(event) => setText(event.target.value)} rows={5} placeholder="Напиши ответ или добавь ссылку" disabled={busy} />
                    <div className="grid grid-cols-2 gap-2">
                      <Button variant="outline" onClick={() => setOpenId(null)} disabled={busy}>Отмена</Button>
                      <Button onClick={() => void submit(item)} disabled={!text.trim() || busy}><Send className="mr-1.5 h-4 w-4" />{busy ? 'Отправляем...' : 'Отправить'}</Button>
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