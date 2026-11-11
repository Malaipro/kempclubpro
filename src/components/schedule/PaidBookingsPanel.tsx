import React, { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { rub, type BookingStatus, type PaymentStatus } from '@/components/web-app/paidBooking';

type Booking = { id: string; name: string; booking_status: BookingStatus; payment_status: PaymentStatus; prepay_rub: number; cash_rub: number;
  price_total_rub: number; cash_received_rub: number | null; hold_expires_at: string; reported_at: string | null;
  ledger: { kind: string; amount_rub: number | null; note: string | null; at: string }[] | null };

const rpc = supabase.rpc.bind(supabase) as unknown as (fn: string, args: Record<string, unknown>) => PromiseLike<{ data: unknown; error: { message: string } | null }>;
const BOOKING: Record<BookingStatus, string> = { hold: 'Ожидает оплату', pending_review: 'Сообщил об оплате — проверить банк', confirmed: 'Подтверждён',
  cancelled: 'Отменён', expired: 'Истёк срок', rejected: 'Оплата не поступила' };
const PAYMENT: Record<PaymentStatus, string> = { unpaid: 'не оплачено', reported: 'со слов участника', verified: 'предоплата получена',
  not_received: 'не поступила', refund_pending: 'нужен возврат', refunded: 'возврат сделан' };
const explain = (m: string) => /Could not find the function|schema cache/i.test(m) ? 'Платные брони ещё не включены на сервере' : m === 'forbidden' ? 'Только основатель управляет оплатами' : m;
const at = (iso: string) => new Date(iso).toLocaleString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Moscow' });

export const PaidBookingsPanel: React.FC<{ scheduleId: string }> = ({ scheduleId }) => {
  const [rows, setRows] = useState<Booking[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    const { data, error } = await rpc('paid_bookings_admin_list', { p_schedule_id: scheduleId });
    const r = data as { ok?: boolean; error?: string; bookings?: Booking[] } | null;
    if (error || !r?.ok) { setError(explain(error?.message ?? r?.error ?? 'Ошибка')); return; }
    setError(null); setRows(r.bookings ?? []);
  }, [scheduleId]);
  useEffect(() => { void load(); }, [load]);

  const act = async (id: string, fn: string, args: Record<string, unknown>, success: string) => {
    setBusy(id);
    const { data, error } = await rpc(fn, { p_booking_id: id, ...args });
    const r = data as { ok?: boolean; error?: string; already_processed?: boolean } | null;
    setBusy(null);
    if (error || !r?.ok) { toast.error(explain(error?.message ?? r?.error ?? 'Ошибка')); return; }
    toast.success(r.already_processed ? 'Уже обработано ранее' : success);
    await load();
  };

  if (error) return <p className="text-sm text-muted-foreground">{error}</p>;
  if (!rows) return <p className="text-sm text-muted-foreground">Загрузка заявок...</p>;
  return (
    <div className="space-y-3">
      <h4 className="font-semibold">Заявки и проверка оплат</h4>
      <p className="text-xs text-muted-foreground">«Подтвердить поступление» нажимайте только после того, как увидели деньги в банке. Сообщение участника не является оплатой.</p>
      {rows.length === 0 && <p className="text-sm text-muted-foreground">Заявок пока нет</p>}
      {rows.map(b => {
        const note = notes[b.id] ?? '';
        return (
          <div key={b.id} className="space-y-2 rounded-md border border-border p-3 text-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-medium">{b.name}</span>
              <Badge variant="outline">{BOOKING[b.booking_status]} · {PAYMENT[b.payment_status]}</Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Предоплата {rub(b.prepay_rub)} · наличными {rub(b.cash_rub)}{b.cash_received_rub ? ` (получено ${rub(b.cash_received_rub)})` : ''}
              {b.booking_status === 'hold' && ` · держим до ${at(b.hold_expires_at)}`}{b.reported_at && ` · сообщил ${at(b.reported_at)}`}
            </p>
            <Input placeholder="Комментарий (номер операции, причина)" value={note} onChange={e => setNotes({ ...notes, [b.id]: e.target.value })} />
            <div className="flex flex-wrap gap-2">
              {b.booking_status === 'pending_review' && <>
                <Button size="sm" disabled={busy === b.id} onClick={() => void act(b.id, 'paid_booking_decide', { p_received: true, p_note: note || null }, 'Запись подтверждена')}>Подтвердить поступление</Button>
                <Button size="sm" variant="outline" disabled={busy === b.id} onClick={() => void act(b.id, 'paid_booking_decide', { p_received: false, p_note: note || null }, 'Отмечено: не поступила')}>Не поступил</Button>
              </>}
              {b.booking_status === 'confirmed' && !b.cash_received_rub && b.cash_rub > 0 &&
                <Button size="sm" variant="outline" disabled={busy === b.id} onClick={() => void act(b.id, 'paid_booking_mark_cash', { p_amount_rub: b.cash_rub }, 'Наличные отмечены')}>Получил наличные {rub(b.cash_rub)}</Button>}
              {['hold', 'pending_review', 'confirmed'].includes(b.booking_status) && <>
                <Button size="sm" variant="ghost" disabled={busy === b.id || note.trim().length < 3} onClick={() => void act(b.id, 'paid_booking_founder_cancel', { p_refund_due: false, p_note: note }, 'Бронь отменена')}>Отменить без возврата</Button>
                {b.payment_status !== 'unpaid' && <Button size="sm" variant="ghost" disabled={busy === b.id || note.trim().length < 3} onClick={() => void act(b.id, 'paid_booking_founder_cancel', { p_refund_due: true, p_note: note }, 'Отменено, возврат к выполнению')}>Отменить с возвратом</Button>}
              </>}
              {b.payment_status === 'refund_pending' &&
                <Button size="sm" variant="outline" disabled={busy === b.id} onClick={() => void act(b.id, 'paid_booking_mark_refunded', { p_amount_rub: b.prepay_rub + (b.cash_received_rub ?? 0), p_note: note || null }, 'Возврат отмечен')}>Возврат сделан</Button>}
            </div>
            {b.ledger && <details className="text-xs text-muted-foreground"><summary>История ({b.ledger.length})</summary>
              {b.ledger.map((l, i) => <p key={i}>{at(l.at)} · {l.kind}{l.amount_rub ? ` · ${rub(l.amount_rub)}` : ''}{l.note ? ` · ${l.note}` : ''}</p>)}</details>}
          </div>
        );
      })}
    </div>
  );
};
