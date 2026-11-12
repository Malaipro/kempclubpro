export function usesClubCalendar(status: string | null | undefined): boolean {
  return status === 'club_resident';
}

export function clubCalendarItems<T extends { id: string }>(items: T[], clubIds: string[]): T[] {
  const allowed = new Set(clubIds);
  return items.filter(item => allowed.has(item.id));
}