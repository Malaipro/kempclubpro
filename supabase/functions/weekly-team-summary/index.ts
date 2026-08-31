import { serve } from "https://deno.land/std@0.208.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from "../_shared/cors.ts"

const ANTHROPIC_MODEL = 'claude-sonnet-4-6'
const TRAINING_TARGET = 3
const JOURNAL_TARGET = 7

const SYSTEM_PROMPT =
  'Ты куратор мужского клуба КЭМП. Делаешь еженедельную сводку для капитана команды. ' +
  'Стиль: мужской, прямой, конкретный, без мотивационного пафоса.'

interface RequestBody {
  team_id?: string
}

interface CaptainTeam {
  id: string
  name: string | null
  captain_user_id: string
  stream_id: string
}

interface TeamMember {
  user_id: string
  traffic_light: string
}

interface Emotion {
  emotion_name: string
  intensity: number
}

interface MemberStats {
  user_id: string
  display_name: string
  traffic_light: string
  trainings: number
  homework_submitted: boolean
  homework_count: number
  journal_days: number
  last_emotions: Emotion[]
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY')
  if (!anthropicKey) {
    return new Response(
      JSON.stringify({ ok: false, error: 'ANTHROPIC_API_KEY is not configured' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  let targetTeamId: string | undefined
  if (req.method === 'POST') {
    try {
      const body = (await req.json()) as RequestBody
      targetTeamId = body?.team_id
    } catch {
      // Пустое тело — обычный запуск по cron, это ок
    }
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  const weekEnd = new Date()
  const weekStart = new Date(weekEnd)
  weekStart.setDate(weekStart.getDate() - 7)
  const weekStartStr = weekStart.toISOString().slice(0, 10)
  const weekEndStr = weekEnd.toISOString().slice(0, 10)
  const weekStartIso = weekStart.toISOString()

  try {
    // Активные потоки
    const { data: activeStreams, error: streamsError } = await supabase
      .from('streams')
      .select('id')
      .eq('is_active', true)

    if (streamsError) {
      console.error('Failed to load active streams:', streamsError)
      return new Response(
        JSON.stringify({ ok: false, error: 'Failed to load active streams' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const activeStreamIds = (activeStreams ?? []).map((s: { id: string }) => s.id)

    if (activeStreamIds.length === 0) {
      return new Response(
        JSON.stringify({ ok: true, processed: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Команды
    let teamsQuery = supabase
      .from('captain_teams')
      .select('id, name, captain_user_id, stream_id')
      .in('stream_id', activeStreamIds)

    if (targetTeamId) {
      teamsQuery = teamsQuery.eq('id', targetTeamId)
    }

    const { data: teams, error: teamsError } = await teamsQuery

    if (teamsError) {
      console.error('Failed to load teams:', teamsError)
      return new Response(
        JSON.stringify({ ok: false, error: 'Failed to load teams' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    let processed = 0

    for (const team of (teams ?? []) as CaptainTeam[]) {
      try {
        // Участники команды
        const { data: memberRows, error: membersError } = await supabase
          .from('captain_team_members')
          .select('user_id, traffic_light')
          .eq('team_id', team.id)

        if (membersError) {
          console.error(`Failed to load members for team ${team.id}:`, membersError)
          continue
        }

        const members = (memberRows ?? []) as TeamMember[]
        if (members.length === 0) continue

        const memberIds = members.map((m) => m.user_id)
        const allProfileIds = [...new Set([...memberIds, team.captain_user_id])]

        // Профили (имена)
        const { data: profileRows, error: profilesError } = await supabase
          .from('profiles')
          .select('user_id, display_name')
          .in('user_id', allProfileIds)

        if (profilesError) {
          console.error(`Failed to load profiles for team ${team.id}:`, profilesError)
          continue
        }

        const nameByUser = new Map<string, string>()
        for (const p of (profileRows ?? []) as Array<{ user_id: string; display_name: string | null }>) {
          nameByUser.set(p.user_id, p.display_name?.trim() || 'Без имени')
        }

        // Тренировки
        const { data: checkins } = await supabase
          .from('activity_checkins')
          .select('user_id')
          .in('user_id', memberIds)
          .gte('checked_at', weekStartIso)

        const trainingsByUser = new Map<string, number>()
        for (const row of (checkins ?? []) as Array<{ user_id: string }>) {
          trainingsByUser.set(row.user_id, (trainingsByUser.get(row.user_id) ?? 0) + 1)
        }

        // Домашние задания
        const { data: homework } = await supabase
          .from('homework_submissions')
          .select('user_id')
          .in('user_id', memberIds)
          .in('status', ['approved', 'pending'])
          .gte('submitted_at', weekStartIso)

        const homeworkByUser = new Map<string, number>()
        for (const row of (homework ?? []) as Array<{ user_id: string }>) {
          homeworkByUser.set(row.user_id, (homeworkByUser.get(row.user_id) ?? 0) + 1)
        }

        // Дневник
        const { data: entries } = await supabase
          .from('journal_entries')
          .select('user_id, entry_date, journal_emotions ( emotion_name, intensity )')
          .in('user_id', memberIds)
          .gte('entry_date', weekStartStr)
          .lte('entry_date', weekEndStr)
          .order('entry_date', { ascending: true })

        const journalDaysByUser = new Map<string, number>()
        const lastEmotionsByUser = new Map<string, Emotion[]>()
        for (const row of (entries ?? []) as Array<{
          user_id: string
          entry_date: string
          journal_emotions: Emotion[] | null
        }>) {
          journalDaysByUser.set(row.user_id, (journalDaysByUser.get(row.user_id) ?? 0) + 1)
          const emotions = row.journal_emotions ?? []
          if (emotions.length > 0) {
            // записи отсортированы по возрастанию даты — перезаписываем более свежими
            lastEmotionsByUser.set(row.user_id, emotions)
          }
        }

        const stats: MemberStats[] = members.map((m) => ({
          user_id: m.user_id,
          display_name: nameByUser.get(m.user_id) ?? 'Без имени',
          traffic_light: m.traffic_light,
          trainings: trainingsByUser.get(m.user_id) ?? 0,
          homework_submitted: (homeworkByUser.get(m.user_id) ?? 0) > 0,
          homework_count: homeworkByUser.get(m.user_id) ?? 0,
          journal_days: journalDaysByUser.get(m.user_id) ?? 0,
          last_emotions: lastEmotionsByUser.get(m.user_id) ?? [],
        }))

        const teamName = team.name?.trim() || 'Без названия'
        const captainName = nameByUser.get(team.captain_user_id) ?? 'Без имени'

        const membersBlock = stats
          .map((s) => {
            const emotionsText = s.last_emotions
              .map((e) => `${e.emotion_name} (${e.intensity}/10)`)
              .join(', ')
            return (
              `- ${s.display_name}: тренировок ${s.trainings}/${TRAINING_TARGET}, ` +
              `ДЗ ${s.homework_submitted ? 'сдал' : 'нет'}, ` +
              `дневник ${s.journal_days}/${JOURNAL_TARGET} дней, ` +
              `статус ${s.traffic_light}` +
              (emotionsText ? `, эмоции: ${emotionsText}` : '')
            )
          })
          .join('\n')

        const prompt =
          `Команда: ${teamName}, Капитан: ${captainName}\n` +
          `Период: ${weekStartStr} — ${weekEndStr}\n\n` +
          `Участники:\n${membersBlock}\n\n` +
          `Сделай краткую сводку:\n` +
          `1. Общая картина команды (1-2 предложения)\n` +
          `2. Лидеры недели (кто молодец и почему)\n` +
          `3. Нужно внимание (кто проседает и в чём)\n` +
          `4. Рекомендация капитану (1-2 конкретных действия)`

        const summary = await requestSummary(anthropicKey, SYSTEM_PROMPT, prompt)
        if (!summary) continue

        const { error: insertError } = await supabase
          .from('team_weekly_summaries')
          .insert({
            team_id: team.id,
            captain_user_id: team.captain_user_id,
            week_start: weekStartStr,
            week_end: weekEndStr,
            summary,
            raw_data: {
              team_name: teamName,
              captain_name: captainName,
              stream_id: team.stream_id,
              members: stats,
            },
          })

        if (insertError) {
          console.error(`Failed to save summary for team ${team.id}:`, insertError)
          continue
        }

        processed++
      } catch (innerError) {
        console.error(`Error processing team ${team.id}:`, innerError)
      }
    }

    return new Response(
      JSON.stringify({ ok: true, processed }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Function error:', error)
    return new Response(
      JSON.stringify({ ok: false, error: error instanceof Error ? error.message : 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

async function requestSummary(
  anthropicKey: string,
  systemPrompt: string,
  prompt: string
): Promise<string | null> {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': anthropicKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: ANTHROPIC_MODEL,
      max_tokens: 500,
      messages: [{ role: 'user', content: prompt }],
      system: systemPrompt,
    }),
  })

  if (!response.ok) {
    console.error(`Anthropic API error: ${response.status} ${await response.text()}`)
    return null
  }

  const data = await response.json()
  const text = data?.content?.find((block: { type: string }) => block.type === 'text')?.text

  return typeof text === 'string' ? text.trim() : null
}
