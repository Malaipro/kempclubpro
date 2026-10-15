import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Вызывается только триггером БД (schedule_participants) — пересылает текст администратору в Telegram.
Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 })

  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
  const { data: setting } = await supabase
    .from('internal_settings').select('value').eq('key', 'notify_booking_secret').maybeSingle()
  const provided = req.headers.get('x-notify-secret')
  if (!setting?.value || provided !== setting.value) return new Response('Unauthorized', { status: 401 })

  let text = ''
  try { text = String((await req.json())?.text ?? '').slice(0, 3500) } catch { /* ignore */ }
  if (!text) return new Response(JSON.stringify({ ok: false, error: 'empty' }), { status: 400 })

  const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN')
  const chatId = Deno.env.get('ADMIN_TELEGRAM_CHAT_ID')
  if (!botToken || !chatId) {
    console.error('TELEGRAM_BOT_TOKEN / ADMIN_TELEGRAM_CHAT_ID not configured')
    return new Response(JSON.stringify({ ok: false, error: 'not_configured' }), { status: 500 })
  }

  const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text }),
  })
  if (!res.ok) {
    const body = await res.text()
    console.error(`Telegram failed [${res.status}]: ${body}`)
    return new Response(JSON.stringify({ ok: false, status: res.status, details: body }), { status: 502 })
  }
  return new Response(JSON.stringify({ ok: true }), { headers: { 'Content-Type': 'application/json' } })
})
