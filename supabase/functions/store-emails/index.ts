// Supabase Edge Function: store-emails
// Stores collected emails for the authenticated user

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

  if (req.method !== 'POST') {
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

    const { emails } = await req.json()

    if (!emails || !Array.isArray(emails)) {
      return new Response(
        JSON.stringify({ error: 'Invalid request: emails array required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabase = getServiceClient()

    // Prepare email records with explicit user_id
    const emailRecords = emails.map((item: any) => ({
      email: item.email.toLowerCase().trim(),
      domain: item.domain,
      url: item.url,
      urls: item.urls || [item.url],
      first_seen: item.timestamp || item.first_seen,
      last_seen: item.lastSeen || item.last_seen || item.timestamp,
      user_id: result.userId
    }))

    // Upsert emails (service role bypasses RLS, user_id set explicitly)
    const { error } = await supabase
      .from('collected_emails')
      .upsert(emailRecords, {
        onConflict: 'email,user_id',
        ignoreDuplicates: false
      })

    if (error) {
      console.error('Database error:', error)
      throw error
    }

    return new Response(
      JSON.stringify({
        success: true,
        count: emailRecords.length,
        message: `Stored ${emailRecords.length} email(s)`
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
