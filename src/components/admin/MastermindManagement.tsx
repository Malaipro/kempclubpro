import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Plus, Trash2, Check, X, Loader2, RefreshCw } from 'lucide-react';

interface Member {
  id: string;
  user_id: string;
  request: string | null;
  plan: string | null;
  start_date: string | null;
  end_date: string | null;
  is_active: boolean | null;
  created_at: string | null;
  profile?: { display_name: string | null; telegram_id: string | null } | null;
}

interface Task {
  id: string;
  member_id: string;
  title: string;
  description: string | null;
  is_completed: boolean | null;
  completed_at: string | null;
  participant_comment: string | null;
  file_url: string | null;
  sort_order: number | null;
  created_at: string | null;
  deadline: string | null;
  created_by: string | null;
  approval_status: string | null;
  admin_comment: string | null;
}

interface Entry {
  id: string;
  member_id: string;
  entry_date: string;
  summary: string;
  my_tasks: string | null;
  status: string | null;
  admin_comment: string | null;
  created_at: string | null;
}

interface Candidate {
  user_id: string;
  display_name: string | null;
  telegram_id: string | null;
}

const fmtDate = (d?: string | null) =>
  d ? new Date(d).toLocaleDateString('ru-RU') : '—';

export const MastermindManagement: React.FC = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState<Member[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);

  // add member dialog
  const [addOpen, setAddOpen] = useState(false);
  const [newUserId, setNewUserId] = useState('');
  const [newRequest, setNewRequest] = useState('');
  const [newPlan, setNewPlan] = useState('');
  const [newStart, setNewStart] = useState('');
  const [newEnd, setNewEnd] = useState('');
  const [saving, setSaving] = useState(false);

  // add task dialog
  const [taskOpen, setTaskOpen] = useState(false);
  const [taskMemberId, setTaskMemberId] = useState('');
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDesc, setTaskDesc] = useState('');

  const [reviewComments, setReviewComments] = useState<Record<string, string>>({});

  const memberName = (id: string) => {
    const m = members.find((x) => x.id === id);
    return m?.profile?.display_name || 'Участник';
  };

  const loadAll = async () => {
    setLoading(true);
    try {
      const [mRes, tRes, eRes] = await Promise.all([
        supabase.from('mastermind_members').select('*').order('created_at', { ascending: false }),
        supabase.from('mastermind_tasks').select('*').order('sort_order', { ascending: true }),
        supabase.from('mastermind_entries').select('*').order('entry_date', { ascending: false }),
      ]);
      if (mRes.error) throw mRes.error;

      const memberRows = (mRes.data || []) as Member[];
      const ids = memberRows.map((m) => m.user_id);
      let profilesMap: Record<string, { display_name: string | null; telegram_id: string | null }> = {};
      if (ids.length) {
        const { data: profs } = await supabase
          .from('profiles')
          .select('user_id, display_name, telegram_id')
          .in('user_id', ids);
        (profs || []).forEach((p: any) => {
          profilesMap[p.user_id] = { display_name: p.display_name, telegram_id: p.telegram_id };
        });
      }
      setMembers(memberRows.map((m) => ({ ...m, profile: profilesMap[m.user_id] || null })));
      setTasks((tRes.data || []) as Task[]);
      setEntries((eRes.data || []) as Entry[]);

      // candidates: club residents not yet members
      const { data: residents } = await supabase
        .from('profiles')
        .select('user_id, display_name, telegram_id')
        .eq('participant_status', 'club_resident');
      setCandidates(
        ((residents || []) as any[])
          .filter((r) => !ids.includes(r.user_id))
          .map((r) => ({ user_id: r.user_id, display_name: r.display_name, telegram_id: r.telegram_id }))
      );
    } catch (e: any) {
      toast({ title: 'Ошибка загрузки', description: e.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const addMember = async () => {
    if (!newUserId) {
      toast({ title: 'Выберите участника', variant: 'destructive' });
      return;
    }
    setSaving(true);
    const { error } = await supabase.from('mastermind_members').insert({
      user_id: newUserId,
      request: newRequest || null,
      plan: newPlan || null,
      start_date: newStart || null,
      end_date: newEnd || null,
    });
    setSaving(false);
    if (error) {
      toast({ title: 'Ошибка', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Участник добавлен' });
    setAddOpen(false);
    setNewUserId(''); setNewRequest(''); setNewPlan(''); setNewStart(''); setNewEnd('');
    loadAll();
  };

  const toggleActive = async (m: Member) => {
    const { error } = await supabase
      .from('mastermind_members')
      .update({ is_active: !m.is_active, updated_at: new Date().toISOString() })
      .eq('id', m.id);
    if (error) return toast({ title: 'Ошибка', description: error.message, variant: 'destructive' });
    loadAll();
  };

  const removeMember = async (m: Member) => {
    if (!confirm('Удалить участника из мастермайнда?')) return;
    const { error } = await supabase.from('mastermind_members').delete().eq('id', m.id);
    if (error) return toast({ title: 'Ошибка', description: error.message, variant: 'destructive' });
    toast({ title: 'Удалено' });
    loadAll();
  };

  const addTask = async () => {
    if (!taskMemberId || !taskTitle.trim()) {
      toast({ title: 'Заполните участника и название', variant: 'destructive' });
      return;
    }
    setSaving(true);
    const { error } = await supabase.from('mastermind_tasks').insert({
      member_id: taskMemberId,
      title: taskTitle.trim(),
      description: taskDesc || null,
      sort_order: tasks.filter((t) => t.member_id === taskMemberId).length,
    });
    setSaving(false);
    if (error) return toast({ title: 'Ошибка', description: error.message, variant: 'destructive' });
    toast({ title: 'Задача добавлена' });
    setTaskOpen(false);
    setTaskTitle(''); setTaskDesc('');
    loadAll();
  };

  const toggleTask = async (t: Task) => {
    const next = !t.is_completed;
    const { error } = await supabase
      .from('mastermind_tasks')
      .update({ is_completed: next, completed_at: next ? new Date().toISOString() : null })
      .eq('id', t.id);
    if (error) return toast({ title: 'Ошибка', description: error.message, variant: 'destructive' });
    loadAll();
  };

  const removeTask = async (t: Task) => {
    if (!confirm('Удалить задачу?')) return;
    const { error } = await supabase.from('mastermind_tasks').delete().eq('id', t.id);
    if (error) return toast({ title: 'Ошибка', description: error.message, variant: 'destructive' });
    loadAll();
  };

  const reviewEntry = async (e: Entry, status: 'approved' | 'rejected') => {
    const { error } = await supabase
      .from('mastermind_entries')
      .update({ status, admin_comment: reviewComments[e.id] ?? e.admin_comment ?? null })
      .eq('id', e.id);
    if (error) return toast({ title: 'Ошибка', description: error.message, variant: 'destructive' });
    toast({ title: status === 'approved' ? 'Отчёт принят' : 'Отчёт отклонён' });
    loadAll();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Мастермайнд</h2>
          <p className="text-muted-foreground text-sm">Участники, задачи и отчёты мастермайнда</p>
        </div>
        <Button variant="outline" size="sm" onClick={loadAll}>
          <RefreshCw className="w-4 h-4 mr-2" /> Обновить
        </Button>
      </div>

      <Tabs defaultValue="members">
        <TabsList>
          <TabsTrigger value="members">Участники</TabsTrigger>
          <TabsTrigger value="tasks">Задачи</TabsTrigger>
          <TabsTrigger value="entries">Отчёты</TabsTrigger>
        </TabsList>

        {/* УЧАСТНИКИ */}
        <TabsContent value="members" className="space-y-4 mt-4">
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="w-4 h-4 mr-2" /> Добавить участника
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Новый участник мастермайнда</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div>
                  <Label>Участник (резидент клуба)</Label>
                  <Select value={newUserId} onValueChange={setNewUserId}>
                    <SelectTrigger><SelectValue placeholder="Выберите участника" /></SelectTrigger>
                    <SelectContent>
                      {candidates.length === 0 && (
                        <SelectItem value="none" disabled>Нет доступных резидентов</SelectItem>
                      )}
                      {candidates.map((c) => (
                        <SelectItem key={c.user_id} value={c.user_id}>
                          {c.display_name || c.user_id.slice(0, 8)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Запрос</Label>
                  <Textarea value={newRequest} onChange={(e) => setNewRequest(e.target.value)} rows={3} />
                </div>
                <div>
                  <Label>План</Label>
                  <Textarea value={newPlan} onChange={(e) => setNewPlan(e.target.value)} rows={3} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Дата начала</Label>
                    <Input type="date" value={newStart} onChange={(e) => setNewStart(e.target.value)} />
                  </div>
                  <div>
                    <Label>Дата окончания</Label>
                    <Input type="date" value={newEnd} onChange={(e) => setNewEnd(e.target.value)} />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button onClick={addMember} disabled={saving}>
                  {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Сохранить
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {members.length === 0 && (
            <p className="text-muted-foreground text-sm">Участников пока нет</p>
          )}

          <div className="grid gap-3">
            {members.map((m) => (
              <Card key={m.id} className="bg-card">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-3">
                    <CardTitle className="text-base text-card-foreground break-words min-w-0">
                      {m.profile?.display_name || 'Без имени'}
                      {m.profile?.telegram_id && (
                        <span className="text-xs text-muted-foreground ml-2">TG: {m.profile.telegram_id}</span>
                      )}
                    </CardTitle>
                    <Badge variant={m.is_active ? 'default' : 'outline'}>
                      {m.is_active ? 'Активен' : 'Неактивен'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <p><span className="text-muted-foreground">Запрос:</span> {m.request || '—'}</p>
                  <p><span className="text-muted-foreground">План:</span> {m.plan || '—'}</p>
                  <p className="text-muted-foreground">
                    {fmtDate(m.start_date)} — {fmtDate(m.end_date)}
                  </p>
                  <div className="flex gap-2 pt-1">
                    <Button size="sm" variant="outline" onClick={() => toggleActive(m)}>
                      {m.is_active ? 'Деактивировать' : 'Активировать'}
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => removeMember(m)}>
                      <Trash2 className="w-4 h-4 mr-1" /> Удалить
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* ЗАДАЧИ */}
        <TabsContent value="tasks" className="space-y-4 mt-4">
          <Dialog open={taskOpen} onOpenChange={setTaskOpen}>
            <DialogTrigger asChild>
              <Button size="sm" disabled={members.length === 0}>
                <Plus className="w-4 h-4 mr-2" /> Добавить задачу
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader><DialogTitle>Новая задача</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div>
                  <Label>Участник</Label>
                  <Select value={taskMemberId} onValueChange={setTaskMemberId}>
                    <SelectTrigger><SelectValue placeholder="Выберите участника" /></SelectTrigger>
                    <SelectContent>
                      {members.map((m) => (
                        <SelectItem key={m.id} value={m.id}>
                          {m.profile?.display_name || 'Без имени'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Название</Label>
                  <Input value={taskTitle} onChange={(e) => setTaskTitle(e.target.value)} />
                </div>
                <div>
                  <Label>Описание</Label>
                  <Textarea value={taskDesc} onChange={(e) => setTaskDesc(e.target.value)} rows={3} />
                </div>
              </div>
              <DialogFooter>
                <Button onClick={addTask} disabled={saving}>
                  {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Сохранить
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {tasks.length === 0 && <p className="text-muted-foreground text-sm">Задач пока нет</p>}

          <div className="grid gap-3">
            {tasks.map((t) => (
              <Card key={t.id} className="bg-card">
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium text-card-foreground break-words">{t.title}</p>
                      <p className="text-xs text-muted-foreground">{memberName(t.member_id)}</p>
                    </div>
                    <Badge variant={t.is_completed ? 'default' : 'outline'}>
                      {t.is_completed ? 'Выполнена' : 'В работе'}
                    </Badge>
                  </div>
                  {t.description && <p className="text-sm text-muted-foreground">{t.description}</p>}
                  {t.participant_comment && (
                    <p className="text-sm"><span className="text-muted-foreground">Комментарий участника:</span> {t.participant_comment}</p>
                  )}
                  {t.file_url && (
                    <a href={t.file_url} target="_blank" rel="noreferrer" className="text-sm underline text-primary">
                      Файл участника
                    </a>
                  )}
                  <div className="flex gap-2 pt-1">
                    <Button size="sm" variant="outline" onClick={() => toggleTask(t)}>
                      {t.is_completed ? 'Вернуть в работу' : 'Отметить выполненной'}
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => removeTask(t)}>
                      <Trash2 className="w-4 h-4 mr-1" /> Удалить
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* ОТЧЁТЫ */}
        <TabsContent value="entries" className="space-y-3 mt-4">
          {entries.length === 0 && <p className="text-muted-foreground text-sm">Отчётов пока нет</p>}
          {entries.map((e) => (
            <Card key={e.id} className="bg-card">
              <CardContent className="p-4 space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium text-card-foreground">{memberName(e.member_id)}</p>
                    <p className="text-xs text-muted-foreground">{fmtDate(e.entry_date)}</p>
                  </div>
                  <Badge
                    variant={
                      e.status === 'approved' ? 'default' : e.status === 'rejected' ? 'destructive' : 'outline'
                    }
                  >
                    {e.status === 'approved' ? 'Принят' : e.status === 'rejected' ? 'Отклонён' : 'На проверке'}
                  </Badge>
                </div>
                <p className="text-sm whitespace-pre-wrap">{e.summary}</p>
                {e.my_tasks && (
                  <p className="text-sm"><span className="text-muted-foreground">Задачи:</span> {e.my_tasks}</p>
                )}
                <Textarea
                  rows={2}
                  placeholder="Комментарий администратора"
                  value={reviewComments[e.id] ?? e.admin_comment ?? ''}
                  onChange={(ev) => setReviewComments((p) => ({ ...p, [e.id]: ev.target.value }))}
                />
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => reviewEntry(e, 'approved')}>
                    <Check className="w-4 h-4 mr-1" /> Принять
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => reviewEntry(e, 'rejected')}>
                    <X className="w-4 h-4 mr-1" /> Отклонить
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
};
