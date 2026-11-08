export function restrictToClub<T extends { eq(column: string, value: string): T }>(query: T): T {
  return query.eq('schedule_type', 'club');
}