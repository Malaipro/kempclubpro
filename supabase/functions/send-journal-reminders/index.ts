import { serve } from "https://deno.land/std@0.208.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from "../_shared/cors.ts"
import { notifyUser } from "../_shared/appNotify.ts"

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

  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  try {
    const { data: profiles, error: profilesError } = await supabaseAdmin
      .from('profiles')
      .select('user_id')
      .eq('approved', true)
      .in('participant_status', ['intensive_active', 'club_resident'])

    if (profilesError) {
      console.error('Failed to load profiles:', profilesError)
      return new Response(
        JSON.stringify({ error: 'Failed to load profiles' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    let recipients = profiles ?? []

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
      // Standard reminders go to the app only (bell + push), never to Telegram.
      const r = await notifyUser(supabaseAdmin, recipient.user_id, { title: 'Ежедневник', body: text, url: '/app?section=journal', type: 'journal_reminder' })
      if (r.stored) sent++
      else failed++
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
