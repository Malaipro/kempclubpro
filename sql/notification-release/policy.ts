// Staged source only. Not an automatically deployed Edge Function.
export type Audience = 'resident' | 'intensive' | 'all';
export type Channel = 'telegram_personal' | 'telegram_group' | 'push';
export const FOUNDER_ID = 'bfe3d1f1-3b4a-4c9c-b38a-e961f3fc7f2e';
export function acceptsProfile(audience: Audience, profile: { approved: boolean | null; participant_status: string | null }): boolean {
  if (profile.approved !== true) return false;
  if (audience === 'resident') return profile.participant_status === 'club_resident';
  if (audience === 'intensive') return profile.participant_status === 'intensive_active';
  return audience === 'all';
}
export function requireFounder(id: string, superAdmin: boolean, approved: boolean): void {
  if (id !== FOUNDER_ID || !superAdmin || !approved) throw new Error('forbidden');
}
export function recipientIds(audience: Audience, profiles: { user_id: string; approved: boolean | null; participant_status: string | null }[]): string[] {
  return [...new Set(profiles.filter(p => acceptsProfile(audience, p)).map(p => p.user_id))];
}
export function requireRecipients(ids: string[]): void {
  if (!Array.isArray(ids) || !ids.length || ids.some(id => !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id))) throw new Error('empty_or_invalid_recipients');
}
export function safePushUrl(value: string): string {
  const url = new URL(value, 'https://kemp-app.ru');
  const allowed = ['home','schedule','activities','profile','chat','nutrition','mastermind_business','mastermind_personal'];
  if (url.origin !== 'https://kemp-app.ru' || url.pathname !== '/app' || url.hash || [...url.searchParams.keys()].some(k => k !== 'section')) throw new Error('invalid_push_url');
  const section = url.searchParams.get('section');
  if (section && !allowed.includes(section)) throw new Error('invalid_push_url');
  return section ? `/app?section=${section}` : '/app';
}
export function trustedPushEndpoint(value: string): boolean {
  try {
    const u = new URL(value);
    return u.protocol === 'https:' && !u.username && !u.password && !u.port &&
      (u.hostname === 'fcm.googleapis.com' || u.hostname === 'updates.push.services.mozilla.com' || u.hostname === 'web.push.apple.com' || u.hostname.endsWith('.notify.windows.com'));
  } catch { return false; }
}
export async function deliverSubscriptions<T extends { id: string; user_id: string }>(
  subscriptions: T[], send: (sub: T) => Promise<void>, expire: (id: string) => Promise<void>,
) {
  const result = { subscribers: new Set(subscriptions.map(s => s.user_id)).size, subscriptions: subscriptions.length, accepted: 0, errors: 0, invalid: 0 };
  for (const sub of subscriptions) {
    try { await send(sub); result.accepted++; }
    catch (e) {
      const status = (e as { statusCode?: number }).statusCode;
      if (status === 404 || status === 410) { result.invalid++; try { await expire(sub.id); } catch { result.errors++; } }
      else result.errors++;
    }
  }
  return result;
}