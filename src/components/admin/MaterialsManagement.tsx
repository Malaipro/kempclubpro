import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Plus, Pencil, Trash2, BookOpen, Lock, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface Material {
  id: string;
  title: string;
  block_type: string;
  theme: string | null;
  content: string | null;
  file_url: string | null;
  link_url: string | null;
  status: 'open' | 'closed';
  stream_id: string | null;
  available_to: 'all' | 'intensive' | 'club';
  open_date: string | null;
  sort_order: number;
  is_active: boolean;
}

interface Stream { id: string; name: string; }

const emptyForm: Partial<Material> = {
  title: '',
  block_type: 'lecture',
  theme: '',
  content: '',
  file_url: '',
  link_url: '',
  status: 'open',
  stream_id: null,
  available_to: 'all',
  sort_order: 0,
  is_active: true,
};

export const MaterialsManagement: React.FC = () => {
  const { user } = useAuth();
  const [materials, setMaterials] = useState<Material[]>([]);
  const [streams, setStreams] = useState<Stream[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<Partial<Material>>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [matRes, streamRes] = await Promise.all([
        (supabase as any).from('materials').select('*').order('sort_order', { ascending: true }).order('created_at', { ascending: false }),
        supabase.from('intensive_streams').select('id, name').order('start_date', { ascending: false }),
      ]);
      if (matRes.error) throw matRes.error;
      setMaterials((matRes.data || []) as Material[]);
      setStreams((streamRes.data || []) as Stream[]);
    } catch (e: any) {
      console.error(e);
      setError('Не удалось загрузить материалы');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setForm(emptyForm);
    setEditingId(null);
    setOpen(true);
  };

  const openEdit = (m: Material) => {
    setForm({ ...m });
    setEditingId(m.id);
    setOpen(true);
  };

  const save = async () => {
    if (!form.title?.trim()) {
      toast.error('Укажите заголовок');
      return;
    }
    setSaving(true);
    try {
      const payload: any = {
        title: form.title?.trim(),
        block_type: form.block_type || 'lecture',
        theme: form.theme || null,
        content: form.content || null,
        file_url: form.file_url || null,
        link_url: form.link_url || null,
        status: form.status || 'open',
        stream_id: form.stream_id || null,
        available_to: form.available_to || 'all',
        sort_order: Number(form.sort_order) || 0,
        is_active: form.is_active ?? true,
      };
      if (editingId) {
        const { error } = await (supabase as any).from('materials').update(payload).eq('id', editingId);
        if (error) throw error;
        toast.success('Материал обновлён');
      } else {
        payload.created_by = user?.id || null;
        const { error } = await (supabase as any).from('materials').insert(payload);
        if (error) throw error;
        toast.success('Материал создан');
      }
      setOpen(false);
      load();
    } catch (e: any) {
      console.error(e);
      toast.error('Ошибка сохранения');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    if (!confirm('Удалить материал?')) return;
    try {
      const { error } = await (supabase as any).from('materials').delete().eq('id', id);
      if (error) throw error;
      toast.success('Удалено');
      load();
    } catch (e: any) {
      console.error(e);
      toast.error('Ошибка удаления');
    }
  };

  const streamName = (id: string | null) =>
    id ? (streams.find(s => s.id === id)?.name || 'Поток') : 'Все потоки';

  const availableLabel: Record<string, string> = {
    all: 'Всем', intensive: 'Интенсив', club: 'Клуб',
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <BookOpen className="w-6 h-6" /> Материалы
          </h2>
          <p className="text-muted-foreground text-sm">Управление учебными материалами кабинета</p>
        </div>
        <Button onClick={openCreate}><Plus className="w-4 h-4 mr-1" /> Добавить</Button>
      </div>

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      ) : error ? (
        <Card className="border-destructive/40">
          <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
            <AlertCircle className="w-8 h-8 text-destructive" />
            <p className="text-muted-foreground">{error}</p>
            <Button variant="outline" onClick={load}>Повторить</Button>
          </CardContent>
        </Card>
      ) : materials.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <BookOpen className="w-10 h-10 text-muted-foreground" />
            <p className="text-muted-foreground">Материалов пока нет</p>
            <Button onClick={openCreate}><Plus className="w-4 h-4 mr-1" /> Создать первый</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {materials.map((m) => (
            <Card key={m.id} className={!m.is_active ? 'opacity-60' : ''}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base">{m.title}</CardTitle>
                  <div className="flex gap-1 shrink-0">
                    <Button size="icon" variant="ghost" onClick={() => openEdit(m)}><Pencil className="w-4 h-4" /></Button>
                    <Button size="icon" variant="ghost" onClick={() => remove(m.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2 text-xs">
                <Badge variant="outline">{m.block_type}</Badge>
                <Badge variant={m.status === 'closed' ? 'secondary' : 'default'}>
                  {m.status === 'closed' ? <><Lock className="w-3 h-3 mr-1" />Закрыто</> : 'Открыто'}
                </Badge>
                <Badge variant="outline">{availableLabel[m.available_to]}</Badge>
                <Badge variant="outline">{streamName(m.stream_id)}</Badge>
                {!m.is_active && <Badge variant="secondary">Не активен</Badge>}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Редактировать материал' : 'Новый материал'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Заголовок *</Label>
              <Input value={form.title || ''} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>
            <div>
              <Label>Тип блока</Label>
              <Input value={form.block_type || ''} onChange={(e) => setForm({ ...form, block_type: e.target.value })} placeholder="lecture, video, doc..." />
            </div>
            <div>
              <Label>Тема</Label>
              <Input value={form.theme || ''} onChange={(e) => setForm({ ...form, theme: e.target.value })} />
            </div>
            <div>
              <Label>Содержание</Label>
              <Textarea rows={4} value={form.content || ''} onChange={(e) => setForm({ ...form, content: e.target.value })} />
            </div>
            <div>
              <Label>Ссылка на файл (file_url)</Label>
              <Input value={form.file_url || ''} onChange={(e) => setForm({ ...form, file_url: e.target.value })} />
            </div>
            <div>
              <Label>Ссылка (link_url)</Label>
              <Input value={form.link_url || ''} onChange={(e) => setForm({ ...form, link_url: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Статус</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as any })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open">Открыт</SelectItem>
                    <SelectItem value="closed">Закрыт</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Кому доступно</Label>
                <Select value={form.available_to} onValueChange={(v) => setForm({ ...form, available_to: v as any })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Всем</SelectItem>
                    <SelectItem value="intensive">Интенсив</SelectItem>
                    <SelectItem value="club">Клуб</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Поток</Label>
              <Select
                value={form.stream_id || 'all'}
                onValueChange={(v) => setForm({ ...form, stream_id: v === 'all' ? null : v })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все потоки</SelectItem>
                  {streams.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3 items-end">
              <div>
                <Label>Порядок</Label>
                <Input type="number" value={form.sort_order ?? 0} onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })} />
              </div>
              <div className="flex items-center gap-2 pb-2">
                <Switch checked={form.is_active ?? true} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
                <Label>Активен</Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Отмена</Button>
            <Button onClick={save} disabled={saving}>{saving ? 'Сохранение...' : 'Сохранить'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
