import React, { useCallback, useEffect, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { participantService, CrashTest } from '@/services/participantService';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ShieldAlert, Plus, Loader2, Pencil, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

interface Props { userId: string; }

const TYPES = [
  { value: 'bjj', label: 'БЖЖ' },
  { value: 'kickboxing', label: 'Кикбоксинг' },
  { value: 'ofp', label: 'ОФП' },
];

const emptyForm = { id: '', test_type: 'bjj', points_earned: 6, passed: false, verified: true, notes: '', test_date: '' };

export const ParticipantCrashTestsTab: React.FC<Props> = ({ userId }) => {
  const { toast } = useToast();
  const [items, setItems] = useState<CrashTest[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const load = useCallback(async () => {
    setLoading(true);
    try { setItems(await participantService.listCrashTests(userId)); }
    catch (e: any) { toast({ title: 'Ошибка', description: e?.message || 'Не удалось загрузить краш-тесты', variant: 'destructive' }); }
    finally { setLoading(false); }
  }, [userId, toast]);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => { setForm(emptyForm); setOpen(true); };
  const openEdit = (c: CrashTest) => {
    setForm({ id: c.id, test_type: c.test_type, points_earned: c.points_earned, passed: !!c.passed, verified: !!c.verified, notes: c.notes || '', test_date: c.test_date ? c.test_date.slice(0, 16) : '' });
    setOpen(true);
  };

  const save = async () => {
    setSaving(true);
    try {
      const base = { test_type: form.test_type, points_earned: Number(form.points_earned) || 0, passed: form.passed, verified: form.verified, notes: form.notes || null, test_date: form.test_date ? new Date(form.test_date).toISOString() : new Date().toISOString() };
      if (form.id) await participantService.updateCrashTest(form.id, base);
      else await participantService.createCrashTest({ user_id: userId, ...base });
      toast({ title: 'Готово', description: 'Краш-тест сохранён' });
      setOpen(false); load();
    } catch (e: any) { toast({ title: 'Ошибка', description: e?.message || 'Не удалось сохранить', variant: 'destructive' }); }
    finally { setSaving(false); }
  };

  const remove = async (id: string) => {
    if (!confirm('Удалить краш-тест?')) return;
    try { await participantService.deleteCrashTest(id); toast({ title: 'Удалено' }); load(); }
    catch (e: any) { toast({ title: 'Ошибка', description: e?.message, variant: 'destructive' }); }
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="flex items-center gap-2"><ShieldAlert className="w-5 h-5 text-primary" />Краш-тесты</CardTitle>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm" className="gap-2" onClick={openCreate}><Plus className="w-4 h-4" />Добавить</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{form.id ? 'Редактировать краш-тест' : 'Новый краш-тест'}</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Дисциплина</Label>
                <Select value={form.test_type} onValueChange={(v) => setForm({ ...form, test_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Баллы</Label><Input type="number" value={form.points_earned} onChange={(e) => setForm({ ...form, points_earned: Number(e.target.value) })} /></div>
              <div className="flex items-center justify-between"><Label>Сдан</Label><Switch checked={form.passed} onCheckedChange={(v) => setForm({ ...form, passed: v })} /></div>
              <div className="flex items-center justify-between"><Label>Подтверждён</Label><Switch checked={form.verified} onCheckedChange={(v) => setForm({ ...form, verified: v })} /></div>
              <div><Label>Дата</Label><Input type="datetime-local" value={form.test_date} onChange={(e) => setForm({ ...form, test_date: e.target.value })} /></div>
              <div><Label>Заметки</Label><Textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
            </div>
            <DialogFooter><Button onClick={save} disabled={saving}>{saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}Сохранить</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? <p className="text-muted-foreground text-center py-6">Краш-тестов нет</p> : (
          <div className="overflow-x-auto"><Table>
            <TableHeader><TableRow><TableHead>Дата</TableHead><TableHead>Дисциплина</TableHead><TableHead>Баллы</TableHead><TableHead>Статус</TableHead><TableHead className="text-right">Действия</TableHead></TableRow></TableHeader>
            <TableBody>
              {items.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="text-sm">{format(new Date(c.test_date), 'dd.MM.yyyy', { locale: ru })}</TableCell>
                  <TableCell>{TYPES.find((t) => t.value === c.test_type)?.label || c.test_type}</TableCell>
                  <TableCell>{c.points_earned}</TableCell>
                  <TableCell className="flex gap-1">
                    <Badge variant={c.passed ? 'default' : 'secondary'}>{c.passed ? 'Сдан' : 'Не сдан'}</Badge>
                    {c.verified && <Badge variant="outline">✓</Badge>}
                  </TableCell>
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
