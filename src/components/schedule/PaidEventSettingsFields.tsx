import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { rub, validatePaidSettings, type PaidSettingsInput } from '@/components/web-app/paidBooking';

export const PaidEventSettingsFields: React.FC<{ value: PaidSettingsInput; onChange: (v: PaidSettingsInput) => void }> = ({ value, onChange }) => {
  const set = (k: keyof PaidSettingsInput) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => onChange({ ...value, [k]: e.target.value });
  const check = validatePaidSettings(value);
  return (
    <div className="space-y-3 rounded-md border border-border p-3">
      <div>
        <Label>Оплата</Label>
        <Select value={value.mode} onValueChange={(mode) => onChange({ ...value, mode: mode as 'free' | 'paid' })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="free">Бесплатно (как раньше)</SelectItem>
            <SelectItem value="paid">Платно: бронь по СБП + остаток наличными</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {value.mode === 'paid' && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Полная стоимость, ₽</Label><Input inputMode="numeric" value={value.price_total_rub} onChange={set('price_total_rub')} /></div>
            <div><Label>Предоплата по СБП, ₽</Label><Input inputMode="numeric" value={value.prepay_rub} onChange={set('prepay_rub')} /></div>
            <div><Label>Лимит мест</Label><Input inputMode="numeric" value={value.max_participants} onChange={set('max_participants')} /></div>
            <div><Label>Срок на оплату, мин</Label><Input inputMode="numeric" value={value.payment_window_minutes} onChange={set('payment_window_minutes')} /></div>
          </div>
          {check.ok && check.value.mode === 'paid' && <p className="text-xs text-muted-foreground">Остаток наличными на месте: {rub(check.value.cash_rub)}</p>}
          <div><Label>QR из вашего банка (https-ссылка на изображение)</Label><Input value={value.payment_qr_url} onChange={set('payment_qr_url')} placeholder="https://..." /></div>
          <div><Label>Ссылка на оплату из банка</Label><Input value={value.payment_link} onChange={set('payment_link')} placeholder="https://..." /></div>
          <div><Label>Условия отмены и возврата</Label><Textarea value={value.cancellation_terms} onChange={set('cancellation_terms')} rows={3} placeholder="Сформулируйте условия; формулировку о невозвратности согласуйте с юристом" /></div>
          {!check.ok && <p className="text-xs text-destructive">{check.error}</p>}
        </>
      )}
    </div>
  );
};
