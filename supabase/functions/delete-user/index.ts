import { serve } from "https://deno.land/std@0.208.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from "../_shared/cors.ts"

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { userId } = await req.json()

    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'User ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create a Supabase client with service role key
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    console.log(`Deleting user: ${userId}`)

    // First, delete user from auth.users (this will cascade to profiles via foreign key)
    const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(userId)

    if (authDeleteError) {
      console.error('Auth delete error:', authDeleteError)
      return new Response(
        JSON.stringify({ error: `Ошибка удаления пользователя: ${authDeleteError.message}` }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Clean up any remaining data in other tables
    const tablesToClean = [
      'leaderboard',
      'user_activities',
      'training_sessions',
      'cooper_test_results',
      'ascetic_activities',
      'homework_submissions',
      'lectures',
      'tactical_sessions',
      'crash_tests',
      'hero_races',
      'participant_habits',
      'habit_progress',
      'user_roles',
      'notifications'
    ]

    for (const table of tablesToClean) {
      try {
        const { error: cleanupError } = await supabaseAdmin
          .from(table)
          .delete()
          .eq('user_id', userId)
        
        if (cleanupError) {
          console.error(`Error cleaning up ${table}:`, cleanupError)
          // Continue with other tables even if one fails
        }
      } catch (err) {
        console.error(`Failed to clean up table ${table}:`, err)
        // Continue with other tables
      }
    }

    console.log(`Successfully deleted user ${userId}`)

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Пользователь успешно удален'
      }),
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