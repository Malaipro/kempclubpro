import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import webpush from 'npm:web-push@3.6.7';
import { moscowDate, parseKind, payload } from './policy.ts';

const respond = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

type Subscription = { id: string; endpoint: string; p256dh: string; auth: string };

// Returns 'delivered' | 'none' | 'failed'; deletes expired subscriptions as a side effect.
async function deliver(db: ReturnType<typeof createClient>, userId: string, pushPayload: unknown): Promise<{ result: 'delivered' | 'none' | 'failed'; expired: number }> {
  const { data: subscriptions, error } = await db.from('push_subscriptions').select('id,endpoint,p256dh,auth').eq('user_id', userId);
  if (error) return { result: 'failed', expired: 0 };
  let delivered = false;
  let expired = 0;
  for (const sub of (subscriptions ?? []) as Subscription[]) {
    try {
      await webpush.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, JSON.stringify(pushPayload), { TTL: 3600, timeout: 10000 });
      delivered = true;
    } catch (err) {
      const status = (err as { statusCode?: number }).statusCode;
      if (status === 404 || status === 410) {
        const { error: deleteError } = await db.from('push_subscriptions').delete().eq('id', sub.id);
        if (!deleteError) expired++;
      } else {
        return { result: 'failed', expired };
      }
      // Never log provider responses, endpoints, subscription keys or personal text.
    }
  }
  return { result: delivered ? 'delivered' : 'none', expired };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return respond({ error: 'Method not allowed' }, 405);
  const url = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !serviceKey) return respond({ error: 'Not configured' }, 503);
  const db = createClient(url, serviceKey);
  // Fixed-purpose scheduler: callers authenticate with the shared cron key stored in internal_settings.
  const { data: setting } = await db.from('internal_settings').select('value').eq('key', 'mastermind_push_key').maybeSingle();
  if (!setting?.value || req.headers.get('x-cron-key') !== setting.value) return respond({ error: 'Unauthorized' }, 401);
  let body: unknown;
  try { body = await req.json(); } catch { return respond({ error: 'Invalid JSON' }, 400); }
  if (!body || typeof body !== 'object' || Array.isArray(body) || Object.keys(body).some(k => k !== 'dry_run' && k !== 'kind') || ('dry_run' in body && typeof body.dry_run !== 'boolean')) return respond({ error: 'Only dry_run boolean and kind are allowed' }, 400);
  const kind = parseKind((body as { kind?: unknown }).kind);
  if (!kind) return respond({ error: 'Unknown kind' }, 400);
  const publicKey = Deno.env.get('VAPID_PUBLIC_KEY');
  const privateKey = Deno.env.get('VAPID_PRIVATE_KEY');
  if (!publicKey || !privateKey) return respond({ error: 'Push credentials are not configured' }, 503);
  if ('dry_run' in body && (body as { dry_run?: boolean }).dry_run) return respond({ ok: true, configured: true, date: moscowDate(), kind });
  try {
    webpush.setVapidDetails('https://kemp-app.ru', publicKey, privateKey);

    if (kind === 'auto_absent') {
      const { data, error } = await db.rpc('mastermind_auto_absent');
      if (error) throw new Error('Auto-absent failed');
      return respond({ ok: true, marked_absent: data ?? 0 });
    }

    let sent = 0, failed = 0, expired = 0;

    if (kind === 'meetings') {
      const { data: reminders, error } = await db.rpc('claim_mastermind_meeting_reminders');
      if (error) throw new Error('Cannot claim meeting reminders');
      for (const reminder of reminders ?? []) {
        const { data: claim, error: claimError } = await db.from('mastermind_meeting_reminders').select('meeting_id,member_id').eq('id', reminder.reminder_id).single();
        if (claimError || !claim) { failed++; continue; }
        const { data: attendance, error: attendanceError } = await db.from('mastermind_attendance').select('attended').eq('meeting_id', claim.meeting_id).eq('member_id', claim.member_id).maybeSingle();
        if (attendanceError) { failed++; continue; }
        if (attendance?.attended) {
          await db.from('mastermind_meeting_reminders').update({ sent_at: new Date().toISOString() }).eq('id', reminder.reminder_id);
          continue;
        }
        const { result, expired: exp } = await deliver(db, reminder.user_id, payload('meeting'));
        expired += exp;
        if (result === 'failed') { failed++; continue; }
        if (result === 'delivered') sent++;
        const { error: updateError } = await db.from('mastermind_meeting_reminders').update({ sent_at: new Date().toISOString() }).eq('id', reminder.reminder_id);
        if (updateError) failed++;
      }
      return respond({ ok: true, sent, failed, expired });
    }

    const { data: reminders, error } = await db.rpc('claim_mastermind_push_reminders');
    if (error) throw new Error('Cannot claim reminders');
    for (const reminder of reminders ?? []) {
      const { data: claim, error: claimError } = await db.from('mastermind_task_reminders').select('task_id').eq('id', reminder.reminder_id).single();
      if (claimError || !claim) { failed++; continue; }
      const { data: current, error: taskError } = await db.from('mastermind_tasks').select('is_completed,is_failed,deadline').eq('id', claim.task_id).maybeSingle();
      if (taskError) { failed++; continue; }
      if (!current || current.is_completed || current.is_failed || current.deadline !== reminder.deadline) continue;
      const { result, expired: exp } = await deliver(db, reminder.user_id, payload(reminder.reminder_kind));
      expired += exp;
      if (result === 'failed') { failed++; continue; }
      if (result === 'delivered') {
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
