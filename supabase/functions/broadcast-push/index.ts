import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { z } from 'npm:zod@4';
import webpush from 'npm:web-push@3.6.7';
import { encryptPayload } from '../_shared/webPushEncrypt.ts';
import { deliver, eligible, eventTarget, notification, TEST_USER_ID, type Profile, type Subscription } from './policy.ts';

const reply = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
const audienceSchema = z.enum(['intensive', 'resident', 'alumni', 'all']);
const buttonSchema = z.object({ type: z.string().max(50), target_id: z.string().uuid().optional(), url: z.url().max(2048).optional() });
const requestSchema = z.union([
  z.object({ broadcastId: z.string().uuid(), dry_run: z.boolean().optional() }).strict(),
  z.object({ preview: z.literal(true), audience: audienceSchema, buttons: z.array(buttonSchema).max(20).default([]) }).strict(),
  z.object({ test: z.literal(true), empty: z.boolean().optional(), dry_run: z.boolean().optional() }).strict(),
]);

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return reply({ error: 'Method not allowed' }, 405);
  const url = Deno.env.get('SUPABASE_URL');
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  // Never target MIRA, even when a CLI config or deployment is misbound.
  if (url !== 'https://wfjvjvbjjxcgkaolkgdq.supabase.co' || !key) return reply({ error: 'KEMP configuration required' }, 503);
  const db = createClient(url, key);
  const authorization = req.headers.get('Authorization');
  if (!authorization?.startsWith('Bearer ')) return reply({ error: 'Требуется вход' }, 401);
  const { data: user, error: authError } = await db.auth.getUser(authorization.slice(7));
  if (authError || !user.user) return reply({ error: 'Требуется вход' }, 401);
  const { data: admin, error: roleError } = await db.rpc('is_admin', { _user_id: user.user.id });
  if (roleError || admin !== true) return reply({ error: 'Доступ только для администратора' }, 403);
  let json: unknown;
  try { json = await req.json(); } catch { return reply({ error: 'Invalid JSON' }, 400); }
  const parsed = requestSchema.safeParse(json);
  if (!parsed.success) return reply({ error: 'Некорректный запрос', details: parsed.error.flatten().fieldErrors }, 400);
  const input = parsed.data;
  const publicKey = Deno.env.get('VAPID_PUBLIC_KEY');
  const privateKey = Deno.env.get('VAPID_PRIVATE_KEY');
  if (!publicKey || !privateKey) return reply({ error: 'Ключи отправки пушей не настроены' }, 503);
  try {
    webpush.setVapidDetails('https://kempclub.pro', publicKey, privateKey);
    const { data: setting, error: settingError } = await db.from('internal_settings').select('value').eq('key', 'broadcast_push_enabled').maybeSingle();
    if (settingError) throw new Error('Cannot read dispatch setting');
    const enabled = setting?.value === 'true';
    let payload: unknown;
    let ids: string[];
    let broadcastId: string | null = null;
    let fullText = '';
    if ('test' in input) {
      // Fixed recipient and harmless content; this path never sends Telegram or books an event.
      ids = [TEST_USER_ID];
      // Payload-less test isolates encryption problems: the worker then shows the default «КЭМП» title.
      payload = input.empty ? null : notification('Тест пуш-уведомлений КЭМП. Запись и оплата не выполняются.', []);
    } else {
      let audience = 'preview' in input ? input.audience : 'all' as z.infer<typeof audienceSchema>;
      let buttons = 'preview' in input ? input.buttons : [];
      let targets: string[] | null = null;
      let text = '';
      if ('broadcastId' in input) {
        broadcastId = input.broadcastId;
        const { data: broadcast, error } = await db.from('broadcast_messages').select('text,audience,buttons,target_user_ids,status,push_started_at,push_sent,push_subscribed,push_failed').eq('id', broadcastId).single();
        if (error || !broadcast) return reply({ error: 'Рассылка не найдена' }, 404);
        const a = audienceSchema.safeParse(broadcast.audience);
        const b = z.array(buttonSchema).max(20).safeParse((broadcast.buttons ?? []).map((button: Record<string, unknown>) => ({ type: button.type, ...(button.target_id ? { target_id: button.target_id } : {}), ...(button.url ? { url: button.url } : {}) })));
        if (!a.success || !b.success) return reply({ error: 'Некорректные параметры рассылки' }, 400);
        audience = a.data; buttons = b.data; targets = broadcast.target_user_ids; text = broadcast.text; fullText = broadcast.text.trim().slice(0, 4000);
        if (!input.dry_run && broadcast.status !== 'sent') return reply({ error: 'Сначала отправьте основную рассылку' }, 409);
        if (!input.dry_run && broadcast.push_started_at) return reply({ ok: true, duplicate: true, sent: broadcast.push_sent ?? 0, subscribed: broadcast.push_subscribed ?? 0, failed: broadcast.push_failed ?? 0 });
      }
      const eventId = eventTarget(buttons);
      let event = null;
      if (eventId) {
        const { data, error } = await db.from('schedules').select('is_active,schedule_type,stream_id').eq('id', eventId).maybeSingle();
        if (error || !data || !data.is_active) return reply({ error: 'Мероприятие недоступно' }, 400);
        event = data;
      }
      const profiles: Profile[] = [];
      for (let offset = 0; ; offset += 1000) {
        const { data, error } = await db.from('profiles').select('user_id,approved,participant_status,current_stream_id').eq('approved', true).order('user_id').range(offset, offset + 999);
        if (error) throw new Error('Cannot read audience');
        profiles.push(...data as Profile[]);
        if (data.length < 1000) break;
      }
      ids = [...new Set(profiles.filter(p => eligible(p, audience, targets, event)).map(p => p.user_id))];
      payload = notification(text, buttons);
    }
    const subscriptions: Subscription[] = [];
    for (let start = 0; start < ids.length; start += 100) {
      const chunk = ids.slice(start, start + 100);
      for (let offset = 0; ; offset += 1000) {
        const { data, error } = await db.from('push_subscriptions').select('id,user_id,endpoint,p256dh,auth').in('user_id', chunk).order('id').range(offset, offset + 999);
        if (error) throw new Error('Cannot read subscriptions');
        subscriptions.push(...data as Subscription[]);
        if (data.length < 1000) break;
      }
    }
    const subscribed = new Set(subscriptions.map(s => s.user_id)).size;
    if ('preview' in input || input.dry_run) return reply({ ok: true, configured: true, enabled, total: ids.length, subscribed });
    if (!('test' in input) && !enabled) return reply({ error: 'Пуш-рассылка ещё не включена: ожидает пробной доставки' }, 409);
    if (broadcastId) {
      const { data: claim, error } = await db.from('broadcast_messages').update({ push_started_at: new Date().toISOString(), push_subscribed: subscribed }).eq('id', broadcastId).is('push_started_at', null).select('id');
      if (error) throw new Error('Cannot claim broadcast');
      if (!claim?.length) return reply({ ok: true, duplicate: true, in_progress: true });
    }
    // App-channel broadcasts are kept in each recipient's /app bell, including people without push enabled.
    if (payload) {
      const n = payload as { title: string; body: string; url: string };
      const message = 'broadcastId' in input ? fullText : n.body;
      for (let i = 0; i < ids.length; i += 500) {
        const { error } = await db.from('notifications').insert(ids.slice(i, i + 500).map(user_id => ({ user_id, title: n.title, message, notification_type: 'broadcast', action_url: n.url, is_read: false })));
        if (error) throw new Error('Cannot store notifications');
      }
    }
    const result = await deliver(subscriptions, payload,
      async (s, body) => {
        if (body === null) return webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, null, { TTL: 3600, timeout: 10000, urgency: 'high' });
        // Encrypt with WebCrypto; VAPID signing from web-push is proven by the payload-less test.
        const vapid = webpush.getVapidHeaders(new URL(s.endpoint).origin, 'https://kempclub.pro', publicKey, privateKey, 'aes128gcm');
        const res = await fetch(s.endpoint, { method: 'POST', signal: AbortSignal.timeout(10000), body: await encryptPayload(s.p256dh, s.auth, JSON.stringify(body)),
          headers: { Authorization: vapid.Authorization, TTL: '3600', Urgency: 'high', 'Content-Encoding': 'aes128gcm', 'Content-Type': 'application/octet-stream' } });
        await res.body?.cancel();
        if (!res.ok) throw Object.assign(new Error('Push rejected'), { statusCode: res.status });
      },
      async id => { const { error } = await db.from('push_subscriptions').delete().eq('id', id); if (error) throw new Error('Cannot remove expired subscription'); });
    if (broadcastId) {
      const { error } = await db.from('broadcast_messages').update({ push_sent: result.sent, push_subscribed: result.subscribed, push_failed: result.failed }).eq('id', broadcastId);
      if (error) return reply({ error: 'Пуш обработан, но итог не сохранён; повторная отправка заблокирована', ...result }, 500);
    }
    return reply({ ok: true, ...result, test: 'test' in input });
  } catch {
    console.error('Broadcast push processing failed');
    return reply({ error: 'Не удалось обработать пуш; проверьте журнал отправки' }, 500);
  }
});