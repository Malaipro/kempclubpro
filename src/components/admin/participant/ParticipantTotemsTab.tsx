import React, { useCallback, useEffect, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { participantService, UserTotem } from '@/services/participantService';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Award, Plus, Loader2, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

interface Props { userId: string; onChanged?: () => void; }

export const ParticipantTotemsTab: React.FC<Props> = ({ userId, onChanged }) => {
  const { toast } = useToast();
  const [items, setItems] = useState<UserTotem[]>([]);
  const [catalog, setCatalog] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [totemId, setTotemId] = useState('');
  const [notes, setNotes] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [list, cat] = await Promise.all([
        participantService.listUserTotems(userId),
        participantService.listTotemCatalog(),
      ]);
      setItems(list); setCatalog(cat);
    } catch (e: any) { toast({ title: 'Ошибка', description: e?.message || 'Не удалось загрузить тотемы', variant: 'destructive' }); }
    finally { setLoading(false); }
  }, [userId, toast]);

  useEffect(() => { load(); }, [load]);

  const assign = async () => {
    if (!totemId) { toast({ title: 'Выберите тотем', variant: 'destructive' }); return; }
    setSaving(true);
    try {
      await participantService.assignTotem(userId, totemId, notes || null);
      toast({ title: 'Готово', description: 'Тотем назначен' });
      setOpen(false); setTotemId(''); setNotes(''); load(); onChanged?.();
    } catch (e: any) {
      const msg = e?.code === '23505' ? 'Этот тотем уже присвоен участнику' : (e?.message || 'Не удалось назначить тотем');
      toast({ title: 'Ошибка', description: msg, variant: 'destructive' });
    } finally { setSaving(false); }
  };

  const remove = async (id: string) => {
    if (!confirm('Снять тотем у участника?')) return;
    try { await participantService.removeTotem(id); toast({ title: 'Снято' }); load(); onChanged?.(); }
    catch (e: any) { toast({ title: 'Ошибка', description: e?.message, variant: 'destructive' }); }
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="flex items-center gap-2"><Award className="w-5 h-5 text-primary" />Тотемы</CardTitle>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm" className="gap-2"><Plus className="w-4 h-4" />Назначить тотем</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Назначить тотем</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <Select value={totemId} onValueChange={setTotemId}>
                <SelectTrigger><SelectValue placeholder="Выберите тотем" /></SelectTrigger>
                <SelectContent>{catalog.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent>
              </Select>
              <div><Label>Комментарий</Label><Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
            </div>
            <DialogFooter><Button onClick={assign} disabled={saving}>{saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}Назначить</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? <p className="text-muted-foreground text-center py-6">Тотемы пока не присвоены</p> : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {items.map((t) => (
              <div key={t.id} className="p-4 border rounded-lg text-center relative">
                <Award className="w-8 h-8 mx-auto mb-2 text-primary" />
                <p className="font-medium">{t.totems?.name || 'Тотем'}</p>
                <p className="text-sm text-muted-foreground">{t.totems?.discipline || ''}</p>
                <p className="text-xs text-muted-foreground mt-1">{format(new Date(t.assigned_at), 'dd.MM.yyyy', { locale: ru })}</p>
                <Button size="icon" variant="ghost" className="absolute top-1 right-1" onClick={() => remove(t.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
