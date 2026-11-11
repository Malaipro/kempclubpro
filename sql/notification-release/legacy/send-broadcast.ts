import { serve } from "https://deno.land/std@0.208.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from "../_shared/cors.ts"

interface BroadcastPayload {
  broadcastId?: string
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

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    return new Response(
      JSON.stringify({ ok: false, error: 'missing_authorization' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  let payload: BroadcastPayload
  try {
    payload = await req.json()
  } catch {
    return new Response(
      JSON.stringify({ ok: false, error: 'invalid_json' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  const broadcastId = payload.broadcastId?.trim()
  if (!broadcastId) {
    return new Response(
      JSON.stringify({ ok: false, error: 'broadcast_id_required' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  // Клиент от имени вызывающего — чтобы достать пользователя из его JWT
  const supabaseUser = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    { global: { headers: { Authorization: authHeader } } }
  )

  const { data: userData, error: userError } = await supabaseUser.auth.getUser()

  if (userError || !userData?.user) {
    return new Response(
      JSON.stringify({ ok: false, error: 'unauthorized' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  // Service role — для проверки роли в обход RLS
  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  const { data: isAdmin, error: roleError } = await supabaseAdmin.rpc(
    'is_admin',
    { _user_id: userData.user.id }
  )

  if (roleError) {
    console.error('is_admin check failed:', roleError.message)
    return new Response(
      JSON.stringify({ ok: false, error: 'role_check_failed' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  if (isAdmin !== true) {
    return new Response(
      JSON.stringify({ ok: false, error: 'forbidden' }),
      { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  const broadcastSecret = Deno.env.get('BROADCAST_SECRET')
  if (!broadcastSecret) {
    console.error('BROADCAST_SECRET is not configured')
    return new Response(
      JSON.stringify({ ok: false, error: 'server_misconfigured' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  try {
    const res = await fetch('https://tg.kempclub.pro/api/broadcast', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Broadcast-Secret': broadcastSecret,
      },
      body: JSON.stringify({ broadcastId }),
    })

    const text = await res.text()
    let data: unknown = null
    try {
      data = text ? JSON.parse(text) : null
    } catch {
      data = text
    }

    if (!res.ok) {
      console.error(`Broadcast dispatch failed: ${res.status} ${text}`)
      return new Response(
        JSON.stringify({ ok: false, error: 'broadcast_dispatch_failed', status: res.status, data }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ ok: true, data }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Broadcast dispatch error:', error instanceof Error ? error.message : error)
    return new Response(
      JSON.stringify({ ok: false, error: 'broadcast_dispatch_error' }),
      { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
