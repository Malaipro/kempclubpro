import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, CheckCircle, RotateCcw, Clock } from 'lucide-react';

interface Stream {
  id: string;
  name: string;
  is_active: boolean;
}

interface Profile {
  user_id: string;
  display_name: string | null;
  first_name: string | null;
  last_name: string | null;
  participant_status: string | null;
  current_stream_id: string | null;
}

interface Assignment {
  id: string;
  title: string;
  theme: string | null;
  content: string;
  deadline: string | null;
  stream_id: string | null;
  target_user_id: string | null;
  points_reward: number;
  is_active: boolean;
  created_at: string;
}

interface Submission {
  id: string;
  user_id: string;
  assignment_id: string | null;
  homework_type: string;
  description: string | null;
  status: string;
  admin_comment: string | null;
  points_earned: number;
  created_at: string;
  reviewed_at: string | null;
  profile?: Profile;
  assignment?: Assignment;
}

const emptyForm = {
  title: '',
  theme: '',
  content: '',
  deadline: '',
  stream_id: '',
  target_user_id: '',
  points_reward: 10,
  is_active: true,
};

export const HomeworkManagement: React.FC = () => {
  const { user } = useAuth();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [streams, setStreams] = useState<Stream[]>([]);
  const [participants, setParticipants] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Assignment | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [reviewDialog, setReviewDialog] = useState<Submission | null>(null);
  const [reviewComment, setReviewComment] = useState('');

  const loadData = async () => {
    setLoading(true);
    const [{ data: a }, { data: s }, { data: st }, { data: p }] = await Promise.all([
      supabase.from('homework_assignments').select('*').order('created_at', { ascending: false }),
      supabase.from('homework_submissions').select('*').order('created_at', { ascending: false }).limit(200),
      supabase.from('streams').select('id, name, is_active').order('created_at', { ascending: false }),
      supabase.from('profiles').select('user_id, display_name, first_name, last_name, participant_status, current_stream_id').eq('participant_status', 'intensive_active'),
    ]);
    setAssignments(a || []);
    setStreams(st || []);
    setParticipants(p || []);

    // Enrich submissions with profile and assignment info
    const profileMap = new Map((p || []).map((pr: any) => [pr.user_id, pr]));
    const assignMap = new Map((a || []).map((ax: any) => [ax.id, ax]));
    // also load other profiles for submissions made by users not in current list
    const missingIds = Array.from(new Set((s || []).map((x: any) => x.user_id))).filter((id: any) => !profileMap.has(id));
    let extra: any[] = [];
    if (missingIds.length) {
      const { data: ex } = await supabase
        .from('profiles')
        .select('user_id, display_name, first_name, last_name, participant_status, current_stream_id')
        .in('user_id', missingIds as string[]);
      extra = ex || [];
      extra.forEach((pr) => profileMap.set(pr.user_id, pr));
    }
    const enriched: Submission[] = (s || []).map((x: any) => ({
      ...x,
      profile: profileMap.get(x.user_id),
      assignment: x.assignment_id ? assignMap.get(x.assignment_id) : undefined,
    }));
    setSubmissions(enriched);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const openCreate = () => {
    setEditing(null);
    setForm({ ...emptyForm });
    setDialogOpen(true);
  };

  const openEdit = (a: Assignment) => {
    setEditing(a);
    setForm({
      title: a.title,
      theme: a.theme || '',
      content: a.content,
      deadline: a.deadline ? a.deadline.slice(0, 16) : '',
      stream_id: a.stream_id || '',
      target_user_id: a.target_user_id || '',
      points_reward: a.points_reward,
      is_active: a.is_active,
    });
    setDialogOpen(true);
  };

  const saveAssignment = async () => {
    if (!form.title.trim() || !form.content.trim()) {
      toast.error('Заполните название и содержание');
      return;
    }
    if (!form.stream_id && !form.target_user_id) {
      toast.error('Выберите поток или участника');
      return;
    }
    const payload = {
      title: form.title.trim(),
      theme: form.theme.trim() || null,
      content: form.content.trim(),
      deadline: form.deadline ? new Date(form.deadline).toISOString() : null,
      stream_id: form.stream_id || null,
      target_user_id: form.target_user_id || null,
      points_reward: Number(form.points_reward) || 10,
      is_active: form.is_active,
      created_by: user?.id,
    };
    const { error } = editing
      ? await supabase.from('homework_assignments').update(payload).eq('id', editing.id)
      : await supabase.from('homework_assignments').insert(payload);
    if (error) {
      toast.error('Ошибка: ' + error.message);
      return;
    }
    toast.success(editing ? 'Задание обновлено' : 'Задание создано');
    setDialogOpen(false);
    loadData();
  };

  const deleteAssignment = async (id: string) => {
    if (!confirm('Удалить задание? Все связанные ответы также будут удалены.')) return;
    const { error } = await supabase.from('homework_assignments').delete().eq('id', id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success('Удалено');
    loadData();
  };

  const reviewSubmission = async (status: 'accepted' | 'rework') => {
    if (!reviewDialog) return;
    const { error } = await supabase.rpc('review_homework_submission', {
      p_submission_id: reviewDialog.id,
      p_status: status,
      p_admin_comment: reviewComment.trim() || null,
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(status === 'accepted' ? 'Принято' : 'Отправлено на доработку');
    setReviewDialog(null);
    setReviewComment('');
    loadData();
  };

  const participantName = (p?: Profile) =>
    p?.display_name || [p?.first_name, p?.last_name].filter(Boolean).join(' ') || 'Участник';

  const statusBadge = (status: string) => {
    const map: Record<string, { label: string; cls: string }> = {
      submitted: { label: 'На проверке', cls: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40' },
      accepted: { label: 'Принято', cls: 'bg-green-500/20 text-green-300 border-green-500/40' },
      rework: { label: 'На доработку', cls: 'bg-red-500/20 text-red-300 border-red-500/40' },
    };
    const m = map[status] || { label: status, cls: '' };
    return <Badge variant="outline" className={m.cls}>{m.label}</Badge>;
  };

  if (loading) return <div className="text-muted-foreground p-6">Загрузка…</div>;

  return (
    <div className="space-y-6">
      <Tabs defaultValue="assignments">
        <TabsList>
          <TabsTrigger value="assignments">Задания ({assignments.length})</TabsTrigger>
          <TabsTrigger value="submissions">
            Ответы ({submissions.filter((s) => s.status === 'submitted').length} на проверке)
          </TabsTrigger>
        </TabsList>

        <TabsContent value="assignments" className="space-y-4 mt-4">
          <div className="flex justify-end">
            <Button onClick={openCreate}>
              <Plus className="w-4 h-4 mr-2" /> Новое задание
            </Button>
          </div>

          {assignments.length === 0 ? (
            <Card><CardContent className="p-6 text-center text-muted-foreground">Заданий пока нет</CardContent></Card>
          ) : (
            <div className="space-y-3">
              {assignments.map((a) => (
                <Card key={a.id}>
                  <CardContent className="p-4 flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold">{a.title}</h3>
                        {!a.is_active && <Badge variant="secondary">Неактивно</Badge>}
                        <Badge variant="outline">{a.points_reward} баллов</Badge>
                        {a.stream_id && <Badge variant="outline">Поток: {streams.find((s) => s.id === a.stream_id)?.name || '—'}</Badge>}
                        {a.target_user_id && <Badge variant="outline">Лично</Badge>}
                      </div>
                      {a.theme && <p className="text-sm text-muted-foreground mt-1">{a.theme}</p>}
                      <p className="text-sm mt-2 line-clamp-2">{a.content}</p>
                      {a.deadline && (
                        <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                          <Clock className="w-3 h-3" /> До {new Date(a.deadline).toLocaleString('ru-RU')}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <Button size="sm" variant="outline" onClick={() => openEdit(a)}><Pencil className="w-4 h-4" /></Button>
                      <Button size="sm" variant="destructive" onClick={() => deleteAssignment(a.id)}><Trash2 className="w-4 h-4" /></Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="submissions" className="space-y-3 mt-4">
          {submissions.length === 0 ? (
            <Card><CardContent className="p-6 text-center text-muted-foreground">Ответов пока нет</CardContent></Card>
          ) : (
            submissions.map((s) => (
              <Card key={s.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="font-semibold">{participantName(s.profile)}</span>
                        {statusBadge(s.status)}
                        {s.points_earned > 0 && <Badge variant="outline">+{s.points_earned}</Badge>}
                      </div>
                      {s.assignment && (
                        <p className="text-sm text-muted-foreground">Задание: <strong>{s.assignment.title}</strong></p>
                      )}
                      {s.description && <p className="text-sm mt-2 whitespace-pre-wrap">{s.description}</p>}
                      <p className="text-xs text-muted-foreground mt-2">
                        Отправлено: {new Date(s.created_at).toLocaleString('ru-RU')}
                        {s.reviewed_at && ` • Проверено: ${new Date(s.reviewed_at).toLocaleString('ru-RU')}`}
                      </p>
                      {s.admin_comment && (
                        <div className="mt-2 p-2 bg-muted/50 rounded text-sm">
                          <strong>Комментарий админа:</strong> {s.admin_comment}
                        </div>
                      )}
                    </div>
                    {s.status === 'submitted' && (
                      <Button size="sm" onClick={() => { setReviewDialog(s); setReviewComment(''); }}>
                        Проверить
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>

      {/* Create/Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Редактировать задание' : 'Новое задание'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Название *</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>
            <div>
              <Label>Тема</Label>
              <Input value={form.theme} onChange={(e) => setForm({ ...form, theme: e.target.value })} />
            </div>
            <div>
              <Label>Содержание *</Label>
              <Textarea rows={5} value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Дедлайн</Label>
                <Input type="datetime-local" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} />
              </div>
              <div>
                <Label>Награда (баллы)</Label>
                <Input type="number" value={form.points_reward} onChange={(e) => setForm({ ...form, points_reward: Number(e.target.value) })} />
              </div>
            </div>
            <div>
              <Label>Поток (для группового)</Label>
              <Select value={form.stream_id || 'none'} onValueChange={(v) => setForm({ ...form, stream_id: v === 'none' ? '' : v, target_user_id: v !== 'none' ? '' : form.target_user_id })}>
                <SelectTrigger><SelectValue placeholder="Выбрать поток" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— не выбран —</SelectItem>
                  {streams.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}{s.is_active ? ' (активный)' : ''}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Или конкретный участник (персональное)</Label>
              <Select value={form.target_user_id || 'none'} onValueChange={(v) => setForm({ ...form, target_user_id: v === 'none' ? '' : v, stream_id: v !== 'none' ? '' : form.stream_id })}>
                <SelectTrigger><SelectValue placeholder="Выбрать участника" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— не выбран —</SelectItem>
                  {participants.map((p) => (
                    <SelectItem key={p.user_id} value={p.user_id}>{participantName(p)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <input
                id="is_active"
                type="checkbox"
                checked={form.is_active}
                onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
              />
              <Label htmlFor="is_active">Активно (видно участникам)</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Отмена</Button>
            <Button onClick={saveAssignment}>{editing ? 'Сохранить' : 'Создать'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Review dialog */}
      <Dialog open={!!reviewDialog} onOpenChange={(o) => !o && setReviewDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Проверка ДЗ</DialogTitle>
          </DialogHeader>
          {reviewDialog && (
            <div className="space-y-3">
              <div className="text-sm">
                <strong>{participantName(reviewDialog.profile)}</strong>
                {reviewDialog.assignment && <> — {reviewDialog.assignment.title}</>}
              </div>
              {reviewDialog.description && (
                <div className="p-3 bg-muted/50 rounded text-sm whitespace-pre-wrap">{reviewDialog.description}</div>
              )}
              <div>
                <Label>Комментарий (необязательно)</Label>
                <Textarea rows={3} value={reviewComment} onChange={(e) => setReviewComment(e.target.value)} />
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => reviewSubmission('rework')}>
              <RotateCcw className="w-4 h-4 mr-1" /> На доработку
            </Button>
            <Button onClick={() => reviewSubmission('accepted')}>
              <CheckCircle className="w-4 h-4 mr-1" /> Принять
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
