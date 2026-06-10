import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Gift, Coins, Image as ImageIcon } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

interface Reward {
  id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  cost_coins: number;
  stock: number | null;
}

interface MyRequest {
  id: string;
  status: string;
  cost_coins: number;
  admin_comment: string | null;
  created_at: string;
  reward: { title: string } | null;
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

interface RewardsShopProps {
  /** Только club_resident может оформлять заявки. intensive_active видит каталог в режиме просмотра. */
  canRedeem?: boolean;
}

export const RewardsShop: React.FC<RewardsShopProps> = ({ canRedeem = true }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [myRequests, setMyRequests] = useState<MyRequest[]>([]);
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [orderDialog, setOrderDialog] = useState<Reward | null>(null);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchAll = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [rewardsRes, reqsRes, balanceRes] = await Promise.all([
        supabase.from('rewards').select('*').eq('is_active', true).order('sort_order'),
        supabase
          .from('reward_requests')
          .select('id, status, cost_coins, admin_comment, created_at, reward:rewards(title)')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false }),
        supabase.rpc('get_user_coin_balance', { p_user_id: user.id }),
      ]);
      if (rewardsRes.error) throw rewardsRes.error;
      if (reqsRes.error) throw reqsRes.error;
      if (balanceRes.error) throw balanceRes.error;
      setRewards(rewardsRes.data || []);
      setMyRequests((reqsRes.data || []) as any);
      setBalance(Number(balanceRes.data) || 0);
    } catch (e: any) {
      toast({ title: 'Ошибка', description: e.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, [user?.id]);

  const handleOrder = async () => {
    if (!orderDialog || !canRedeem) return;
    setSubmitting(true);
    try {
      const { error } = await supabase.rpc('create_reward_request', {
        p_reward_id: orderDialog.id,
        p_user_comment: comment.trim() || undefined,
      });
      if (error) throw error;
      toast({ title: 'Заявка отправлена', description: 'Ожидайте подтверждения админа' });
      setOrderDialog(null);
      setComment('');
      fetchAll();
    } catch (e: any) {
      toast({ title: 'Ошибка', description: e.message, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Gift className="w-6 h-6 text-primary" />
          Награды
        </h1>
        <Badge variant="secondary" className="text-base px-3 py-1.5 flex items-center gap-1.5">
          <Coins className="w-4 h-4" />
          Баланс: {balance}
        </Badge>
      </div>

      {!canRedeem && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="py-3 text-sm text-muted-foreground">
            Тратить коины можно после перехода в резиденты клуба. Каталог доступен для просмотра, коины продолжают начисляться и сохранятся.
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="text-muted-foreground">Загрузка…</div>
      ) : rewards.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Награды скоро появятся
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {rewards.map((r) => {
            const noStock = r.stock !== null && r.stock <= 0;
            const canAfford = balance >= r.cost_coins;
            return (
              <Card key={r.id}>
                <CardContent className="p-4 space-y-3">
                  {r.image_url ? (
                    <img src={r.image_url} alt={r.title} className="w-full h-40 object-cover rounded" />
                  ) : (
                    <div className="w-full h-40 bg-muted rounded flex items-center justify-center">
                      <ImageIcon className="w-8 h-8 text-muted-foreground" />
                    </div>
                  )}
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-semibold">{r.title}</h3>
                    <Badge variant="secondary" className="flex items-center gap-1 shrink-0">
                      <Coins className="w-3 h-3" />
                      {r.cost_coins}
                    </Badge>
                  </div>
                  {r.description && (
                    <p className="text-sm text-muted-foreground line-clamp-3">{r.description}</p>
                  )}
                  {r.stock !== null && (
                    <div className="text-xs text-muted-foreground">Осталось: {r.stock}</div>
                  )}
                  <Button
                    className="w-full"
                    disabled={!canRedeem || noStock || !canAfford}
                    onClick={() => setOrderDialog(r)}
                  >
                    {!canRedeem
                      ? 'Только для резидентов'
                      : noStock
                      ? 'Закончилась'
                      : !canAfford
                      ? 'Недостаточно коинов'
                      : 'Заказать'}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {myRequests.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-3">Мои заявки</h2>
          <div className="space-y-2">
            {myRequests.map((req) => (
              <Card key={req.id}>
                <CardContent className="p-3 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="font-medium">{req.reward?.title || 'Награда'}</div>
                    <div className="text-xs text-muted-foreground">
                      {req.cost_coins} коинов · {new Date(req.created_at).toLocaleDateString('ru-RU')}
                    </div>
                    {req.admin_comment && (
                      <div className="text-xs text-muted-foreground mt-1">Админ: {req.admin_comment}</div>
                    )}
                  </div>
                  <Badge className={statusColors[req.status]}>{statusLabels[req.status]}</Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      <Dialog open={!!orderDialog} onOpenChange={(o) => !o && setOrderDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Заказать «{orderDialog?.title}»</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="text-sm">
              Стоимость: <strong>{orderDialog?.cost_coins} коинов</strong>
              <br />
              Баланс после: <strong>{balance - (orderDialog?.cost_coins || 0)}</strong>
            </div>
            <div>
              <label className="text-sm font-medium">Комментарий (необязательно)</label>
              <Textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={3} />
            </div>
            <div className="text-xs text-muted-foreground">
              Коины будут зарезервированы сразу. При отклонении заявки они вернутся на баланс.
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOrderDialog(null)}>
              Отмена
            </Button>
            <Button onClick={handleOrder} disabled={submitting}>
              Подтвердить заказ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
