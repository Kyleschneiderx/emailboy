// Supabase Edge Function: create-portal-session
// Creates a Stripe Customer Portal session for subscription management

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno'
import { validateToken, isValidateError, getServiceClient } from '../_shared/validate-token.ts'

const ALLOWED_ORIGINS = [
  'https://portal.emailextractorextension.com',
  'https://portal-six-henna.vercel.app',
]

const ALLOWED_REDIRECT_HOSTS = [
  'portal.emailextractorextension.com',
  'portal-six-henna.vercel.app',
]

function getCorsHeaders(req: Request) {
  const origin = req.headers.get('Origin') || ''
  const isAllowed = ALLOWED_ORIGINS.includes(origin) || origin.startsWith('chrome-extension://')
  return {
    'Access-Control-Allow-Origin': isAllowed ? origin : ALLOWED_ORIGINS[0],
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }
}

const DEFAULT_PORTAL_URL = 'https://portal.emailextractorextension.com'

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req)

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders })
  }

  try {
    const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY') ?? ''
    const PORTAL_URL = Deno.env.get('PORTAL_URL') || DEFAULT_PORTAL_URL

    if (!STRIPE_SECRET_KEY) {
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: '2023-10-16' })

    const result = await validateToken(req)

    if (isValidateError(result)) {
      return new Response(
        JSON.stringify({ error: result.error }),
        { status: result.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabase = getServiceClient()

    const { data: subscription, error: subError } = await supabase
      .from('user_subscriptions')
      .select('stripe_customer_id')
      .eq('user_id', result.userId)
      .single()

    if (subError || !subscription?.stripe_customer_id) {
      return new Response(
        JSON.stringify({ error: 'No subscription found for this user' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Parse optional body for custom return URL
    let body: { returnUrl?: string } = {}
    try {
      body = await req.json()
    } catch (_) {
      // ignore - optional body
    }

    // Validate returnUrl against allowlist
    let returnUrl = PORTAL_URL
    if (body.returnUrl) {
      try {
        const parsed = new URL(body.returnUrl)
        if (ALLOWED_REDIRECT_HOSTS.includes(parsed.hostname)) {
          returnUrl = body.returnUrl
        }
      } catch {
        // Invalid URL, use default
      }
    }

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: subscription.stripe_customer_id,
      return_url: returnUrl
    })

    return new Response(
      JSON.stringify({ success: true, url: portalSession.url }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error: any) {
    console.error('Create portal session error:', error)
    return new Response(
      JSON.stringify({ error: 'Failed to create portal session' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
