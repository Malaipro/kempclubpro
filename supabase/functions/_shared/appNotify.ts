// Single path for participant notifications: a bell entry in /app plus Web Push to every device.
import webpush from 'npm:web-push@3.6.7';
import { encryptPayload } from './webPushEncrypt.ts';

type Db = { from: (t: string) => any };
export type AppNotice = { title: string; body: string; url?: string; type: string };

export async function pushTo(db: Db, userId: string, payload: unknown, subject = 'https://kempclub.pro') {
  const pub = Deno.env.get('VAPID_PUBLIC_KEY'), priv = Deno.env.get('VAPID_PRIVATE_KEY');
  if (!pub || !priv) return { sent: 0, failed: 0, expired: 0 };
  const { data, error } = await db.from('push_subscriptions').select('id,endpoint,p256dh,auth').eq('user_id', userId);
  if (error) return { sent: 0, failed: 1, expired: 0 };
  let sent = 0, failed = 0, expired = 0;
  for (const s of data ?? []) {
    try {
      const vapid = webpush.getVapidHeaders(new URL(s.endpoint).origin, subject, pub, priv, 'aes128gcm');
      const res = await fetch(s.endpoint, { method: 'POST', signal: AbortSignal.timeout(10000), body: await encryptPayload(s.p256dh, s.auth, JSON.stringify(payload)),
        headers: { Authorization: vapid.Authorization, TTL: '3600', Urgency: 'high', 'Content-Encoding': 'aes128gcm', 'Content-Type': 'application/octet-stream' } });
      await res.body?.cancel();
      if (res.ok) sent++;
      else if (res.status === 404 || res.status === 410) { await db.from('push_subscriptions').delete().eq('id', s.id); expired++; }
      else failed++;
    } catch { failed++; }
  }
  return { sent, failed, expired };
}

export async function notifyUser(db: Db, userId: string, n: AppNotice) {
  const url = n.url ?? '/app';
  const { error } = await db.from('notifications').insert({ user_id: userId, title: n.title, message: n.body, notification_type: n.type, action_url: url, is_read: false });
  const push = await pushTo(db, userId, { title: n.title, body: n.body.slice(0, 140), url });
  return { stored: !error, ...push };
}
