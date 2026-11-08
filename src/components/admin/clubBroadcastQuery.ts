export function restrictToClub<T>(query: { eq(column: string, value: string): T }): T {
  return query.eq('schedule_type', 'club');
}