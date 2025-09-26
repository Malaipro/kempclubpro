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

    // Create a Supabase client with service role key
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Create user in auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: metadata || {}
    })

    if (authError) {
      console.error('Auth error:', authError)
      return new Response(
        JSON.stringify({ error: authError.message }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Update profile with additional metadata if provided
    if (metadata && authData.user) {
      const profileData: any = {
        user_id: authData.user.id
      };

      // Map metadata to profile fields
      if (metadata.first_name) profileData.first_name = metadata.first_name;
      if (metadata.last_name) profileData.last_name = metadata.last_name;
      if (metadata.display_name) profileData.display_name = metadata.display_name;
      if (metadata.height_cm) profileData.height_cm = metadata.height_cm;
      if (metadata.weight_kg) profileData.weight_kg = metadata.weight_kg;
      if (metadata.date_of_birth) profileData.date_of_birth = metadata.date_of_birth;

      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .update(profileData)
        .eq('user_id', authData.user.id);

      if (profileError) {
        console.error('Profile update error:', profileError);
      } else {
        console.log(`Successfully updated profile for user ${authData.user.id}`);
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