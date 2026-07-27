import { serve } from "https://deno.land/std@0.208.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from "../_shared/cors.ts"

interface UtmData {
  utm_source?: string
  utm_medium?: string
  utm_campaign?: string
  utm_content?: string
  utm_term?: string
  yclid?: string
}

interface ApplicationPayload {
  name?: string
  phone?: string
  social?: string
  message?: string
  ref_code?: string
  utm_data?: UtmData
  website?: string // honeypot — реальные пользователи это поле не видят и не заполняют
}

const UTM_KEYS: (keyof UtmData)[] = [
  'utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'yclid',
]

const sanitizeUtm = (raw: unknown): UtmData | null => {
  if (!raw || typeof raw !== 'object') return null
  const out: UtmData = {}
  for (const key of UTM_KEYS) {
    const v = (raw as Record<string, unknown>)[key]
    if (typeof v === 'string' && v.trim()) out[key] = v.trim().slice(0, 255)
  }
  return Object.keys(out).length ? out : null
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ ok: false, error: 'method_not_allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  let payload: ApplicationPayload
  try {
    payload = await req.json()
  } catch {
    return new Response(
      JSON.stringify({ ok: false, error: 'invalid_json' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  // Honeypot: боты обычно заполняют все поля формы, включая скрытые.
  // Отвечаем как при успехе, но ничего не сохраняем и не уведомляем.
  if (payload.website && payload.website.trim()) {
    return new Response(
      JSON.stringify({ ok: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  const name = payload.name?.trim()
  const phone = payload.phone?.trim()
  const social = payload.social?.trim() || null
  const message = payload.message?.trim() || null
  const refCode = payload.ref_code?.trim() || null
  const utmData = sanitizeUtm(payload.utm_data)

  if (!name || !phone) {
    return new Response(
      JSON.stringify({ ok: false, error: 'name_and_phone_required' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  // null (не 'unknown') — enhanced_contact_rate_limit ожидает inet и падает на
  // произвольной строке; при null функция сама подставит inet_client_addr()
  const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0].trim()
    || req.headers.get('x-real-ip')
    || null

  const { data: rateLimitOk, error: rateLimitError } = await supabaseAdmin.rpc(
    'enhanced_contact_rate_limit',
    { p_ip_address: clientIp }
  )

  if (rateLimitError) {
    console.error('Rate limit check failed:', rateLimitError.message)
    return new Response(
      JSON.stringify({ ok: false, error: 'rate_limit_check_failed' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  if (rateLimitOk !== true) {
    return new Response(
      JSON.stringify({ ok: false, error: 'rate_limit_exceeded' }),
      { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  let referrerUserId: string | null = null
  if (refCode) {
    const { data: referrer } = await supabaseAdmin
      .from('profiles')
      .select('user_id')
      .eq('referral_code', refCode)
      .maybeSingle()

    referrerUserId = referrer?.user_id ?? null
  }

  const { data: submission, error: insertError } = await supabaseAdmin
    .from('contact_submissions')
    .insert({
      name,
      phone,
      social,
      message,
      ref_code: refCode,
      referral_code: refCode,
      referrer_user_id: referrerUserId,
      utm_data: utmData,
      status: 'new',
    })
    .select('id')
    .single()

  if (insertError) {
    console.error('Failed to insert contact submission:', insertError.message)
    return new Response(
      JSON.stringify({ ok: false, error: 'insert_failed' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  // Уведомление в Telegram — некритично, не должно проваливать сам запрос
  try {
    const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN')
    const chatId = Deno.env.get('ADMIN_TELEGRAM_CHAT_ID')

    if (botToken && chatId) {
      const lines = [
        '🆕 Новая заявка с сайта',
        `Имя: ${name}`,
        `Телефон: ${phone}`,
      ]
      if (social) lines.push(`Соцсеть: ${social}`)
      if (message) lines.push(`Сообщение: ${message}`)
      if (refCode) lines.push(`Реф. код: ${refCode}`)

      const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, text: lines.join('\n') }),
      })

      if (!res.ok) {
        console.error(`Telegram notify failed: ${res.status} ${await res.text()}`)
      }
    }
  } catch (notifyError) {
    console.error('Telegram notify error:', notifyError instanceof Error ? notifyError.message : notifyError)
  }

  return new Response(
    JSON.stringify({ ok: true, id: submission.id }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
})
