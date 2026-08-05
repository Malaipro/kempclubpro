import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN');
    if (!botToken) {
      return new Response(JSON.stringify({ error: 'TELEGRAM_BOT_TOKEN is not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const nowIso = new Date().toISOString();

    const { data: reminders, error: remErr } = await supabase
      .from('application_reminders')
      .select('id, submission_id, remind_at, comment')
      .eq('sent', false)
      .eq('done', false)
      .lte('remind_at', nowIso)
      .order('remind_at', { ascending: true })
      .limit(50);

    if (remErr) throw remErr;
    if (!reminders || reminders.length === 0) {
      return new Response(JSON.stringify({ ok: true, sent: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Получатели: супер-админы с привязанным Telegram
    const { data: roleRows, error: roleErr } = await supabase
      .from('user_roles')
      .select('user_id')
      .eq('role', 'super_admin');
    if (roleErr) throw roleErr;

    const adminIds = (roleRows || []).map((r: { user_id: string }) => r.user_id);
    let chatIds: string[] = [];
    if (adminIds.length) {
      const { data: profs, error: profErr } = await supabase
        .from('profiles')
        .select('telegram_id')
        .in('user_id', adminIds)
        .not('telegram_id', 'is', null);
      if (profErr) throw profErr;
      chatIds = (profs || []).map((p: { telegram_id: string }) => String(p.telegram_id));
    }

    if (chatIds.length === 0) {
      console.warn('No super admin with linked telegram_id — reminders not sent');
      return new Response(JSON.stringify({ ok: true, sent: 0, reason: 'no_recipients' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const subIds = Array.from(new Set(reminders.map((r) => r.submission_id)));
    const { data: subs } = await supabase
      .from('contact_submissions')
      .select('id, name, phone, social, status')
      .in('id', subIds);
    const subMap = new Map((subs || []).map((s: any) => [s.id, s]));

    const esc = (t: string) =>
      t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

    let sentCount = 0;

    for (const rem of reminders) {
      const s: any = subMap.get(rem.submission_id);
      const when = new Date(rem.remind_at).toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' });
      const lines = [
        '⏰ <b>Напоминание по заявке</b>',
        s ? `👤 ${esc(s.name || '—')}` : '👤 заявка удалена',
        s?.phone ? `📞 ${esc(s.phone)}` : '',
        s?.social ? `🔗 ${esc(s.social)}` : '',
        rem.comment ? `📝 ${esc(rem.comment)}` : '',
        `🕒 ${esc(when)} (МСК)`,
      ].filter(Boolean);
      const text = lines.join('\n');

      let delivered = false;
      for (const chatId of chatIds) {
        const resp = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' }),
        });
        if (resp.ok) {
          delivered = true;
        } else {
          console.error('Telegram send failed', resp.status, await resp.text());
        }
      }

      if (delivered) {
        await supabase
          .from('application_reminders')
          .update({ sent: true, sent_at: new Date().toISOString() })
          .eq('id', rem.id);
        sentCount++;
      }
    }

    return new Response(JSON.stringify({ ok: true, sent: sentCount }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('send-admin-reminders error:', e);
    return new Response(JSON.stringify({ error: String((e as Error)?.message || e) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
