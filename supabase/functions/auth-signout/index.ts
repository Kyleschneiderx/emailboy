// Supabase Edge Function: auth-signout
// Deletes the user's permanent API token (signs them out)

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { getServiceClient } from '../_shared/validate-token.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'No authorization token provided' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const token = authHeader.replace('Bearer ', '')
    const supabase = getServiceClient()

    // Delete the token from the database
    const { error } = await supabase
      .from('user_api_tokens')
      .delete()
      .eq('token', token)

    if (error) {
      console.error('Failed to delete token:', error)
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Signed out successfully' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error: any) {
    console.error('Sign-out error:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to sign out' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
