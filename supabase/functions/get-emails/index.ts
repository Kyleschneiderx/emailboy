// Supabase Edge Function: get-emails
// Retrieves user's collected emails

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { validateToken, isValidateError, getServiceClient } from '../_shared/validate-token.ts'

const ALLOWED_ORIGINS = [
  'https://portal.emailextractorextension.com',
  'https://portal-six-henna.vercel.app',
]

function getCorsHeaders(req: Request) {
  const origin = req.headers.get('Origin') || ''
  const isAllowed = ALLOWED_ORIGINS.includes(origin) || origin.startsWith('chrome-extension://')
  return {
    'Access-Control-Allow-Origin': isAllowed ? origin : ALLOWED_ORIGINS[0],
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req)

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'GET' && req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders })
  }

  try {
    const result = await validateToken(req)

    if (isValidateError(result)) {
      return new Response(
        JSON.stringify({ error: result.error }),
        { status: result.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabase = getServiceClient()

    // Get query parameters
    const url = new URL(req.url)
    const limit = parseInt(url.searchParams.get('limit') || '100')
    const offset = parseInt(url.searchParams.get('offset') || '0')

    // Fetch user's emails with explicit user_id filter (service role bypasses RLS)
    const { data: emails, error } = await supabase
      .from('collected_emails')
      .select('*')
      .eq('user_id', result.userId)
      .order('last_seen', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      console.error('Database error:', error)
      throw error
    }

    const transformedEmails = (emails || []).map(item => ({
      email: item.email,
      domain: item.domain,
      url: item.url,
      urls: item.urls || [item.url],
      timestamp: item.first_seen,
      lastSeen: item.last_seen
    }))

    return new Response(
      JSON.stringify({
        success: true,
        emails: transformedEmails,
        count: transformedEmails.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error: any) {
    console.error('Edge function error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
