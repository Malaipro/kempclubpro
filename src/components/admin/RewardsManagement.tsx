import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Gift, Plus, Pencil, Trash2, Coins, Image as ImageIcon } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Reward {
  id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  cost_coins: number;
  stock: number | null;
  is_active: boolean;
  sort_order: number;
}

interface RewardRequest {
  id: string;
  user_id: string;
  reward_id: string;
  cost_coins: number;
  status: string;
  user_comment: string | null;
  admin_comment: string | null;
  created_at: string;
  reward?: { title: string };
  profile?: { display_name: string | null; first_name: string | null; last_name: string | null };
}

const statusLabels: Record<string, string> = {
  pending: 'Ожидает',
  approved: 'Одобрена',
  rejected: 'Отклонена',
  fulfilled: 'Выдана',
  cancelled: 'Отменена',
};

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  approved: 'bg-blue-100 text-blue-800',
  rejected: 'bg-red-100 text-red-800',
  fulfilled: 'bg-green-100 text-green-800',
  cancelled: 'bg-gray-100 text-gray-800',
};

export const RewardsManagement: React.FC = () => {
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [requests, setRequests] = useState<RewardRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Reward | null>(null);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState({
    title: '',
    description: '',
    image_url: '',
    cost_coins: 100,
    stock: '' as string | number,
    is_active: true,
    sort_order: 0,
  });
  const { toast } = useToast();

  const fetchData = async () => {
    setLoading(true);
    try {
      const [rewardsRes, requestsRes] = await Promise.all([
        supabase.from('rewards').select('*').order('sort_order').order('created_at', { ascending: false }),
        supabase.from('reward_requests').select('*, reward:rewards(title)').order('created_at', { ascending: false }),
      ]);
      if (rewardsRes.error) throw rewardsRes.error;
      if (requestsRes.error) throw requestsRes.error;

      setRewards(rewardsRes.data || []);

      // Fetch profiles separately
      const userIds = [...new Set((requestsRes.data || []).map((r: any) => r.user_id))];
      let profilesMap: Record<string, any> = {};
      if (userIds.length > 0) {
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('user_id, display_name, first_name, last_name')
          .in('user_id', userIds);
        profilesMap = (profilesData || []).reduce((acc: any, p: any) => {
          acc[p.user_id] = p;
          return acc;
        }, {});
      }
      setRequests(
        (requestsRes.data || []).map((r: any) => ({ ...r, profile: profilesMap[r.user_id] }))
      );
    } catch (e: any) {
      toast({ title: 'Ошибка', description: e.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openNew = () => {
    setEditing(null);
    setForm({ title: '', description: '', image_url: '', cost_coins: 100, stock: '', is_active: true, sort_order: 0 });
    setDialogOpen(true);
  };

  const openEdit = (r: Reward) => {
    setEditing(r);
    setForm({
      title: r.title,
      description: r.description || '',
      image_url: r.image_url || '',
      cost_coins: r.cost_coins,
      stock: r.stock ?? '',
      is_active: r.is_active,
      sort_order: r.sort_order,
    });
    setDialogOpen(true);
  };

  const handleUpload = async (file: File) => {
    setUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const fileName = `rewards/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await supabase.storage.from('content').upload(fileName, file, { upsert: false });
      if (error) throw error;
      const { data } = supabase.storage.from('content').getPublicUrl(fileName);
      setForm((f) => ({ ...f, image_url: data.publicUrl }));
      toast({ title: 'Фото загружено' });
    } catch (e: any) {
      toast({ title: 'Ошибка загрузки', description: e.message, variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!form.title.trim() || form.cost_coins < 0) {
      toast({ title: 'Заполните название и стоимость', variant: 'destructive' });
      return;
    }
    try {
      const payload = {
        title: form.title.trim(),
        description: form.description.trim() || null,
        image_url: form.image_url || null,
        cost_coins: Number(form.cost_coins),
        stock: form.stock === '' ? null : Number(form.stock),
        is_active: form.is_active,
        sort_order: Number(form.sort_order) || 0,
      };
      if (editing) {
        const { error } = await supabase.from('rewards').update(payload).eq('id', editing.id);
        if (error) throw error;
      } else {
        const { data: { user } } = await supabase.auth.getUser();
        const { error } = await supabase.from('rewards').insert({ ...payload, created_by: user?.id });
        if (error) throw error;
      }
      toast({ title: editing ? 'Награда обновлена' : 'Награда создана' });
      setDialogOpen(false);
      fetchData();
    } catch (e: any) {
      toast({ title: 'Ошибка', description: e.message, variant: 'destructive' });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Удалить награду? Если есть заявки — она будет защищена FK.')) return;
    try {
      const { error } = await supabase.from('rewards').delete().eq('id', id);
      if (error) throw error;
      toast({ title: 'Удалено' });
      fetchData();
    } catch (e: any) {
      toast({ title: 'Ошибка', description: e.message, variant: 'destructive' });
    }
  };

  const handleReview = async (requestId: string, newStatus: string) => {
    const comment = prompt('Комментарий (опционально):') || undefined;
    try {
      const { error } = await supabase.rpc('review_reward_request', {
        p_request_id: requestId,
        p_new_status: newStatus,
        p_admin_comment: comment,
      });
      if (error) throw error;
      toast({ title: 'Обновлено' });
      fetchData();
    } catch (e: any) {
      toast({ title: 'Ошибка', description: e.message, variant: 'destructive' });
    }
  };

  const getName = (p?: RewardRequest['profile']) =>
    p?.display_name || `${p?.first_name || ''} ${p?.last_name || ''}`.trim() || 'Участник';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Gift className="w-6 h-6 text-primary" />
          Награды
        </h1>
        <Button onClick={openNew}>
          <Plus className="w-4 h-4 mr-2" />
          Добавить награду
        </Button>
      </div>

      <Tabs defaultValue="catalog">
        <TabsList>
          <TabsTrigger value="catalog">Каталог ({rewards.length})</TabsTrigger>
          <TabsTrigger value="requests">
            Заявки ({requests.filter((r) => r.status === 'pending').length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="catalog" className="mt-4">
          {loading ? (
            <div className="text-muted-foreground">Загрузка…</div>
          ) : rewards.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                Наград пока нет. Создайте первую.
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {rewards.map((r) => (
                <Card key={r.id} className={!r.is_active ? 'opacity-60' : ''}>
                  <CardContent className="p-4 space-y-3">
                    {r.image_url ? (
                      <img src={r.image_url} alt={r.title} className="w-full h-40 object-cover rounded" />
                    ) : (
                      <div className="w-full h-40 bg-muted rounded flex items-center justify-center">
                        <ImageIcon className="w-8 h-8 text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold">{r.title}</h3>
                      <Badge variant="secondary" className="flex items-center gap-1">
                        <Coins className="w-3 h-3" />
                        {r.cost_coins}
                      </Badge>
                    </div>
                    {r.description && <p className="text-sm text-muted-foreground line-clamp-2">{r.description}</p>}
                    <div className="text-xs text-muted-foreground">
                      Остаток: {r.stock ?? '∞'} · {r.is_active ? 'Активна' : 'Скрыта'}
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => openEdit(r)}>
                        <Pencil className="w-3 h-3 mr-1" /> Изменить
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => handleDelete(r.id)}>
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="requests" className="mt-4">
          {requests.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">Заявок нет</CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {requests.map((req) => (
                <Card key={req.id}>
                  <CardContent className="p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="font-semibold">{getName(req.profile)}</div>
                        <div className="text-sm">
                          <span className="font-medium">{req.reward?.title}</span> · {req.cost_coins} коинов
                        </div>
                        {req.user_comment && (
                          <div className="text-xs text-muted-foreground">Комм: {req.user_comment}</div>
                        )}
                        {req.admin_comment && (
                          <div className="text-xs text-muted-foreground">Админ: {req.admin_comment}</div>
                        )}
                        <div className="text-xs text-muted-foreground">
                          {new Date(req.created_at).toLocaleString('ru-RU')}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <Badge className={statusColors[req.status]}>{statusLabels[req.status]}</Badge>
                        {req.status === 'pending' && (
                          <div className="flex gap-2">
                            <Button size="sm" onClick={() => handleReview(req.id, 'approved')}>
                              Одобрить
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => handleReview(req.id, 'rejected')}>
                              Отклонить
                            </Button>
                          </div>
                        )}
                        {req.status === 'approved' && (
                          <Button size="sm" onClick={() => handleReview(req.id, 'fulfilled')}>
                            Отметить выданной
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? 'Редактировать награду' : 'Новая награда'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Название *</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>
            <div>
              <Label>Описание</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={3}
              />
            </div>
            <div>
              <Label>Фото</Label>
              <Input
                type="file"
                accept="image/*"
                onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])}
                disabled={uploading}
              />
              {form.image_url && (
                <img src={form.image_url} alt="" className="mt-2 w-32 h-32 object-cover rounded" />
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Стоимость (коины) *</Label>
                <Input
                  type="number"
                  min={0}
                  value={form.cost_coins}
                  onChange={(e) => setForm({ ...form, cost_coins: Number(e.target.value) })}
                />
              </div>
              <div>
                <Label>Остаток (пусто = ∞)</Label>
                <Input
                  type="number"
                  min={0}
                  value={form.stock}
                  onChange={(e) => setForm({ ...form, stock: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Порядок</Label>
                <Input
                  type="number"
                  value={form.sort_order}
                  onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })}
                />
              </div>
              <div className="flex items-center gap-2 pt-6">
                <Switch
                  checked={form.is_active}
                  onCheckedChange={(v) => setForm({ ...form, is_active: v })}
                />
                <Label>Активна</Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Отмена
            </Button>
            <Button onClick={handleSave} disabled={uploading}>
              Сохранить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
