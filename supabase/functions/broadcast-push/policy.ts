export type Audience = 'intensive' | 'resident' | 'alumni' | 'all';
export type PushButton = { type: string; target_id?: string; url?: string };
export type Profile = { user_id: string; approved: boolean; participant_status: string; current_stream_id: string | null };
export type EventScope = { is_active: boolean; schedule_type: string; stream_id: string | null };
export const TEST_USER_ID = '9b972710-84a4-4e95-894d-2eee1ce8360b';
const statuses: Record<Audience, string[]> = {
  intensive: ['intensive_active'], resident: ['club_resident'], alumni: ['alumni'],
  all: ['intensive_active', 'club_resident', 'alumni'],
};
export function eligible(profile: Profile, audience: Audience, targets: string[] | null, event: EventScope | null) {
  if (!profile.approved) return false;
  if (targets !== null ? !targets.includes(profile.user_id) : !statuses[audience].includes(profile.participant_status)) return false;
  if (!event) return true;
  if (!event.is_active) return false;
  return event.schedule_type === 'club'
    ? profile.participant_status === 'club_resident'
    : profile.participant_status === 'intensive_active' && event.stream_id !== null && profile.current_stream_id === event.stream_id;
}
export function eventTarget(buttons: PushButton[]) {
  return buttons.find(b => b.type === 'book_event' && b.target_id)?.target_id ?? null;
}
export function targetUrl(buttons: PushButton[]) {
  const id = eventTarget(buttons);
  if (id) return `/app?section=schedule&event=${encodeURIComponent(id)}`;
  const link = buttons.find(b => b.type === 'url' && b.url?.startsWith('https://'));
  return link?.url ?? '/app';
}
export function notification(text: string, buttons: PushButton[]) {
  return { title: 'КЭМП', body: text.trim().slice(0, 100), url: targetUrl(buttons) };
}
export function allowedEndpoint(endpoint: string) {
  try {
    const u = new URL(endpoint);
    return u.protocol === 'https:' && !u.username && !u.password && !u.port &&
      /^(fcm\.googleapis\.com|updates\.push\.services\.mozilla\.com|([a-z0-9-]+\.)*push\.apple\.com|([a-z0-9-]+\.)*notify\.windows\.com)$/.test(u.hostname);
  } catch { return false; }
}
export type Subscription = { id: string; user_id: string; endpoint: string; p256dh: string; auth: string };
export async function deliver(subscriptions: Subscription[], payload: unknown,
  send: (s: Subscription, payload: unknown) => Promise<unknown>, remove: (id: string) => Promise<void>) {
  const delivered = new Set<string>();
  const recipients = new Set(subscriptions.map(s => s.user_id));
  let expired = 0;
  for (const sub of subscriptions) {
    if (!allowedEndpoint(sub.endpoint)) continue;
    try { await send(sub, payload); delivered.add(sub.user_id); }
    catch (err) {
      const status = (err as { statusCode?: number })?.statusCode;
      if (status === 404 || status === 410) {
        try { await remove(sub.id); expired++; } catch { /* no sensitive provider details */ }
      }
    }
  }
  return { sent: delivered.size, subscribed: recipients.size, failed: recipients.size - delivered.size, expired };
}