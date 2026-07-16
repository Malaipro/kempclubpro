import {
  Users,
  UserCog,
  GraduationCap,
  UserCheck,
  UserX,
  UserMinus,
  UserPlus,
  type LucideIcon,
} from 'lucide-react';

/**
 * Единый источник истины по статусам участника КЭМП.
 * Используется в CRM (AdminViewParticipant), разделе «Статусы»
 * (ParticipantStatusManagement), фильтрах списка, рассылках и везде,
 * где отображается profiles.participant_status.
 *
 * НЕ дублировать словарь в других файлах — импортировать отсюда.
 */

export type ParticipantStatus =
  | 'club_resident'
  | 'intensive_active'
  | 'intensive_failed'
  | 'trial_visit'
  | 'intensive_dropped'
  | 'intensive_completed'
  | 'alumni'
  | 'inactive';

export interface ParticipantStatusMeta {
  value: ParticipantStatus;
  /** Полная подпись в UI */
  label: string;
  /** Короткая подпись для бейджей/таблиц */
  shortLabel: string;
  /** Иконка lucide-react */
  icon: LucideIcon;
  /** Tailwind-классы для Badge */
  badgeClass: string;
  /** Порядок отображения в селектах и фильтрах */
  order: number;
  /** Legacy-статус — оставлен для истории, не рекомендуется к простановке */
  legacy: boolean;
}

export const PARTICIPANT_STATUS_META: Record<ParticipantStatus, ParticipantStatusMeta> = {
  club_resident: {
    value: 'club_resident',
    label: 'Резидент',
    shortLabel: 'Резидент',
    icon: UserCog,
    // тёмно-красный — согласно ТЗ v1.2 §3.2
    badgeClass: 'bg-red-900 text-white hover:bg-red-900/90',
    order: 1,
    legacy: false,
  },
  intensive_active: {
    value: 'intensive_active',
    label: 'Участник интенсива',
    shortLabel: 'Интенсив',
    icon: Users,
    // акцентный
    badgeClass: 'bg-primary text-primary-foreground hover:bg-primary/90',
    order: 2,
    legacy: false,
  },
  intensive_failed: {
    value: 'intensive_failed',
    label: 'Не прошёл',
    shortLabel: 'Не прошёл',
    icon: UserX,
    // приглушённый серый
    badgeClass: 'bg-muted text-muted-foreground hover:bg-muted/90',
    order: 3,
    legacy: false,
  },
  trial_visit: {
    value: 'trial_visit',
    label: 'Приходил на пробную',
    shortLabel: 'Пробная',
    icon: UserPlus,
    // нейтральный
    badgeClass: 'bg-secondary text-secondary-foreground hover:bg-secondary/90',
    order: 4,
    legacy: false,
  },
  intensive_dropped: {
    value: 'intensive_dropped',
    label: 'Не дошёл',
    shortLabel: 'Не дошёл',
    icon: UserMinus,
    // приглушённый серый
    badgeClass: 'bg-muted text-muted-foreground hover:bg-muted/90',
    order: 5,
    legacy: false,
  },
  intensive_completed: {
    value: 'intensive_completed',
    label: 'Завершил интенсив',
    shortLabel: 'Завершил',
    icon: UserCheck,
    badgeClass: 'bg-accent text-accent-foreground hover:bg-accent/90',
    order: 6,
    legacy: true,
  },
  alumni: {
    value: 'alumni',
    label: 'Выпускник',
    shortLabel: 'Выпускник',
    icon: GraduationCap,
    badgeClass: 'bg-muted text-muted-foreground hover:bg-muted/90',
    order: 7,
    legacy: true,
  },
};

/** Все статусы, отсортированные по order (5 основных, затем legacy). */
export const PARTICIPANT_STATUSES: ParticipantStatusMeta[] = Object.values(
  PARTICIPANT_STATUS_META,
).sort((a, b) => a.order - b.order);

/** Только основные статусы — рекомендованы для новых назначений. */
export const MAIN_PARTICIPANT_STATUSES: ParticipantStatusMeta[] = PARTICIPANT_STATUSES.filter(
  (s) => !s.legacy,
);

/** Legacy-статусы — отображаются, но помечены как устаревшие. */
export const LEGACY_PARTICIPANT_STATUSES: ParticipantStatusMeta[] = PARTICIPANT_STATUSES.filter(
  (s) => s.legacy,
);

/** Получить подпись по значению. Пустая строка / null → «Не указан». */
export function getParticipantStatusLabel(
  status: ParticipantStatus | string | null | undefined,
): string {
  if (!status) return 'Не указан';
  const meta = PARTICIPANT_STATUS_META[status as ParticipantStatus];
  return meta ? meta.label : status;
}

/** Получить мета-объект (иконка/цвет/подпись) по значению. */
export function getParticipantStatusMeta(
  status: ParticipantStatus | string | null | undefined,
): ParticipantStatusMeta | null {
  if (!status) return null;
  return PARTICIPANT_STATUS_META[status as ParticipantStatus] ?? null;
}

// ---------------------------------------------------------------------------
// Конфиг переходов «Быстрые действия» (для §7.1 карточки — Партия B).
// Экспортируется заранее, чтобы UI-модуль импортировал единый источник.
// ---------------------------------------------------------------------------

export interface StatusTransition {
  to: ParticipantStatus;
  label: string;
  /** Требует выбора потока при переходе */
  requiresStream?: boolean;
}

export const STATUS_TRANSITIONS: Partial<Record<ParticipantStatus, StatusTransition[]>> = {
  trial_visit: [
    { to: 'intensive_active', label: 'Зачислить в интенсив', requiresStream: true },
    { to: 'intensive_dropped', label: 'Не дошёл' },
  ],
  intensive_active: [
    { to: 'club_resident', label: 'Перевести в резиденты' },
    { to: 'intensive_dropped', label: 'Не дошёл' },
    { to: 'intensive_failed', label: 'Не прошёл' },
  ],
  intensive_dropped: [
    { to: 'intensive_active', label: 'Вернуть на поток', requiresStream: true },
  ],
  intensive_failed: [
    { to: 'intensive_active', label: 'Вернуть на поток', requiresStream: true },
  ],
  club_resident: [
    { to: 'alumni', label: 'Перевести в выпускники' },
  ],
};
