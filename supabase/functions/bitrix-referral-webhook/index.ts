// Bitrix24 referral webhook (STUB / заготовка)
//
// Назначение (на будущее):
//  - Битрикс24 при переходе сделки в статус «Оплачено» / «Успешно реализовано»
//    вызывает этот endpoint (webhook).
//  - Функция ищет referral_lead по bitrix_lead_id / phone / email.
//  - Переводит заявку в confirmed/rewarded и начисляет коины через
//    award_coins_by_rule (rule_code = 'referral_confirmed'), с защитой от дублей.
//
// Безопасность: запрос должен содержать заголовок X-Bitrix-Secret, совпадающий
// с секретом BITRIX_WEBHOOK_SECRET. Пока секрет не настроен — функция отвечает 501.

import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'

interface BitrixPayload {
  bitrix_lead_id?: string
  bitrix_deal_id?: string
  bitrix_status?: string
  phone?: string
  email?: string
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status,
    })

  try {
    const secret = Deno.env.get('BITRIX_WEBHOOK_SECRET')
    if (!secret) {
      return json(
        { ok: false, error: 'not_configured', message: 'Интеграция с Битрикс24 ещё не настроена (нет BITRIX_WEBHOOK_SECRET).' },
        501,
      )
    }

    if (req.headers.get('X-Bitrix-Secret') !== secret) {
      return json({ ok: false, error: 'unauthorized' }, 401)
    }

    const payload = (await req.json().catch(() => ({}))) as BitrixPayload
    const { bitrix_lead_id, bitrix_deal_id, bitrix_status, phone, email } = payload

    if (!bitrix_lead_id && !phone && !email) {
      return json({ ok: false, error: 'missing_identifier' }, 400)
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // Find the referral lead by available identifiers
    let query = supabase.from('referral_leads').select('*').limit(1)
    if (bitrix_lead_id) {
      query = query.eq('bitrix_lead_id', bitrix_lead_id)
    } else if (phone) {
      query = query.eq('phone', phone)
    } else if (email) {
      query = query.eq('email', email)
    }

    const { data: leads, error: findErr } = await query
    if (findErr) throw findErr
    const lead = leads?.[0]

    if (!lead) {
      return json({ ok: false, error: 'lead_not_found' }, 404)
    }

    // Update Bitrix tracking fields
    await supabase
      .from('referral_leads')
      .update({
        bitrix_lead_id: bitrix_lead_id ?? lead.bitrix_lead_id,
        bitrix_deal_id: bitrix_deal_id ?? lead.bitrix_deal_id,
        bitrix_status: bitrix_status ?? lead.bitrix_status,
        bitrix_synced_at: new Date().toISOString(),
      })
      .eq('id', lead.id)

    // Idempotent: skip if already rewarded
    if (lead.reward_issued) {
      return json({ ok: true, awarded: false, duplicate: true, lead_id: lead.id })
    }

    // Award coins via rule (award_coins_by_rule guards against duplicates by source)
    const { data: award, error: awardErr } = await supabase.rpc('award_coins_by_rule', {
      p_user_id: lead.referrer_user_id,
      p_rule_code: 'referral_confirmed',
      p_source_type: 'referral_lead',
      p_source_id: lead.id,
      p_reason: 'Подтверждённый реферал (Битрикс24)',
    })
    if (awardErr) throw awardErr

    await supabase
      .from('referral_leads')
      .update({
        status: 'rewarded',
        reward_issued: true,
        bonus_awarded: true,
        confirmed_at: lead.confirmed_at ?? new Date().toISOString(),
      })
      .eq('id', lead.id)

    return json({ ok: true, awarded: true, lead_id: lead.id, award })
  } catch (e) {
    console.error('bitrix-referral-webhook error:', e)
    return json({ ok: false, error: String(e) }, 500)
  }
})
