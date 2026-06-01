import React, { useCallback, useEffect, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { participantService, CooperResult } from '@/services/participantService';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Timer, Plus, Loader2, Pencil, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

interface Props { userId: string; }

const PHASE_LABELS: Record<string, string> = {
  before_stream: 'До интенсива',
  during_stream: 'Во время интенсива',
  after_stream: 'После интенсива',
};

const emptyForm = { id: '', total_minutes: 0, total_seconds: 0, fitness_level: '', test_phase: 'during_stream', notes: '', test_date: '' };

export const ParticipantCooperTab: React.FC<Props> = ({ userId }) => {
  const { toast } = useToast();
  const [items, setItems] = useState<CooperResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const load = useCallback(async () => {
    setLoading(true);
    try { setItems(await participantService.listCooper(userId)); }
    catch (e: any) { toast({ title: 'Ошибка', description: e?.message || 'Не удалось загрузить тесты Купера', variant: 'destructive' }); }
    finally { setLoading(false); }
  }, [userId, toast]);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => { setForm(emptyForm); setOpen(true); };
  const openEdit = (c: CooperResult) => {
    setForm({ id: c.id, total_minutes: c.total_minutes ?? 0, total_seconds: c.total_seconds ?? 0, fitness_level: c.fitness_level || '', test_phase: c.test_phase || 'during_stream', notes: c.notes || '', test_date: c.test_date ? c.test_date.slice(0, 16) : '' });
    setOpen(true);
  };

  const save = async () => {
    setSaving(true);
    try {
      const m = Number(form.total_minutes) || 0; const s = Number(form.total_seconds) || 0;
      const base = { total_minutes: m, total_seconds: s, total_time: m * 60 + s, fitness_level: form.fitness_level || null, test_phase: form.test_phase, notes: form.notes || null, test_date: form.test_date ? new Date(form.test_date).toISOString() : new Date().toISOString() };
      if (form.id) await participantService.updateCooper(form.id, base);
      else await participantService.createCooper({ user_id: userId, ...base, verified: true });
      toast({ title: 'Готово', description: 'Тест сохранён' });
      setOpen(false); load();
    } catch (e: any) { toast({ title: 'Ошибка', description: e?.message || 'Не удалось сохранить', variant: 'destructive' }); }
    finally { setSaving(false); }
  };

  const remove = async (id: string) => {
    if (!confirm('Удалить результат теста Купера?')) return;
    try { await participantService.deleteCooper(id); toast({ title: 'Удалено' }); load(); }
    catch (e: any) { toast({ title: 'Ошибка', description: e?.message, variant: 'destructive' }); }
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="flex items-center gap-2"><Timer className="w-5 h-5 text-primary" />Тесты Купера</CardTitle>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm" className="gap-2" onClick={openCreate}><Plus className="w-4 h-4" />Добавить</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{form.id ? 'Редактировать тест' : 'Новый тест Купера'}</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Минуты</Label><Input type="number" value={form.total_minutes} onChange={(e) => setForm({ ...form, total_minutes: Number(e.target.value) })} /></div>
                <div><Label>Секунды</Label><Input type="number" value={form.total_seconds} onChange={(e) => setForm({ ...form, total_seconds: Number(e.target.value) })} /></div>
              </div>
              <div><Label>Этап</Label>
                <Select value={form.test_phase} onValueChange={(v) => setForm({ ...form, test_phase: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{Object.entries(PHASE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Уровень подготовки</Label><Input value={form.fitness_level} onChange={(e) => setForm({ ...form, fitness_level: e.target.value })} placeholder="excellent / good / ..." /></div>
              <div><Label>Дата</Label><Input type="datetime-local" value={form.test_date} onChange={(e) => setForm({ ...form, test_date: e.target.value })} /></div>
              <div><Label>Заметки</Label><Textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
            </div>
            <DialogFooter><Button onClick={save} disabled={saving}>{saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}Сохранить</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? <p className="text-muted-foreground text-center py-6">Тесты не пройдены</p> : (
          <div className="overflow-x-auto"><Table>
            <TableHeader><TableRow><TableHead>Дата</TableHead><TableHead>Этап</TableHead><TableHead>Время</TableHead><TableHead>Уровень</TableHead><TableHead className="text-right">Действия</TableHead></TableRow></TableHeader>
            <TableBody>
              {items.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="text-sm">{format(new Date(c.test_date), 'dd.MM.yyyy', { locale: ru })}</TableCell>
                  <TableCell className="text-sm">{PHASE_LABELS[c.test_phase || ''] || '—'}</TableCell>
                  <TableCell className="font-medium">{(c.total_minutes ?? 0)}:{(c.total_seconds ?? 0).toString().padStart(2, '0')}</TableCell>
                  <TableCell><Badge variant={c.verified ? 'default' : 'secondary'}>{c.fitness_level || 'Не определён'}</Badge></TableCell>
                  <TableCell className="text-right whitespace-nowrap">
                    <Button size="icon" variant="ghost" onClick={() => openEdit(c)}><Pencil className="w-4 h-4" /></Button>
                    <Button size="icon" variant="ghost" onClick={() => remove(c.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
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
