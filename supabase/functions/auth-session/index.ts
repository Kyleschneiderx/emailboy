// Supabase Edge Function: auth-session
// Validates API token and returns current user info

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { validateToken, isValidateError } from '../_shared/validate-token.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const result = await validateToken(req)

    if (isValidateError(result)) {
      return new Response(
        JSON.stringify({ authenticated: false, error: result.error }),
        { status: result.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({
        authenticated: true,
        user: {
          id: result.userId,
          email: result.email,
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error: any) {
    console.error('Session validation error:', error)
    return new Response(
      JSON.stringify({ authenticated: false, error: error.message || 'Failed to validate session' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
