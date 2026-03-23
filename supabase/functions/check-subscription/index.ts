// Supabase Edge Function: check-subscription
// Checks if user has an active premium subscription

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

    // Check subscription status
    const { data: subscription, error } = await supabase
      .from('user_subscriptions')
      .select('status, plan, current_period_end, cancel_at_period_end')
      .eq('user_id', result.userId)
      .single()

    if (error && error.code !== 'PGRST116') {
      console.error('Subscription query error:', error)
      throw error
    }

    const isPremium = subscription &&
                     subscription.status === 'active' &&
                     new Date(subscription.current_period_end) > new Date()

    return new Response(
      JSON.stringify({
        isPremium,
        subscription: subscription ? {
          status: subscription.status,
          plan: subscription.plan || 'premium',
          current_period_end: subscription.current_period_end,
          cancel_at_period_end: subscription.cancel_at_period_end || false
        } : null
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error: any) {
    console.error('Subscription check error:', error)
    return new Response(
      JSON.stringify({ error: 'Failed to check subscription' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
