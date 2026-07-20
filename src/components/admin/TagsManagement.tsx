import React, { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Tag as TagIcon, Plus, Trash2, Loader2, Save, X, Edit2 } from 'lucide-react';

interface Tag {
  id: string;
  name: string;
  color: string | null;
  created_at: string;
}

interface TagUsage {
  tag_id: string;
  count: number;
}

const PALETTE = ['#f59e0b', '#10b981', '#ef4444', '#3b82f6', '#8b5cf6', '#0ea5e9', '#22c55e', '#dc2626', '#6366f1', '#ec4899'];

export const TagsManagement: React.FC = () => {
  const { toast } = useToast();
  const [tags, setTags] = useState<Tag[]>([]);
  const [usage, setUsage] = useState<Map<string, number>>(new Map());
  const [loading, setLoading] = useState(true);

  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState<string>(PALETTE[0]);
  const [creating, setCreating] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState<string>(PALETTE[0]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [tagsRes, mapRes] = await Promise.all([
        supabase.from('participant_tags').select('*').order('name'),
        supabase.from('profile_tags').select('tag_id'),
      ]);
      if (tagsRes.error) throw tagsRes.error;
      if (mapRes.error) throw mapRes.error;
      setTags((tagsRes.data || []) as Tag[]);
      const counts = new Map<string, number>();
      (mapRes.data || []).forEach((r: any) => {
        counts.set(r.tag_id, (counts.get(r.tag_id) || 0) + 1);
      });
      setUsage(counts);
    } catch (e: any) {
      toast({ title: 'Ошибка', description: e?.message || 'Не удалось загрузить теги', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const createTag = async () => {
    const name = newName.trim();
    if (!name) {
      toast({ title: 'Введите название', variant: 'destructive' });
      return;
    }
    setCreating(true);
    try {
      const { data, error } = await supabase
        .from('participant_tags')
        .insert([{ name, color: newColor }])
        .select('*')
        .single();
      if (error) throw error;
      setTags((prev) => [...prev, data as Tag].sort((a, b) => a.name.localeCompare(b.name)));
      setNewName('');
      toast({ title: 'Тег создан', description: name });
    } catch (e: any) {
      toast({ title: 'Ошибка', description: e?.message || 'Не удалось создать тег', variant: 'destructive' });
    } finally {
      setCreating(false);
    }
  };

  const startEdit = (t: Tag) => {
    setEditingId(t.id);
    setEditName(t.name);
    setEditColor(t.color || PALETTE[0]);
  };

  const saveEdit = async () => {
    if (!editingId) return;
    const name = editName.trim();
    if (!name) return;
    try {
      const { error } = await supabase
        .from('participant_tags')
        .update({ name, color: editColor })
        .eq('id', editingId);
      if (error) throw error;
      setTags((prev) => prev.map((t) => (t.id === editingId ? { ...t, name, color: editColor } : t))
        .sort((a, b) => a.name.localeCompare(b.name)));
      setEditingId(null);
      toast({ title: 'Тег обновлён' });
    } catch (e: any) {
      toast({ title: 'Ошибка', description: e?.message || 'Не удалось обновить тег', variant: 'destructive' });
    }
  };

  const deleteTag = async (t: Tag) => {
    const count = usage.get(t.id) || 0;
    const message = count > 0
      ? `Удалить тег «${t.name}»? Он присвоен ${count} участникам — присвоения также будут удалены.`
      : `Удалить тег «${t.name}»?`;
    if (!confirm(message)) return;
    try {
      // Удаляем присвоения (на случай если нет ON DELETE CASCADE)
      await supabase.from('profile_tags').delete().eq('tag_id', t.id);
      const { error } = await supabase.from('participant_tags').delete().eq('id', t.id);
      if (error) throw error;
      setTags((prev) => prev.filter((x) => x.id !== t.id));
      setUsage((prev) => {
        const next = new Map(prev);
        next.delete(t.id);
        return next;
      });
      toast({ title: 'Тег удалён' });
    } catch (e: any) {
      toast({ title: 'Ошибка', description: e?.message || 'Не удалось удалить тег', variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TagIcon className="w-5 h-5 text-primary" />
            Новый тег
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-col sm:flex-row gap-3 items-end">
            <div className="flex-1 w-full">
              <Label>Название</Label>
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Например: VIP"
                onKeyDown={(e) => e.key === 'Enter' && createTag()}
              />
            </div>
            <div>
              <Label>Цвет</Label>
              <div className="flex gap-1 flex-wrap">
                {PALETTE.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setNewColor(c)}
                    className={`w-8 h-8 rounded-full border-2 transition ${newColor === c ? 'border-foreground scale-110' : 'border-transparent'}`}
                    style={{ backgroundColor: c }}
                    aria-label={c}
                  />
                ))}
              </div>
            </div>
            <Button onClick={createTag} disabled={creating}>
              {creating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
              Создать
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Все теги ({tags.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : tags.length === 0 ? (
            <p className="text-muted-foreground text-center py-6">Тегов пока нет</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Тег</TableHead>
                    <TableHead>Цвет</TableHead>
                    <TableHead>Использований</TableHead>
                    <TableHead className="text-right">Действия</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tags.map((t) => {
                    const isEditing = editingId === t.id;
                    return (
                      <TableRow key={t.id}>
                        <TableCell>
                          {isEditing ? (
                            <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
                          ) : (
                            <Badge style={{ backgroundColor: t.color || '#6b7280', color: '#fff' }}>
                              {t.name}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {isEditing ? (
                            <div className="flex gap-1 flex-wrap">
                              {PALETTE.map((c) => (
                                <button
                                  key={c}
                                  type="button"
                                  onClick={() => setEditColor(c)}
                                  className={`w-6 h-6 rounded-full border-2 ${editColor === c ? 'border-foreground' : 'border-transparent'}`}
                                  style={{ backgroundColor: c }}
                                />
                              ))}
                            </div>
                          ) : (
                            <span
                              className="inline-block w-6 h-6 rounded-full"
                              style={{ backgroundColor: t.color || '#6b7280' }}
                            />
                          )}
                        </TableCell>
                        <TableCell>{usage.get(t.id) || 0}</TableCell>
                        <TableCell className="text-right">
                          {isEditing ? (
                            <div className="flex gap-1 justify-end">
                              <Button size="sm" variant="outline" onClick={saveEdit}>
                                <Save className="w-4 h-4" />
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>
                                <X className="w-4 h-4" />
                              </Button>
                            </div>
                          ) : (
                            <div className="flex gap-1 justify-end">
                              <Button size="sm" variant="outline" onClick={() => startEdit(t)}>
                                <Edit2 className="w-4 h-4" />
                              </Button>
                              <Button size="sm" variant="outline" className="text-destructive" onClick={() => deleteTag(t)}>
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
