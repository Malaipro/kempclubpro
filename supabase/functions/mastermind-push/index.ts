import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import webpush from 'npm:web-push@3.6.7';
import { moscowDate, payload } from './policy.ts';

const respond = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return respond({ error: 'Method not allowed' }, 405);
  const anon = Deno.env.get('SUPABASE_ANON_KEY');
  // Fixed-purpose, idempotent scheduler: no arbitrary recipient/message/date is accepted.
  if (!anon || (req.headers.get('apikey') !== anon && req.headers.get('Authorization') !== `Bearer ${anon}`)) return respond({ error: 'Unauthorized' }, 401);
  let body: unknown;
  try { body = await req.json(); } catch { return respond({ error: 'Invalid JSON' }, 400); }
  if (!body || typeof body !== 'object' || Array.isArray(body) || Object.keys(body).some(k => k !== 'dry_run') || ('dry_run' in body && typeof body.dry_run !== 'boolean')) return respond({ error: 'Only dry_run boolean is allowed' }, 400);
  const publicKey = Deno.env.get('VAPID_PUBLIC_KEY');
  const privateKey = Deno.env.get('VAPID_PRIVATE_KEY');
  const url = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!publicKey || !privateKey || !url || !serviceKey) return respond({ error: 'Push credentials are not configured' }, 503);
  if ('dry_run' in body && body.dry_run) return respond({ ok: true, configured: true, date: moscowDate() });
  const db = createClient(url, serviceKey);
  let sent = 0, failed = 0, expired = 0;
  try {
    webpush.setVapidDetails('https://kemp-app.ru', publicKey, privateKey);
    const { data: reminders, error } = await db.rpc('claim_mastermind_push_reminders');
    if (error) throw new Error('Cannot claim reminders');
    for (const reminder of reminders ?? []) {
      const { data: claim, error: claimError } = await db.from('mastermind_task_reminders').select('task_id').eq('id', reminder.reminder_id).single();
      if (claimError || !claim) { failed++; continue; }
      const { data: current, error: taskError } = await db.from('mastermind_tasks').select('is_completed,is_failed,deadline').eq('id', claim.task_id).maybeSingle();
      if (taskError) { failed++; continue; }
      if (!current || current.is_completed || current.is_failed || current.deadline !== reminder.deadline) continue;
      const { data: subscriptions, error: subscriptionError } = await db.from('push_subscriptions').select('id,endpoint,p256dh,auth').eq('user_id', reminder.user_id);
      if (subscriptionError) { failed++; continue; }
      let delivered = false;
      for (const sub of subscriptions ?? []) {
        try {
          await webpush.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, JSON.stringify(payload(reminder.reminder_kind)), { TTL: 3600, timeout: 10000 });
          delivered = true;
        } catch (err) {
          const status = (err as { statusCode?: number }).statusCode;
          if (status === 404 || status === 410) {
            const { error: deleteError } = await db.from('push_subscriptions').delete().eq('id', sub.id);
            if (!deleteError) expired++;
          } else { failed++; }
          // Never log provider responses, endpoints, subscription keys or personal text.
        }
      }
      if (delivered) {
        const { error: updateError } = await db.from('mastermind_task_reminders').update({ sent_at: new Date().toISOString() }).eq('id', reminder.reminder_id);
        if (updateError) failed++; else sent++;
      }
    }
    return respond({ ok: true, sent, failed, expired });
  } catch {
    console.error('Mastermind reminder processing failed');
    return respond({ error: 'Reminder processing failed' }, 500);
  }
});