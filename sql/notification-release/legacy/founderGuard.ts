// STAGED ONLY. Destination: supabase/functions/_shared/founderGuard.ts (one release with legacy senders).
// Legacy senders (send-broadcast, send-to-group) used is_admin; restrict to the verified founder account.
// profiles.approved is intentionally not part of sender authorization.
export const FOUNDER_ID = 'bfe3d1f1-3b4a-4c9c-b38a-e961f3fc7f2e';
export function isFounderSender(userId: string | null | undefined, superAdmin: boolean): boolean {
  return userId === FOUNDER_ID && superAdmin === true;
}
