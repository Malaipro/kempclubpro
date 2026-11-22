export type PushAudience = 'intensive' | 'resident' | 'alumni' | 'all';
export interface PushButton { type: string; url?: string; target_id?: string }
export interface PushRecipient { user_id: string; name: string; status: string; subscribed: boolean }

const audienceStatuses: Record<Exclude<PushAudience, 'all'>, string[]> = {
  intensive: ['intensive_active'],
  resident: ['club_resident'],
  alumni: ['alumni', 'intensive_completed'],
};

export function inAudience(status: string, audience: PushAudience) {
  return audience === 'all' ? Object.values(audienceStatuses).flat().includes(status) : audienceStatuses[audience].includes(status);
}

export function pushRecipients(people: PushRecipient[], audience: PushAudience) {
  const inScope = people.filter(p => inAudience(p.status, audience));
  return { inScope, subscribed: inScope.filter(p => p.subscribed) };
}

export function pushTargetUrl(buttons: PushButton[]) {
  const book = buttons.find(b => b.type === 'book_event' && b.target_id);
  if (book) return `/app/schedule?event=${encodeURIComponent(book.target_id!)}`;
  const link = buttons.find(b => b.type === 'url' && b.url && /^https:\/\//.test(b.url));
  return link?.url ?? '/app';
}

export function pushPayload(text: string, buttons: PushButton[]) {
  return { title: 'КЭМП', body: text.trim().slice(0, 100), url: pushTargetUrl(buttons) };
}
