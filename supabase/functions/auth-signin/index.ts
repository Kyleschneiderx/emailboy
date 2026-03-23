// Supabase Edge Function: auth-signin
// Handles user sign-in and returns a permanent API token

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { getServiceClient, generateApiToken } from '../_shared/validate-token.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create Supabase client for auth (anon key)
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Parse request body
    const { email, password } = await req.json()

    // Validation
    if (!email || !password) {
      return new Response(
        JSON.stringify({ error: 'Email and password are required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Sign in user via Supabase auth
    const { data, error } = await supabaseClient.auth.signInWithPassword({
      email,
      password
    })

    if (error) {
      if (error.message.includes('Invalid login credentials')) {
        return new Response(
          JSON.stringify({ error: 'Invalid email or password' }),
          {
            status: 401,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }
      if (error.message.includes('Email not confirmed')) {
        return new Response(
          JSON.stringify({ error: 'Please verify your email address before signing in' }),
          {
            status: 403,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }
      throw error
    }

    if (!data.user) {
      return new Response(
        JSON.stringify({ error: 'Failed to sign in' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Generate or retrieve permanent API token
    const serviceClient = getServiceClient()

    // Check if user already has a token
    const { data: existingToken } = await serviceClient
      .from('user_api_tokens')
      .select('token')
      .eq('user_id', data.user.id)
      .single()

    let apiToken: string

    if (existingToken?.token) {
      apiToken = existingToken.token
    } else {
      // Generate new permanent token
      apiToken = generateApiToken()
      const { error: insertError } = await serviceClient
        .from('user_api_tokens')
        .insert({ user_id: data.user.id, token: apiToken })

      if (insertError) {
        console.error('Failed to create API token:', insertError)
        throw new Error('Failed to create API token')
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        apiToken,
        user: {
          id: data.user.id,
          email: data.user.email,
          created_at: data.user.created_at
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  } catch (error: any) {
    console.error('Sign-in error:', error)
    return new Response(
      JSON.stringify({
        error: error.message || 'Failed to sign in',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
