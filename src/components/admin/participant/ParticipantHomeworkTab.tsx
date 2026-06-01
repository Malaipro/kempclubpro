import React, { useCallback, useEffect, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { participantService, HomeworkSubmission, HomeworkAssignment } from '@/services/participantService';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { FileText, Plus, Loader2, Pencil, Trash2, Check, RotateCcw } from 'lucide-react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

interface Props {
  userId: string;
  streamId: string | null;
}

const STATUS_LABELS: Record<string, string> = {
  submitted: 'На проверке',
  accepted: 'Принято',
  rework: 'На доработку',
};

const emptyForm = { id: '', title: '', theme: '', content: '', deadline: '', points_reward: 10 };

export const ParticipantHomeworkTab: React.FC<Props> = ({ userId, streamId }) => {
  const { toast } = useToast();
  const [submissions, setSubmissions] = useState<HomeworkSubmission[]>([]);
  const [assignments, setAssignments] = useState<HomeworkAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [subs, asg] = await Promise.all([
        participantService.listHomeworkSubmissions(userId),
        participantService.listHomeworkAssignments(userId, streamId),
      ]);
      setSubmissions(subs);
      setAssignments(asg);
    } catch (e: any) {
      toast({ title: 'Ошибка', description: e?.message || 'Не удалось загрузить ДЗ', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [userId, streamId, toast]);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => { setForm(emptyForm); setOpen(true); };
  const openEdit = (a: HomeworkAssignment) => {
    setForm({
      id: a.id, title: a.title, theme: a.theme || '', content: a.content,
      deadline: a.deadline ? a.deadline.slice(0, 16) : '', points_reward: a.points_reward,
    });
    setOpen(true);
  };

  const save = async () => {
    if (!form.title.trim() || !form.content.trim()) {
      toast({ title: 'Заполните название и содержание', variant: 'destructive' }); return;
    }
    setSaving(true);
    try {
      const payload = {
        title: form.title.trim(), content: form.content.trim(), theme: form.theme || null,
        deadline: form.deadline ? new Date(form.deadline).toISOString() : null,
        points_reward: Number(form.points_reward) || 10,
      };
      if (form.id) {
        await participantService.updateHomeworkAssignment(form.id, payload);
      } else {
        await participantService.createHomeworkAssignment({ ...payload, target_user_id: userId, stream_id: streamId });
      }
      toast({ title: 'Готово', description: 'ДЗ сохранено' });
      setOpen(false); load();
    } catch (e: any) {
      toast({ title: 'Ошибка', description: e?.message || 'Не удалось сохранить', variant: 'destructive' });
    } finally { setSaving(false); }
  };

  const remove = async (id: string) => {
    if (!confirm('Удалить назначенное ДЗ?')) return;
    try { await participantService.deleteHomeworkAssignment(id); toast({ title: 'Удалено' }); load(); }
    catch (e: any) { toast({ title: 'Ошибка', description: e?.message, variant: 'destructive' }); }
  };

  const review = async (id: string, status: 'accepted' | 'rework') => {
    try { await participantService.reviewHomeworkSubmission(id, status); toast({ title: 'Готово' }); load(); }
    catch (e: any) { toast({ title: 'Ошибка', description: e?.message, variant: 'destructive' }); }
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="flex items-center gap-2"><FileText className="w-5 h-5 text-primary" />Назначенные ДЗ</CardTitle>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button size="sm" className="gap-2" onClick={openCreate}><Plus className="w-4 h-4" />Назначить ДЗ</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>{form.id ? 'Редактировать ДЗ' : 'Назначить ДЗ'}</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div><Label>Название</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
                <div><Label>Тема</Label><Input value={form.theme} onChange={(e) => setForm({ ...form, theme: e.target.value })} /></div>
                <div><Label>Содержание</Label><Textarea rows={4} value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Срок сдачи</Label><Input type="datetime-local" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} /></div>
                  <div><Label>Баллы</Label><Input type="number" value={form.points_reward} onChange={(e) => setForm({ ...form, points_reward: Number(e.target.value) })} /></div>
                </div>
              </div>
              <DialogFooter><Button onClick={save} disabled={saving}>{saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}Сохранить</Button></DialogFooter>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {assignments.length === 0 ? <p className="text-muted-foreground text-center py-6">Назначенных ДЗ нет</p> : (
            <div className="overflow-x-auto"><Table>
              <TableHeader><TableRow><TableHead>Название</TableHead><TableHead>Назначено</TableHead><TableHead>Срок</TableHead><TableHead>Баллы</TableHead><TableHead className="text-right">Действия</TableHead></TableRow></TableHeader>
              <TableBody>
                {assignments.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="font-medium">{a.title}</TableCell>
                    <TableCell className="text-sm">{format(new Date(a.created_at), 'dd.MM.yyyy', { locale: ru })}</TableCell>
                    <TableCell className="text-sm">{a.deadline ? format(new Date(a.deadline), 'dd.MM.yyyy', { locale: ru }) : '—'}</TableCell>
                    <TableCell>{a.points_reward}</TableCell>
                    <TableCell className="text-right whitespace-nowrap">
                      <Button size="icon" variant="ghost" onClick={() => openEdit(a)}><Pencil className="w-4 h-4" /></Button>
                      <Button size="icon" variant="ghost" onClick={() => remove(a.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table></div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Сданные работы</CardTitle></CardHeader>
        <CardContent>
          {submissions.length === 0 ? <p className="text-muted-foreground text-center py-6">Работ пока нет</p> : (
            <div className="overflow-x-auto"><Table>
              <TableHeader><TableRow><TableHead>Дата</TableHead><TableHead>Статус</TableHead><TableHead>Баллы</TableHead><TableHead>Комментарий</TableHead><TableHead className="text-right">Действия</TableHead></TableRow></TableHeader>
              <TableBody>
                {submissions.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="text-sm">{format(new Date(s.submitted_at), 'dd.MM.yyyy HH:mm', { locale: ru })}</TableCell>
                    <TableCell><Badge variant={s.status === 'accepted' ? 'default' : s.status === 'rework' ? 'destructive' : 'secondary'}>{STATUS_LABELS[s.status] || s.status}</Badge></TableCell>
                    <TableCell>{s.points_earned}</TableCell>
                    <TableCell className="text-sm max-w-xs truncate">{s.admin_comment || '—'}</TableCell>
                    <TableCell className="text-right whitespace-nowrap">
                      <Button size="icon" variant="ghost" title="Принять" onClick={() => review(s.id, 'accepted')}><Check className="w-4 h-4 text-green-600" /></Button>
                      <Button size="icon" variant="ghost" title="На доработку" onClick={() => review(s.id, 'rework')}><RotateCcw className="w-4 h-4 text-amber-600" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table></div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
