import React, { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { useAppApi } from '@/components/app-shared/apiAdapter';
import { PAID_STATE_LABEL, holdKeyScope, newIdempotencyKey, paidCardState, paidErrorText, rub, type PaidEventInfo } from './paidBooking';

const fmt = (iso: string) => new Date(iso).toLocaleString('ru-RU', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Moscow' });

export const PaidBookingCard: React.FC<{ info: PaidEventInfo; onChanged: () => Promise<void> }> = ({ info, onChanged }) => {
  const { callApi } = useAppApi();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scope = holdKeyScope(info);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const holdKey = useMemo(() => newIdempotencyKey(), [scope]);
  const state = paidCardState(info);

  const run = async (action: 'paid_hold' | 'paid_report' | 'paid_cancel') => {
    setBusy(true); setError(null);
    try {
      const r = await callApi<{ ok: boolean; error?: string; booking_status?: string }>(action, action === 'paid_hold'
        ? { schedule_id: info.schedule_id, idempotency_key: holdKey } : { booking_id: info.booking?.id });
      if (!r.ok) setError(paidErrorText(r.error));
      else if (action === 'paid_hold' && r.booking_status === 'expired') setError(paidErrorText('hold_expired'));
      await onChanged();
    } catch (e) {
      setError(paidErrorText(e instanceof Error ? e.message : undefined));
    } finally { setBusy(false); }
  };

  return (
    <div className="space-y-3 rounded-md border border-border p-3 text-sm">
      <div className="grid grid-cols-3 gap-2 text-center">
        <div><p className="text-xs text-muted-foreground">Стоимость</p><p className="font-semibold">{rub(info.price_total_rub)}</p></div>
        <div><p className="text-xs text-muted-foreground">Бронь по СБП</p><p className="font-semibold">{rub(info.prepay_rub)}</p></div>
        <div><p className="text-xs text-muted-foreground">Наличными на месте</p><p className="font-semibold">{rub(info.cash_rub)}</p></div>
      </div>
      <p className="text-xs text-muted-foreground">Свободных мест: {info.seats_left} из {info.max_participants}</p>
      <p className="rounded-md bg-primary/10 px-3 py-2 text-center text-xs font-semibold text-primary">{PAID_STATE_LABEL[state]}</p>

      {state === 'hold' && info.booking && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">Оплатите бронь {rub(info.prepay_rub)} до {fmt(info.booking.hold_expires_at)} (МСК). После этого место освободится.</p>
          {info.payment_qr_url && <img src={info.payment_qr_url} alt="QR для оплаты по СБП" referrerPolicy="no-referrer" className="mx-auto h-48 w-48 rounded bg-card object-contain" />}
          {info.payment_link && <Button asChild variant="outline" className="w-full"><a href={info.payment_link} target="_blank" rel="noopener noreferrer">Открыть оплату в банке</a></Button>}
          <Button className="w-full" disabled={busy} onClick={() => void run('paid_report')}>{busy ? 'Отправляем...' : 'Я оплатил'}</Button>
          <Button variant="ghost" className="w-full" disabled={busy} onClick={() => void run('paid_cancel')}>Отменить бронь</Button>
        </div>
      )}
      {state === 'pending_review' && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">Организатор проверит поступление в банке и подтвердит запись. Остаток {rub(info.cash_rub)} — наличными на месте.</p>
          <p className="text-xs text-muted-foreground">Пока оплата на проверке, отменить заявку можно только через организатора.</p>
        </div>
      )}
      {state === 'confirmed' && info.cash_rub > 0 && (
        <p className="text-xs text-muted-foreground">{info.booking?.cash_received_rub ? `Наличные ${rub(info.booking.cash_received_rub)} получены.` : `Остаток ${rub(info.cash_rub)} — наличными на месте.`} Отмену согласуйте с организатором.</p>
      )}
      {state === 'can_book' && (
        <Button className="w-full" disabled={busy} onClick={() => void run('paid_hold')}>{busy ? 'Бронируем...' : `Забронировать за ${rub(info.prepay_rub)}`}</Button>
      )}
      {info.cancellation_terms && <p className="whitespace-pre-wrap text-xs text-muted-foreground">Условия отмены и возврата: {info.cancellation_terms}</p>}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
};
