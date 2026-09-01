import React, { useCallback, useEffect, useState } from 'react';
import { Gift, Coins, ShoppingBag } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

const SERVER_URL = import.meta.env.VITE_TELEGRAM_SERVER_URL ?? 'https://tg.kempclub.pro';
import { proxyStorageUrl } from '@/lib/storageUrl';

// ---------- Types ----------

interface Reward {
  id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  cost_coins: number;
  stock: number | null;
}

type RequestStatus = 'pending' | 'approved' | 'rejected' | 'fulfilled' | 'cancelled';

interface MyRequest {
  id: string;
  status: RequestStatus;
  cost_coins: number;
  admin_comment: string | null;
  created_at: string;
  reward_title: string;
}

interface ShopData {
  rewards: Reward[];
  balance: number;
  my_requests: MyRequest[];
}

type LoadState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ok'; data: ShopData };

type SubmitState = 'idle' | 'loading' | 'error';

interface Props {
  onBack: () => void;
}

const STATUS_META: Record<RequestStatus, { label: string; className: string }> = {
  pending: { label: 'Ожидает', className: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  approved: { label: 'Одобрена', className: 'bg-blue-100 text-blue-800 border-blue-200' },
  rejected: { label: 'Отклонена', className: 'bg-red-100 text-red-800 border-red-200' },
  fulfilled: { label: 'Выдана', className: 'bg-green-100 text-green-800 border-green-200' },
  cancelled: { label: 'Отменена', className: 'bg-gray-100 text-gray-700 border-gray-200' },
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('ru-RU');
}

// ---------- View ----------

export const TelegramShopView: React.FC<Props> = ({ onBack }) => {
  const [loadState, setLoadState] = useState<LoadState>({ status: 'loading' });
  const [openReward, setOpenReward] = useState<Reward | null>(null);
  const [comment, setComment] = useState('');
  const [submitState, setSubmitState] = useState<SubmitState>('idle');

  // Telegram BackButton
  useEffect(() => {
    const btn = window.Telegram?.WebApp?.BackButton;
    if (!btn) return;
    btn.show();
    btn.onClick(onBack);
    return () => {
      btn.offClick(onBack);
      btn.hide();
    };
  }, [onBack]);

  const load = useCallback(async () => {
    const initData = window.Telegram?.WebApp?.initData;
    if (!initData) {
      setLoadState({ status: 'error', message: 'Нет доступа к Telegram WebApp' });
      return;
    }

    try {
      const res = await fetch(`${SERVER_URL}/api/state`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ initData, action: 'get_shop' }),
      });
      const body = await res.json() as { ok: boolean; data?: ShopData; error?: string };
      if (!body.ok || !body.data) throw new Error(body.error ?? 'rpc_error');
      setLoadState({
        status: 'ok',
        data: {
          rewards: body.data.rewards ?? [],
          balance: body.data.balance ?? 0,
          my_requests: body.data.my_requests ?? [],
        },
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Ошибка загрузки';
      setLoadState({ status: 'error', message: msg });
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const purchase = useCallback(async () => {
    const initData = window.Telegram?.WebApp?.initData;
    if (!initData || !openReward || submitState === 'loading') return;

    setSubmitState('loading');
    try {
      const res = await fetch(`${SERVER_URL}/api/state`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          initData,
          action: 'purchase_reward',
          reward_id: openReward.id,
          comment: comment.trim() || undefined,
        }),
      });
      const body = await res.json() as { ok: boolean; data?: { request_id: string }; error?: string };
      if (!body.ok) throw new Error(body.error ?? 'rpc_error');

      setOpenReward(null);
      setComment('');
      setSubmitState('idle');
      setLoadState({ status: 'loading' });
      await load();
    } catch {
      setSubmitState('error');
    }
  }, [openReward, comment, submitState, load]);

  const balance = loadState.status === 'ok' ? loadState.data.balance : 0;

  return (
    <div className="min-h-screen bg-background pb-10">
      {/* Header */}
      <div className="bg-kamp-primary text-white px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShoppingBag className="w-5 h-5" />
          <h1 className="text-lg font-semibold">Магазин наград</h1>
        </div>
        <Badge className="bg-white/15 text-white border-white/20 flex items-center gap-1">
          <Coins className="w-4 h-4" />
          {balance}
        </Badge>
      </div>

      {loadState.status === 'loading' && (
        <div className="p-6 text-center text-muted-foreground">Загрузка…</div>
      )}

      {loadState.status === 'error' && (
        <div className="p-6 text-center text-destructive">
          Не удалось загрузить магазин: {loadState.message}
        </div>
      )}

      {loadState.status === 'ok' && (
        <div className="p-4 space-y-6">
          {loadState.data.rewards.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Награды пока не добавлены</p>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {loadState.data.rewards.map((reward) => {
                const outOfStock = reward.stock !== null && reward.stock <= 0;
                const notEnough = loadState.data.balance < reward.cost_coins;
                const disabled = outOfStock || notEnough;

                return (
                  <Card key={reward.id} className="overflow-hidden flex flex-col">
                    {reward.image_url ? (
                      <img
                        src={reward.image_url}
                        alt={reward.title}
                        loading="lazy"
                        referrerPolicy="no-referrer"
                        className="w-full h-28 object-cover"
                      />
                    ) : (
                      <div className="w-full h-28 bg-muted flex items-center justify-center">
                        <Gift className="w-8 h-8 text-muted-foreground" />
                      </div>
                    )}
                    <CardContent className="p-3 flex flex-col gap-2 flex-1">
                      <h3 className="font-medium text-sm leading-tight">{reward.title}</h3>
                      {reward.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {reward.description}
                        </p>
                      )}
                      <div className="mt-auto space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="flex items-center gap-1 text-sm font-semibold">
                            <Coins className="w-4 h-4 text-kamp-primary" />
                            {reward.cost_coins}
                          </span>
                          {reward.stock !== null && (
                            <span className="text-[11px] text-muted-foreground">
                              Осталось: {reward.stock}
                            </span>
                          )}
                        </div>
                        <Button
                          size="sm"
                          className="w-full"
                          disabled={disabled}
                          onClick={() => {
                            setOpenReward(reward);
                            setComment('');
                            setSubmitState('idle');
                          }}
                        >
                          {outOfStock ? 'Закончилась' : notEnough ? 'Недостаточно коинов' : 'Заказать'}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {loadState.data.my_requests.length > 0 && (
            <div className="space-y-2">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Мои заявки
              </h2>
              {loadState.data.my_requests.map((req) => {
                const meta = STATUS_META[req.status] ?? STATUS_META.pending;
                return (
                  <Card key={req.id}>
                    <CardContent className="p-3 space-y-1">
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-sm font-medium">{req.reward_title}</span>
                        <Badge variant="outline" className={meta.className}>
                          {meta.label}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Coins className="w-3 h-3" />
                          {req.cost_coins}
                        </span>
                        <span>{formatDate(req.created_at)}</span>
                      </div>
                      {req.admin_comment && (
                        <p className="text-xs text-muted-foreground">{req.admin_comment}</p>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Confirm dialog */}
      <Dialog open={openReward !== null} onOpenChange={(open) => !open && setOpenReward(null)}>
        <DialogContent className="max-w-[90vw] rounded-lg">
          <DialogHeader>
            <DialogTitle>Подтверждение заказа</DialogTitle>
            <DialogDescription>{openReward?.title}</DialogDescription>
          </DialogHeader>

          {openReward && (
            <div className="space-y-3">
              <div className="text-sm space-y-1">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Стоимость</span>
                  <span className="font-medium">{openReward.cost_coins} коинов</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Баланс после</span>
                  <span className="font-medium">{balance - openReward.cost_coins} коинов</span>
                </div>
              </div>
              <Textarea
                placeholder="Комментарий (необязательно)"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={3}
              />
              {submitState === 'error' && (
                <p className="text-xs text-destructive">Не удалось оформить заказ. Попробуйте ещё раз.</p>
              )}
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" onClick={() => setOpenReward(null)}>
              Отмена
            </Button>
            <Button onClick={purchase} disabled={submitState === 'loading'}>
              {submitState === 'loading' ? 'Отправка…' : 'Подтвердить'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
