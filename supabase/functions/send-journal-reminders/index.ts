import { serve } from "https://deno.land/std@0.208.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from "../_shared/cors.ts"

type ReminderType = 'morning' | 'evening'

const MESSAGES: Record<ReminderType, string> = {
  morning: 'Доброе утро! Не забудь заполнить ежедневник КЭМП сегодня 📝',
  evening: 'Как прошёл день? Заполни ежедневник КЭМП — это займёт 2 минуты 🌙',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const url = new URL(req.url)
  const type = url.searchParams.get('type') as ReminderType | null

  if (type !== 'morning' && type !== 'evening') {
    return new Response(
      JSON.stringify({ error: 'Query param "type" must be "morning" or "evening"' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN')
  const miniAppUrl = Deno.env.get('MINI_APP_URL')

  if (!botToken || !miniAppUrl) {
    return new Response(
      JSON.stringify({ error: 'TELEGRAM_BOT_TOKEN or MINI_APP_URL is not configured' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  try {
    const { data: profiles, error: profilesError } = await supabaseAdmin
      .from('profiles')
      .select('user_id, telegram_id')
      .in('participant_status', ['intensive_active', 'club_resident'])
      .not('telegram_id', 'is', null)

    if (profilesError) {
      console.error('Failed to load profiles:', profilesError)
      return new Response(
        JSON.stringify({ error: 'Failed to load profiles' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    let recipients = (profiles ?? []).filter((p) => p.telegram_id)

    if (type === 'evening' && recipients.length > 0) {
      const today = new Date().toISOString().slice(0, 10)

      const { data: entries, error: entriesError } = await supabaseAdmin
        .from('journal_entries')
        .select('user_id')
        .eq('entry_date', today)
        .in('user_id', recipients.map((p) => p.user_id))

      if (entriesError) {
        console.error('Failed to load journal_entries:', entriesError)
        return new Response(
          JSON.stringify({ error: 'Failed to load journal_entries' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const filledUserIds = new Set((entries ?? []).map((e) => e.user_id))
      recipients = recipients.filter((p) => !filledUserIds.has(p.user_id))
    }

    const text = MESSAGES[type]
    let sent = 0
    let failed = 0

    for (const recipient of recipients) {
      const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: recipient.telegram_id,
          text,
          reply_markup: {
            inline_keyboard: [[
              { text: 'Открыть ежедневник', url: miniAppUrl },
            ]],
          },
        }),
      })

      if (res.ok) {
        sent++
      } else {
        failed++
        console.error(`Failed to send to telegram_id ${recipient.telegram_id}: ${res.status} ${await res.text()}`)
      }
    }

    return new Response(
      JSON.stringify({ type, candidates: recipients.length, sent, failed }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Function error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
