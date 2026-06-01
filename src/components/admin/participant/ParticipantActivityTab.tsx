import React, { useCallback, useEffect, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { participantService, UserActivity, ActivityType } from '@/services/participantService';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Activity, Plus, Loader2, Pencil, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

interface Props { userId: string; }

const emptyForm = { id: '', activity_id: '', points_earned: 0, notes: '', completed_at: '' };

export const ParticipantActivityTab: React.FC<Props> = ({ userId }) => {
  const { toast } = useToast();
  const [items, setItems] = useState<UserActivity[]>([]);
  const [types, setTypes] = useState<ActivityType[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [acts, t] = await Promise.all([
        participantService.listActivities(userId),
        participantService.listActivityTypes(),
      ]);
      setItems(acts); setTypes(t);
    } catch (e: any) {
      toast({ title: 'Ошибка', description: e?.message || 'Не удалось загрузить активности', variant: 'destructive' });
    } finally { setLoading(false); }
  }, [userId, toast]);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => { setForm(emptyForm); setOpen(true); };
  const openEdit = (a: UserActivity) => {
    setForm({ id: a.id, activity_id: a.activity_id || '', points_earned: a.points_earned ?? 0, notes: a.notes || '', completed_at: a.completed_at ? a.completed_at.slice(0, 16) : '' });
    setOpen(true);
  };

  const save = async () => {
    setSaving(true);
    try {
      const payload = {
        activity_id: form.activity_id || null,
        points_earned: Number(form.points_earned) || 0,
        notes: form.notes || null,
        completed_at: form.completed_at ? new Date(form.completed_at).toISOString() : new Date().toISOString(),
      };
      if (form.id) await participantService.updateActivity(form.id, payload);
      else await participantService.createActivity({ user_id: userId, ...payload, verified: true });
      toast({ title: 'Готово', description: 'Активность сохранена' });
      setOpen(false); load();
    } catch (e: any) {
      toast({ title: 'Ошибка', description: e?.message || 'Не удалось сохранить', variant: 'destructive' });
    } finally { setSaving(false); }
  };

  const remove = async (id: string) => {
    if (!confirm('Удалить запись активности?')) return;
    try { await participantService.deleteActivity(id); toast({ title: 'Удалено' }); load(); }
    catch (e: any) { toast({ title: 'Ошибка', description: e?.message, variant: 'destructive' }); }
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="flex items-center gap-2"><Activity className="w-5 h-5 text-primary" />Активность</CardTitle>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm" className="gap-2" onClick={openCreate}><Plus className="w-4 h-4" />Добавить</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{form.id ? 'Редактировать активность' : 'Новая активность'}</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Тип активности</Label>
                <Select value={form.activity_id} onValueChange={(v) => setForm({ ...form, activity_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Выберите тип" /></SelectTrigger>
                  <SelectContent>{types.map((t) => <SelectItem key={t.id} value={t.id}>{t.name} ({t.category})</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Баллы</Label><Input type="number" value={form.points_earned} onChange={(e) => setForm({ ...form, points_earned: Number(e.target.value) })} /></div>
                <div><Label>Дата</Label><Input type="datetime-local" value={form.completed_at} onChange={(e) => setForm({ ...form, completed_at: e.target.value })} /></div>
              </div>
              <div><Label>Заметки</Label><Textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
            </div>
            <DialogFooter><Button onClick={save} disabled={saving}>{saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}Сохранить</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? <p className="text-muted-foreground text-center py-6">Активностей пока нет</p> : (
          <div className="overflow-x-auto"><Table>
            <TableHeader><TableRow><TableHead>Дата</TableHead><TableHead>Активность</TableHead><TableHead>Баллы</TableHead><TableHead>Статус</TableHead><TableHead className="text-right">Действия</TableHead></TableRow></TableHeader>
            <TableBody>
              {items.map((a) => (
                <TableRow key={a.id}>
                  <TableCell className="text-sm">{format(new Date(a.completed_at), 'dd.MM.yyyy', { locale: ru })}</TableCell>
                  <TableCell>{a.activities?.name || '—'}</TableCell>
                  <TableCell>{a.points_earned ?? 0}</TableCell>
                  <TableCell><Badge variant={a.verified ? 'default' : 'secondary'}>{a.verified ? 'Подтверждено' : 'Не подтв.'}</Badge></TableCell>
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
  );
};
