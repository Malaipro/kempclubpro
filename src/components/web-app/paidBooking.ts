// E1 платные мероприятия. При выключенном флаге приложение не вызывает новые RPC
// и ведёт себя как раньше. Включать только после применения sql/paid-bookings/up.sql.
export const PAID_BOOKINGS_ENABLED = import.meta.env?.VITE_PAID_BOOKINGS_ENABLED === 'true';

export type BookingStatus = 'hold' | 'pending_review' | 'confirmed' | 'cancelled' | 'expired' | 'rejected';
export type PaymentStatus = 'unpaid' | 'reported' | 'verified' | 'not_received' | 'refund_pending' | 'refunded';

export interface PaidEventInfo {
  schedule_id: string;
  price_total_rub: number;
  prepay_rub: number;
  cash_rub: number;
  payment_window_minutes: number;
  cancellation_terms: string | null;
  payment_qr_url: string | null;
  payment_link: string | null;
  max_participants: number;
  seats_left: number;
  legacy_registered: boolean;
  booking: { id: string; booking_status: BookingStatus; payment_status: PaymentStatus; hold_expires_at: string; cash_received_rub: number | null } | null;
}

export type PaidCardState = 'can_book' | 'no_seats' | 'hold' | 'pending_review' | 'confirmed' | 'registered_legacy';

export function paidCardState(info: PaidEventInfo, now: Date = new Date()): PaidCardState {
  if (info.legacy_registered) return 'registered_legacy';
  const b = info.booking;
  if (b?.booking_status === 'confirmed') return 'confirmed';
  if (b?.booking_status === 'pending_review') return 'pending_review';
  if (b?.booking_status === 'hold' && new Date(b.hold_expires_at) > now) return 'hold';
  return info.seats_left > 0 ? 'can_book' : 'no_seats';
}

// Только подтверждённая основателем бронь может называться записью
export const PAID_STATE_LABEL: Record<PaidCardState, string> = {
  can_book: 'Свободные места есть',
  no_seats: 'Мест нет',
  hold: 'Место удерживается — ожидаем предоплату',
  pending_review: 'Оплата на проверке у организатора. Это ещё не запись',
  confirmed: 'Вы записаны: предоплата подтверждена',
  registered_legacy: 'Вы записаны',
};

export const PAID_ERROR_TEXT: Record<string, string> = {
  forbidden: 'Бронирование доступно только одобренным резидентам клуба',
  no_seats: 'Мест нет',
  hold_expired: 'Время на оплату истекло. Забронируйте снова, если места остались',
  event_started: 'Мероприятие уже началось',
  already_registered: 'Вы уже записаны',
  contact_founder: 'Подтверждённую бронь отменяет организатор — напишите ему',
  paid_event_requires_verified_booking: 'Это платное мероприятие: запись появится после подтверждения предоплаты',
};
export const paidErrorText = (code?: string) => (code && PAID_ERROR_TEXT[code]) || 'Операция не выполнена';

export const rub = (v: number) => `${v.toLocaleString('ru-RU')} ₽`;

export function newIdempotencyKey(): string {
  return `web-${crypto.randomUUID()}`;
}

export interface PaidSettingsInput {
  mode: 'free' | 'paid';
  price_total_rub: string; prepay_rub: string; max_participants: string; payment_window_minutes: string;
  cancellation_terms: string; payment_qr_url: string; payment_link: string;
}
export const emptyPaidSettings: PaidSettingsInput = {
  mode: 'free', price_total_rub: '', prepay_rub: '', max_participants: '', payment_window_minutes: '120',
  cancellation_terms: '', payment_qr_url: '', payment_link: '',
};

export type PaidSettingsResult =
  | { ok: true; value: { mode: 'free' } | { mode: 'paid'; price_total_rub: number; prepay_rub: number; cash_rub: number; max_participants: number; payment_window_minutes: number; cancellation_terms: string | null; payment_qr_url: string | null; payment_link: string | null } }
  | { ok: false; error: string };

const int = (s: string) => (/^\d+$/.test(s.trim()) ? Number(s.trim()) : NaN);
const httpsOrEmpty = (s: string) => s.trim() === '' || /^https:\/\/[^\s]+$/.test(s.trim());

// Повторяет серверный CHECK, чтобы основатель видел ошибку до сохранения
export function validatePaidSettings(input: PaidSettingsInput): PaidSettingsResult {
  if (input.mode === 'free') return { ok: true, value: { mode: 'free' } };
  const total = int(input.price_total_rub), prepay = int(input.prepay_rub), seats = int(input.max_participants), win = int(input.payment_window_minutes);
  if (!(total > 0)) return { ok: false, error: 'Укажите полную стоимость в рублях' };
  if (!(prepay > 0)) return { ok: false, error: 'Предоплата по СБП должна быть больше 0' };
  if (prepay > total) return { ok: false, error: 'Предоплата не может быть больше полной стоимости' };
  if (!(seats > 0)) return { ok: false, error: 'Укажите лимит мест' };
  if (!(win >= 10 && win <= 1440)) return { ok: false, error: 'Срок на оплату: от 10 до 1440 минут' };
  if (!httpsOrEmpty(input.payment_qr_url) || !httpsOrEmpty(input.payment_link)) return { ok: false, error: 'Ссылки должны начинаться с https://' };
  if (!input.payment_qr_url.trim() && !input.payment_link.trim()) return { ok: false, error: 'Добавьте QR или ссылку на оплату из вашего банка' };
  return { ok: true, value: {
    mode: 'paid', price_total_rub: total, prepay_rub: prepay, cash_rub: total - prepay, max_participants: seats, payment_window_minutes: win,
    cancellation_terms: input.cancellation_terms.trim() || null, payment_qr_url: input.payment_qr_url.trim() || null, payment_link: input.payment_link.trim() || null,
  } };
}
