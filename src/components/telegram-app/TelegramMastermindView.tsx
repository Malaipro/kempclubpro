import React, { useEffect, useState, useCallback } from 'react';
import { Users, Clock, Send, ListChecks, FileText } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';

const SERVER_URL = (import.meta as any).env?.VITE_TELEGRAM_SERVER_URL ?? 'https://tg.kempclub.pro';

interface MastermindMember {
  id: string;
  request: string | null;
  plan: string | null;
  start_date: string | null;
  end_date: string | null;
}

interface MastermindTask {
  id: string;
  title: string;
  description: string | null;
  is_completed: boolean;
  completed_at: string | null;
  participant_comment: string | null;
  sort_order: number;
}

interface MastermindEntry {
  id: string;
  entry_date: string;
  summary: string;
  my_tasks: string | null;
  status: string;
  admin_comment: string | null;
  created_at: string;
}

type MastermindData =
  | { is_member: false }
  | { is_member: true; member: MastermindMember; tasks: MastermindTask[]; entries: MastermindEntry[] };

interface Props {
  onBack: () => void;
}

export const TelegramMastermindView: React.FC<Props> = ({ onBack }) => {
  const [data, setData] = useState<MastermindData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Комментарий к отметке задачи выполненной
  const [openTaskId, setOpenTaskId] = useState<string | null>(null);
  const [taskComment, setTaskComment] = useState('');
  const [completingTaskId, setCompletingTaskId] = useState<string | null>(null);

  // Форма нового отчёта
  const [entrySummary, setEntrySummary] = useState('');
  const [entryMyTasks, setEntryMyTasks] = useState('');
  const [submittingEntry, setSubmittingEntry] = useState(false);

  useEffect(() => {
    const btn = (window as any).Telegram?.WebApp?.BackButton;
    if (!btn) return;
    btn.show();
    btn.onClick(onBack);
    return () => { btn.offClick(onBack); btn.hide(); };
  }, [onBack]);

  const fetchData = useCallback(async () => {
    const initData = (window as any).Telegram?.WebApp?.initData;
    if (!initData) { setError('Нет доступа'); setLoading(false); return; }
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`${SERVER_URL}/api/state`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ initData, action: 'get_mastermind' }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || 'Ошибка загрузки');
      setData(json.data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openTaskComment = (taskId: string) => {
    setOpenTaskId(taskId);
    setTaskComment('');
  };

  const cancelTaskComment = () => {
    setOpenTaskId(null);
    setTaskComment('');
  };

  const handleCompleteTask = async (taskId: string) => {
    const initData = (window as any).Telegram?.WebApp?.initData;
    if (!initData) return;
    setCompletingTaskId(taskId);
    try {
      const res = await fetch(`${SERVER_URL}/api/state`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          initData,
          action: 'complete_mastermind_task',
          task_id: taskId,
          task_comment: taskComment.trim() || null,
        }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || 'Ошибка');
      setOpenTaskId(null);
      setTaskComment('');
      await fetchData();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setCompletingTaskId(null);
    }
  };

  const handleSubmitEntry = async () => {
    const initData = (window as any).Telegram?.WebApp?.initData;
    if (!initData || !entrySummary.trim() || submittingEntry) return;
    setSubmittingEntry(true);
    try {
      const res = await fetch(`${SERVER_URL}/api/state`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          initData,
          action: 'submit_mastermind_entry',
          summary: entrySummary.trim(),
          my_tasks: entryMyTasks.trim() || null,
        }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || 'Ошибка');
      setEntrySummary('');
      setEntryMyTasks('');
      await fetchData();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setSubmittingEntry(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center h-64 text-gray-400">Загрузка...</div>;
  if (error) {
    return (
      <div className="p-4 text-center">
        <p className="text-red-400 mb-3">{error}</p>
        <Button onClick={fetchData} variant="outline" size="sm">Повторить</Button>
      </div>
    );
  }

  if (!data || !data.is_member) {
    return (
      <div className="flex flex-col min-h-screen bg-background">
        <div className="bg-kamp-primary text-white px-4 py-3">
          <h1 className="text-lg font-bold flex items-center gap-2"><Users className="w-5 h-5" /> Мастермайнд</h1>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
          <p className="text-base font-medium">Вы не записаны в мастермайнд.</p>
          <p className="text-xs text-muted-foreground mt-2">Запишитесь в Расписании или обратитесь к тренеру.</p>
        </div>
      </div>
    );
  }

  const { member, tasks, entries } = data;

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <div className="bg-kamp-primary text-white px-4 py-3">
        <h1 className="text-lg font-bold flex items-center gap-2"><Users className="w-5 h-5" /> Мастермайнд</h1>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {member.request && (
          <div className="space-y-2">
            <h2 className="text-sm font-semibold flex items-center gap-1.5"><FileText className="w-4 h-4" /> Мой запрос</h2>
            <Card>
              <CardContent className="p-4">
                <p className="text-sm whitespace-pre-wrap">{member.request}</p>
              </CardContent>
            </Card>
          </div>
        )}

        {member.plan && (
          <div className="space-y-2">
            <h2 className="text-sm font-semibold flex items-center gap-1.5"><ListChecks className="w-4 h-4" /> План развития</h2>
            <Card>
              <CardContent className="p-4">
                <p className="text-sm whitespace-pre-wrap">{member.plan}</p>
              </CardContent>
            </Card>
          </div>
        )}

        <div className="space-y-2">
          <h2 className="text-sm font-semibold">Задачи</h2>
          {tasks.length === 0 ? (
            <Card><CardContent className="p-4 text-center text-sm text-muted-foreground">Пока нет задач</CardContent></Card>
          ) : (
            <div className="space-y-2">
              {tasks.map((task) => (
                <Card key={task.id} className={task.is_completed ? 'border-green-500/30 bg-green-500/5' : undefined}>
                  <CardContent className="p-4 space-y-2">
                    <div className="flex items-start gap-3">
                      <Checkbox
                        checked={task.is_completed}
                        disabled={task.is_completed || completingTaskId === task.id}
                        onCheckedChange={() => { if (!task.is_completed) openTaskComment(task.id); }}
                        className="mt-0.5"
                      />
                      <div className="flex-1 space-y-1">
                        <p className={`text-sm font-medium ${task.is_completed ? 'line-through text-muted-foreground' : ''}`}>
                          {task.title}
                        </p>
                        {task.description && (
                          <p className="text-sm text-muted-foreground whitespace-pre-wrap">{task.description}</p>
                        )}
                        {task.is_completed && task.completed_at && (
                          <p className="text-xs text-muted-foreground">
                            Выполнено {new Date(task.completed_at).toLocaleDateString('ru-RU')}
                          </p>
                        )}
                        {task.is_completed && task.participant_comment && (
                          <p className="text-xs bg-muted/50 rounded p-2 mt-1 whitespace-pre-wrap">{task.participant_comment}</p>
                        )}
                      </div>
                    </div>

                    {openTaskId === task.id && (
                      <div className="space-y-2 pl-8">
                        <Textarea
                          value={taskComment}
                          onChange={(e) => setTaskComment(e.target.value)}
                          placeholder="Комментарий к выполнению (необязательно)"
                          rows={3}
                          disabled={completingTaskId === task.id}
                        />
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1"
                            onClick={cancelTaskComment}
                            disabled={completingTaskId === task.id}
                          >
                            Отмена
                          </Button>
                          <Button
                            size="sm"
                            className="flex-1 bg-kamp-primary hover:bg-kamp-primary/90 text-white"
                            onClick={() => handleCompleteTask(task.id)}
                            disabled={completingTaskId === task.id}
                          >
                            {completingTaskId === task.id ? 'Отмечаю...' : 'Отметить выполненной'}
                          </Button>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-2">
          <h2 className="text-sm font-semibold">Отчёты</h2>

          <Card>
            <CardContent className="p-4 space-y-2">
              <Textarea
                value={entrySummary}
                onChange={(e) => setEntrySummary(e.target.value)}
                placeholder="Что сделано за период"
                rows={3}
                disabled={submittingEntry}
              />
              <Textarea
                value={entryMyTasks}
                onChange={(e) => setEntryMyTasks(e.target.value)}
                placeholder="Мои задачи на следующий период (необязательно)"
                rows={2}
                disabled={submittingEntry}
              />
              <Button
                size="sm"
                className="w-full bg-kamp-primary hover:bg-kamp-primary/90 text-white"
                onClick={handleSubmitEntry}
                disabled={!entrySummary.trim() || submittingEntry}
              >
                <Send className="w-4 h-4 mr-1" />
                {submittingEntry ? 'Отправляем...' : 'Отправить отчёт'}
              </Button>
            </CardContent>
          </Card>

          {entries.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-2">Пока нет отчётов</p>
          ) : (
            <div className="space-y-2">
              {entries.map((entry) => (
                <Card key={entry.id}>
                  <CardContent className="p-4 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(entry.entry_date).toLocaleDateString('ru-RU')}
                      </span>
                      <Badge variant="outline">{entry.status}</Badge>
                    </div>
                    <p className="text-sm whitespace-pre-wrap">{entry.summary}</p>
                    {entry.my_tasks && (
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">Задачи: {entry.my_tasks}</p>
                    )}
                    {entry.admin_comment && (
                      <div className="text-xs bg-muted/50 rounded p-2 mt-1">
                        <strong>Комментарий тренера:</strong> {entry.admin_comment}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
