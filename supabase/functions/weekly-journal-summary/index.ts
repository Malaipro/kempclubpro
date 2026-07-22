import { serve } from "https://deno.land/std@0.208.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from "../_shared/cors.ts"

const ANTHROPIC_MODEL = 'claude-sonnet-4-6'

const STANDARD_PROMPT =
  'Ты куратор мужского клуба КЭМП. Сделай краткую (3-5 предложений) ' +
  'поддерживающую сводку недели участника на основе его дневниковых записей. ' +
  'Тон: мужской, прямой, без пафоса. Отметь прогресс и дай один конкретный совет.'

const PERSONAL_PROMPT =
  STANDARD_PROMPT +
  ' Это черновик для куратора — выдели красными флагами что требует личного внимания.'

interface Profile {
  user_id: string
  display_name: string | null
  first_name: string | null
  last_name: string | null
  telegram_id: string | null
  coaching_type: 'standard' | 'personal'
}

function resolveDisplayName(profile: Profile): string | null {
  if (profile.display_name) return profile.display_name
  const combined = [profile.first_name, profile.last_name].filter(Boolean).join(' ').trim()
  return combined || null
}

interface RequestBody {
  user_id?: string
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY')
  const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN')

  if (!anthropicKey || !botToken) {
    return new Response(
      JSON.stringify({ error: 'ANTHROPIC_API_KEY or TELEGRAM_BOT_TOKEN is not configured' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  let targetUserId: string | undefined
  if (req.method === 'POST') {
    try {
      const body = (await req.json()) as RequestBody
      targetUserId = body?.user_id
    } catch {
      // Пустое тело — обычный запуск по cron, это ок
    }
  }

  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  try {
    let profilesQuery = supabaseAdmin
      .from('profiles')
      .select('user_id, display_name, first_name, last_name, telegram_id, coaching_type')
      .not('telegram_id', 'is', null)

    if (targetUserId) {
      profilesQuery = profilesQuery.eq('user_id', targetUserId)
    } else {
      profilesQuery = profilesQuery
        .in('participant_status', ['intensive_active', 'club_resident'])
        .eq('approved', true)
    }

    const { data: profiles, error: profilesError } = await profilesQuery

    if (profilesError) {
      console.error('Failed to load profiles:', profilesError)
      return new Response(
        JSON.stringify({ error: 'Failed to load profiles' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const recipients = ((profiles ?? []) as Profile[]).filter((p) => p.telegram_id)

    const weekEnd = new Date()
    const weekStart = new Date(weekEnd)
    weekStart.setDate(weekStart.getDate() - 7)
    const weekStartStr = weekStart.toISOString().slice(0, 10)
    const weekEndStr = weekEnd.toISOString().slice(0, 10)

    let processed = 0
    let skipped = 0
    let sentTelegram = 0
    let draftsSaved = 0
    let failed = 0

    for (const profile of recipients) {
      try {
        const { data: entries, error: entriesError } = await supabaseAdmin
          .from('journal_entries')
          .select(`
            id,
            entry_date,
            day_type,
            journal_emotions ( emotion_name, intensity ),
            journal_answers ( answer_text, journal_prompts ( question_text ) )
          `)
          .eq('user_id', profile.user_id)
          .gte('entry_date', weekStartStr)
          .lte('entry_date', weekEndStr)
          .order('entry_date', { ascending: true })

        if (entriesError) {
          console.error(`Failed to load journal entries for ${profile.user_id}:`, entriesError)
          failed++
          continue
        }

        if (!entries || entries.length === 0) {
          skipped++
          continue
        }

        const journalText = entries
          .map((entry: Record<string, unknown>) => {
            const emotions = (entry.journal_emotions as Array<{ emotion_name: string; intensity: number }> | null) ?? []
            const answers = (entry.journal_answers as Array<{ answer_text: string; journal_prompts: { question_text: string } | null }> | null) ?? []

            const emotionsText = emotions
              .map((e) => `${e.emotion_name} (${e.intensity}/10)`)
              .join(', ')

            const answersText = answers
              .map((a) => `- ${a.journal_prompts?.question_text ?? 'Вопрос'}: ${a.answer_text}`)
              .join('\n')

            return [
              `Дата: ${entry.entry_date}`,
              emotionsText ? `Эмоции: ${emotionsText}` : null,
              answersText || null,
            ]
              .filter(Boolean)
              .join('\n')
          })
          .join('\n\n')

        const systemPrompt = profile.coaching_type === 'personal' ? PERSONAL_PROMPT : STANDARD_PROMPT

        const summaryText = await requestSummary(anthropicKey, systemPrompt, resolveDisplayName(profile), journalText)

        if (!summaryText) {
          failed++
          continue
        }

        if (profile.coaching_type === 'personal') {
          const { error: upsertError } = await supabaseAdmin
            .from('weekly_summaries')
            .upsert(
              {
                user_id: profile.user_id,
                week_start: weekStartStr,
                summary_text: summaryText,
                status: 'draft',
              },
              { onConflict: 'user_id,week_start' }
            )

          if (upsertError) {
            console.error(`Failed to save draft for ${profile.user_id}:`, upsertError)
            failed++
            continue
          }

          draftsSaved++
        } else {
          const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: profile.telegram_id,
              text: `📋 Сводка недели\n\n${summaryText}`,
            }),
          })

          if (res.ok) {
            sentTelegram++
          } else {
            console.error(`Failed to send telegram to ${profile.telegram_id}: ${res.status} ${await res.text()}`)
            failed++
            continue
          }
        }

        processed++
      } catch (innerError) {
        console.error(`Error processing profile ${profile.user_id}:`, innerError)
        failed++
      }
    }

    return new Response(
      JSON.stringify({
        candidates: recipients.length,
        processed,
        skipped,
        sentTelegram,
        draftsSaved,
        failed,
        weekStart: weekStartStr,
        weekEnd: weekEndStr,
      }),
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

async function requestSummary(
  anthropicKey: string,
  systemPrompt: string,
  fullName: string | null,
  journalText: string
): Promise<string | null> {
  const userMessage = `Участник: ${fullName ?? 'Без имени'}\n\nЗаписи ежедневника за неделю:\n\n${journalText}`

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': anthropicKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: ANTHROPIC_MODEL,
      max_tokens: 1024,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
    }),
  })

  if (!res.ok) {
    console.error(`Anthropic API error: ${res.status} ${await res.text()}`)
    return null
  }

  const data = await res.json()
  const text = data?.content?.find((block: { type: string }) => block.type === 'text')?.text

  return typeof text === 'string' ? text.trim() : null
}
