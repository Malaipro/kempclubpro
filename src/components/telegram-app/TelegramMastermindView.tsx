import React, { useEffect, useState, useCallback } from 'react';
import { Users, Clock, Send, ListChecks, FileText, Paperclip, X, Plus, ChevronDown, ChevronUp } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

const SERVER_URL = (import.meta as any).env?.VITE_TELEGRAM_SERVER_URL ?? 'https://tg.kempclub.pro';

interface MastermindMember {
  id: string;
  request: string | null;
  plan: string | null;
  start_date: string | null;
  end_date: string | null;
}

type TaskApprovalStatus = 'pending' | 'approved' | 'rejected';

interface MastermindTask {
  id: string;
  title: string;
  description: string | null;
  is_completed: boolean;
  completed_at: string | null;
  participant_comment: string | null;
  sort_order: number;
  deadline: string | null;
  approval_status: TaskApprovalStatus | null;
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
  groupId: string;
  groupName: string;
}

export const TelegramMastermindView: React.FC<Props> = ({ onBack, groupId, groupName }) => {
  const [data, setData] = useState<MastermindData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Свёрнутые/развёрнутые задачи (по умолчанию всё свёрнуто)
  const [expandedTaskIds, setExpandedTaskIds] = useState<Set<string>>(new Set());

  // Комментарий (обязателен) и файл к отметке задачи выполненной
  const [openTaskId, setOpenTaskId] = useState<string | null>(null);
  const [taskComment, setTaskComment] = useState('');
  const [taskFileUrl, setTaskFileUrl] = useState<string | null>(null);
  const [taskFileName, setTaskFileName] = useState<string | null>(null);
  const [uploadingTaskFile, setUploadingTaskFile] = useState(false);
  const [completingTaskId, setCompletingTaskId] = useState<string | null>(null);

  // Форма нового отчёта
  const [entrySummary, setEntrySummary] = useState('');
  const [entryMyTasks, setEntryMyTasks] = useState('');
  const [submittingEntry, setSubmittingEntry] = useState(false);

  // Форма новой задачи, создаваемой участником
  const [addTaskOpen, setAddTaskOpen] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDescription, setNewTaskDescription] = useState('');
  const [newTaskDeadline, setNewTaskDeadline] = useState('');
  const [creatingTask, setCreatingTask] = useState(false);

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
        body: JSON.stringify({ initData, action: 'get_mastermind', group_id: groupId }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || 'Ошибка загрузки');
      setData(json.data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [groupId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const toggleTaskExpanded = (taskId: string) => {
    setExpandedTaskIds((prev) => {
      const next = new Set(prev);
      if (next.has(taskId)) next.delete(taskId);
      else next.add(taskId);
      return next;
    });
  };

  const openTaskComment = (taskId: string) => {
    setOpenTaskId(taskId);
    setTaskComment('');
    setTaskFileUrl(null);
    setTaskFileName(null);
  };

  const cancelTaskComment = () => {
    setOpenTaskId(null);
    setTaskComment('');
    setTaskFileUrl(null);
    setTaskFileName(null);
  };

  const handleTaskFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    const initData = (window as any).Telegram?.WebApp?.initData;
    if (!initData) return;

    setUploadingTaskFile(true);
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result).split(',')[1] ?? '');
        reader.onerror = () => reject(new Error('file_read_error'));
        reader.readAsDataURL(file);
      });

      const res = await fetch(`${SERVER_URL}/api/state`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          initData,
          action: 'upload_homework_file',
          file_name: file.name,
          file_base64: base64,
        }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || 'Ошибка загрузки файла');
      setTaskFileUrl(json.data.file_url);
      setTaskFileName(file.name);
    } catch (e: any) {
      alert(e.message);
    } finally {
      setUploadingTaskFile(false);
    }
  };

  const handleCompleteTask = async (taskId: string) => {
    const initData = (window as any).Telegram?.WebApp?.initData;
    if (!initData || !taskComment.trim()) return;
    setCompletingTaskId(taskId);
    try {
      const res = await fetch(`${SERVER_URL}/api/state`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          initData,
          action: 'complete_mastermind_task',
          task_id: taskId,
          task_comment: taskComment.trim(),
          task_file_url: taskFileUrl,
        }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || 'Ошибка');
      setOpenTaskId(null);
      setTaskComment('');
      setTaskFileUrl(null);
      setTaskFileName(null);
      await fetchData();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setCompletingTaskId(null);
    }
  };

  const handleCreateTask = async () => {
    const initData = (window as any).Telegram?.WebApp?.initData;
    if (!initData || !newTaskTitle.trim() || creatingTask || !data || !data.is_member) return;
    setCreatingTask(true);
    try {
      const res = await fetch(`${SERVER_URL}/api/state`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          initData,
          action: 'create_mastermind_task',
          member_id: data.member.id,
          task_title: newTaskTitle.trim(),
          task_description: newTaskDescription.trim() || null,
          task_deadline: newTaskDeadline || null,
        }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || 'Ошибка');
      setAddTaskOpen(false);
      setNewTaskTitle('');
      setNewTaskDescription('');
      setNewTaskDeadline('');
      await fetchData();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setCreatingTask(false);
    }
  };

  const handleSubmitEntry = async () => {
    const initData = (window as any).Telegram?.WebApp?.initData;
    if (!initData || !entrySummary.trim() || submittingEntry || !data || !data.is_member) return;
    setSubmittingEntry(true);
    try {
      const res = await fetch(`${SERVER_URL}/api/state`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          initData,
          action: 'submit_mastermind_entry',
          member_id: data.member.id,
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
          <h1 className="text-lg font-bold flex items-center gap-2"><Users className="w-5 h-5" /> {groupName}</h1>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
          <p className="text-base font-medium">Вы не записаны в мастермайнд.</p>
          <p className="text-xs text-muted-foreground mt-2">Запишитесь в Расписании или обратитесь к тренеру.</p>
        </div>
      </div>
    );
  }

  const { member, tasks, entries } = data;
  const completedTasksCount = tasks.filter((t) => t.is_completed).length;
  const tasksProgressPct = tasks.length > 0 ? Math.round((completedTasksCount / tasks.length) * 100) : 0;

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <div className="bg-kamp-primary text-white px-4 py-3">
        <h1 className="text-lg font-bold flex items-center gap-2"><Users className="w-5 h-5" /> {groupName}</h1>
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
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold">Задачи</h2>
            {tasks.length > 0 && (
              <span className="text-xs text-muted-foreground">
                {completedTasksCount}/{tasks.length} · {tasksProgressPct}%
              </span>
            )}
          </div>
          {tasks.length > 0 && (
            <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
              <div
                className="h-full bg-kamp-primary transition-all"
                style={{ width: `${tasksProgressPct}%` }}
              />
            </div>
          )}
          {tasks.length === 0 ? (
            <Card><CardContent className="p-4 text-center text-sm text-muted-foreground">Пока нет задач</CardContent></Card>
          ) : (
            <div className="space-y-2">
              {tasks.map((task) => {
                const isOverdue = !!task.deadline && !task.is_completed && new Date(task.deadline).getTime() < Date.now();
                const isExpanded = expandedTaskIds.has(task.id);
                const approvalBadge = task.approval_status && (
                  <Badge
                    variant="outline"
                    className={
                      task.approval_status === 'pending'
                        ? 'bg-yellow-500/20 text-yellow-700 dark:text-yellow-300 border-yellow-500/40'
                        : task.approval_status === 'approved'
                        ? 'bg-green-500/20 text-green-700 dark:text-green-300 border-green-500/40'
                        : 'bg-red-500/20 text-red-700 dark:text-red-300 border-red-500/40'
                    }
                  >
                    {task.approval_status === 'pending' ? 'На проверке' : task.approval_status === 'approved' ? 'Одобрена' : 'На доработке'}
                  </Badge>
                );

                return (
                  <Card key={task.id} className={task.is_completed ? 'border-green-500/30 bg-green-500/5' : undefined}>
                    <CardContent className="p-4 space-y-2">
                      <div
                        role="button"
                        tabIndex={0}
                        className="w-full flex items-center gap-3 text-left cursor-pointer"
                        onClick={() => toggleTaskExpanded(task.id)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            toggleTaskExpanded(task.id);
                          }
                        }}
                      >
                        <Checkbox checked={task.is_completed} disabled className="shrink-0" />
                        <p className={`flex-1 text-sm font-medium ${task.is_completed ? 'line-through text-muted-foreground' : ''}`}>
                          {task.title}
                        </p>
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
                        )}
                      </div>

                      {isExpanded && (
                        <div className="pl-7 space-y-2">
                          {approvalBadge}
                          {task.description && (
                            <p className={`text-sm whitespace-pre-wrap ${task.is_completed ? 'text-muted-foreground/70' : 'text-muted-foreground'}`}>
                              {task.description}
                            </p>
                          )}
                          {task.deadline && (
                            <p className={`text-xs ${isOverdue ? 'text-red-500' : 'text-muted-foreground'}`}>
                              Срок: {new Date(task.deadline).toLocaleDateString('ru-RU')}
                            </p>
                          )}
                          {task.is_completed && task.completed_at && (
                            <p className="text-xs text-muted-foreground">
                              Выполнено {new Date(task.completed_at).toLocaleDateString('ru-RU')}
                            </p>
                          )}

                          {task.is_completed ? (
                            task.participant_comment && (
                              <p className="text-xs bg-muted/50 rounded p-2 mt-1 whitespace-pre-wrap">{task.participant_comment}</p>
                            )
                          ) : (
                            <Button
                              size="sm"
                              className="w-full bg-kamp-primary hover:bg-kamp-primary/90 text-white"
                              onClick={() => openTaskComment(task.id)}
                            >
                              Выполнено
                            </Button>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => setAddTaskOpen(true)}
          >
            <Plus className="w-4 h-4 mr-1" /> Добавить задачу
          </Button>
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

      <Dialog open={!!openTaskId} onOpenChange={(open) => { if (!open && completingTaskId === null) cancelTaskComment(); }}>
        <DialogContent className="max-w-[90vw] rounded-lg">
          <DialogHeader>
            <DialogTitle>Отметить задачу выполненной</DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Комментарий о результате *</label>
              <Textarea
                value={taskComment}
                onChange={(e) => setTaskComment(e.target.value)}
                placeholder="Опишите результат выполнения (обязательно)"
                rows={3}
                disabled={completingTaskId === openTaskId}
              />
            </div>

            {taskFileName ? (
              <div className="flex items-center justify-between text-xs bg-muted/40 rounded px-2 py-1.5">
                <span className="truncate flex items-center gap-1">
                  <Paperclip className="w-3 h-3 shrink-0" />{taskFileName}
                </span>
                <button
                  type="button"
                  onClick={() => { setTaskFileUrl(null); setTaskFileName(null); }}
                  disabled={completingTaskId === openTaskId}
                  aria-label="Убрать файл"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <label className="flex items-center gap-1 text-xs text-muted-foreground cursor-pointer w-fit">
                <Paperclip className="w-3 h-3" />
                {uploadingTaskFile ? 'Загружаем...' : 'Прикрепить файл'}
                <input
                  type="file"
                  className="hidden"
                  accept="image/*,.pdf,.doc,.docx"
                  disabled={completingTaskId === openTaskId || uploadingTaskFile}
                  onChange={handleTaskFileChange}
                />
              </label>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              variant="outline"
              onClick={cancelTaskComment}
              disabled={completingTaskId === openTaskId}
            >
              Отмена
            </Button>
            <Button
              onClick={() => { if (openTaskId) handleCompleteTask(openTaskId); }}
              disabled={!taskComment.trim() || completingTaskId === openTaskId || uploadingTaskFile}
              className="bg-kamp-primary hover:bg-kamp-primary/90 text-white"
            >
              {completingTaskId === openTaskId ? 'Отмечаю...' : 'Выполнено'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={addTaskOpen} onOpenChange={(open) => { if (!creatingTask) setAddTaskOpen(open); }}>
        <DialogContent className="max-w-[90vw] rounded-lg">
          <DialogHeader>
            <DialogTitle>Новая задача</DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Название *</label>
              <Input
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                placeholder="Что нужно сделать"
                disabled={creatingTask}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Описание</label>
              <Textarea
                value={newTaskDescription}
                onChange={(e) => setNewTaskDescription(e.target.value)}
                placeholder="Подробности (необязательно)"
                rows={3}
                disabled={creatingTask}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Срок (необязательно)</label>
              <Input
                type="date"
                value={newTaskDeadline}
                onChange={(e) => setNewTaskDeadline(e.target.value)}
                disabled={creatingTask}
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" onClick={() => setAddTaskOpen(false)} disabled={creatingTask}>
              Отмена
            </Button>
            <Button
              onClick={handleCreateTask}
              disabled={!newTaskTitle.trim() || creatingTask}
              className="bg-kamp-primary hover:bg-kamp-primary/90 text-white"
            >
              {creatingTask ? 'Добавляем...' : 'Добавить'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
