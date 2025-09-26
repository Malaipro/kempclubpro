import { serve } from "https://deno.land/std@0.208.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from "../_shared/cors.ts"

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { email, password, metadata, role } = await req.json()

    if (!email) {
      return new Response(
        JSON.stringify({ error: 'Email is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create a Supabase client with service role key
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const safePassword = password && String(password).length >= 6
      ? password
      : crypto.randomUUID()

    // Try to create user, handle if already exists
    let authData: any = null
    
    try {
      // Create user with auto-confirmed email (no email confirmation needed)
      const { data: newUserData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password: safePassword,
        email_confirm: true, // Auto-confirm email
        user_metadata: metadata || {}
      })

      if (authError) {
        // Check if user already exists
        if (authError.message?.includes('already been registered') || authError.status === 422) {
          console.log(`User ${email} already exists, skipping invite and proceeding to profile update`)

          // Find existing user by email
          const { data: userData, error: listErr } = await supabaseAdmin.auth.admin.listUsers()
          if (listErr) {
            console.error('List users error:', listErr)
            return new Response(
              JSON.stringify({ error: 'Не удалось получить список пользователей' }),
              { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
          }

          const existingUser = userData.users.find((u: any) => u.email?.toLowerCase() === email.toLowerCase())

          if (existingUser) {
            authData = { user: existingUser }
          } else {
            return new Response(
              JSON.stringify({ error: 'Пользователь с таким email уже существует, но не найден в списке' }),
              { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
          }
        } else {
          console.error('Auth error:', authError)
          return new Response(
            JSON.stringify({ error: `Ошибка отправки приглашения: ${authError.message}` }),
            { 
              status: 400, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          )
        }
      } else {
        authData = newUserData
        console.log(`Successfully created user ${email} with auto-confirmed email`)
      }
    } catch (error) {
      console.error('Unexpected error:', error)
      return new Response(
        JSON.stringify({ error: 'Внутренняя ошибка сервера' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Create or update profile with additional metadata if provided
    if (authData.user) {
      const md = (metadata || {}) as Record<string, any>
      const profileData: any = {
        user_id: authData.user.id,
        first_name: md.first_name ?? null,
        last_name: md.last_name ?? null,
        display_name: md.display_name ?? ((`${md.first_name ?? ''} ${md.last_name ?? ''}`.trim()) || null),
        email: email,
        height_cm: md.height_cm ?? null,
        weight_kg: md.weight_kg ?? null,
        date_of_birth: md.date_of_birth ?? null,
        phone: md.phone ?? null,
        telegram: md.telegram ?? null,
        approved: true, // Auto-approve since admin is creating them
        approved_at: new Date().toISOString(),
        approved_by: authData.user.id,
        leaderboard_visible: true,
      }

      // Check if profile already exists
      const { data: existingProfile } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('user_id', authData.user.id)
        .single()

      if (existingProfile) {
        // Update existing profile
        const { error: updateErr } = await supabaseAdmin
          .from('profiles')
          .update(profileData)
          .eq('user_id', authData.user.id)
        
        if (updateErr) {
          console.error('Profile update failed:', updateErr)
        } else {
          console.log(`Successfully updated profile for user ${authData.user.id}`)
        }
      } else {
        // Create new profile
        const { error: insertErr } = await supabaseAdmin
          .from('profiles')
          .insert(profileData)

        if (insertErr) {
          console.error('Profile creation failed:', insertErr)
        } else {
          console.log(`Successfully created profile for user ${authData.user.id}`)
          
          // Initialize leaderboard entry for new profile
          const { error: leaderboardErr } = await supabaseAdmin
            .from('leaderboard')
            .insert({
              user_id: authData.user.id,
              total_points: 0,
              rank_position: 0
            })
          
          if (leaderboardErr) {
            console.error('Leaderboard initialization failed:', leaderboardErr)
          } else {
            console.log(`Successfully initialized leaderboard for user ${authData.user.id}`)
          }
        }
      }
    }

    // If role is specified, add it to user_roles table
    if (role && authData.user) {
      const { error: roleError } = await supabaseAdmin
        .from('user_roles')
        .insert({
          user_id: authData.user.id,
          role: role,
          assigned_by: authData.user.id
        })

      if (roleError) {
        console.error('Role assignment error:', roleError)
        // Don't fail the whole operation, just log the error
      } else {
        console.log(`Successfully assigned role ${role} to user ${authData.user.id}`)
      }
    }

    return new Response(
      JSON.stringify({ user: authData.user }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Function error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})