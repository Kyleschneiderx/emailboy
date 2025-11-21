// Supabase Edge Function: auth-signup
// Handles user sign-up with server-side validation

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

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
    // Get environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')
    
    // Log for debugging (remove in production)
    console.log('Environment check:', {
      hasUrl: !!supabaseUrl,
      hasKey: !!supabaseAnonKey,
      urlLength: supabaseUrl?.length || 0
    })

    if (!supabaseUrl || !supabaseAnonKey) {
      return new Response(
        JSON.stringify({ 
          error: 'Server configuration error: Missing Supabase credentials',
          details: 'Edge function environment variables not set'
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

    // Sign up user with Supabase Auth (using regular API, not admin)
    const { data, error } = await supabaseClient.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: undefined // No redirect needed for extension
      }
    })

    if (error) {
      // Handle specific errors
      if (error.message.includes('already registered') || error.message.includes('User already registered')) {
        return new Response(
          JSON.stringify({ error: 'An account with this email already exists' }),
          { 
            status: 409, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }
      
      // Return error with proper status
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

    // If email confirmation is required, user will need to verify first
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

    // If session is created (email auto-confirmed), return it
    if (data.session && data.user) {
      return new Response(
        JSON.stringify({ 
          success: true,
          user: data.user,
          session: {
            access_token: data.session.access_token,
            refresh_token: data.session.refresh_token,
            expires_at: data.session.expires_at,
            expires_in: data.session.expires_in,
            token_type: data.session.token_type,
            user: data.user
          }
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Fallback response
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
        details: error.toString()
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})

