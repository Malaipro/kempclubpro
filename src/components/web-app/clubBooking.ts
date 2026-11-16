export function usesClubCalendar(status: string | null | undefined): boolean {
  return status === 'club_resident';
}

export function isFreeRegularTraining(item: { club_kind?: string | null; booking_mode?: string | null }): boolean {
  return item.booking_mode === 'free' && ['training_bjj', 'training_ofp', 'training_kick'].includes(item.club_kind ?? '');
}

export function clubCalendarItems<T extends { id: string }>(items: T[], clubIds: string[]): T[] {
  const allowed = new Set(clubIds);
  return items.filter(item => allowed.has(item.id));
}