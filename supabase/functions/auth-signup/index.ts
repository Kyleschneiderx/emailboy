// Supabase Edge Function: auth-signup
// Handles user sign-up and returns a permanent API token (if auto-confirmed)

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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')

    if (!supabaseUrl || !supabaseAnonKey) {
      return new Response(
        JSON.stringify({
          error: 'Server configuration error: Missing Supabase credentials',
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Create Supabase client with anon key (for regular auth operations)
    const supabaseClient = createClient(
      supabaseUrl,
      supabaseAnonKey,
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

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return new Response(
        JSON.stringify({ error: 'Invalid email format' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Password strength validation
    if (password.length < 6) {
      return new Response(
        JSON.stringify({ error: 'Password must be at least 6 characters' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Sign up user
    const { data, error } = await supabaseClient.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: undefined
      }
    })

    if (error) {
      if (error.message.includes('already registered') || error.message.includes('User already registered')) {
        return new Response(
          JSON.stringify({ error: 'An account with this email already exists' }),
          {
            status: 409,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }

      return new Response(
        JSON.stringify({
          error: error.message || 'Failed to create account'
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // If email confirmation is required, user will sign in after verifying
    if (data.user && !data.session) {
      return new Response(
        JSON.stringify({
          success: true,
          user: data.user,
          message: 'Account created! Please check your email to verify your account, then sign in.',
          requiresEmailConfirmation: true
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Auto-confirmed: generate permanent API token
    if (data.session && data.user) {
      const serviceClient = getServiceClient()
      const apiToken = generateApiToken()

      const { error: insertError } = await serviceClient
        .from('user_api_tokens')
        .insert({ user_id: data.user.id, token: apiToken })

      if (insertError) {
        console.error('Failed to create API token:', insertError)
        throw new Error('Failed to create API token')
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
    }

    // Fallback
    return new Response(
      JSON.stringify({
        success: true,
        user: data.user,
        message: 'Account created successfully'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  } catch (error: any) {
    console.error('Sign-up error:', error)
    return new Response(
      JSON.stringify({
        error: error.message || 'Failed to create account',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
