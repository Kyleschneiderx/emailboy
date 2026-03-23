// Supabase Edge Function: create-checkout
// Creates a Stripe checkout session for premium subscription

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno'
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
    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY')
    const priceId = Deno.env.get('STRIPE_PRICE_ID')
    const portalUrl = Deno.env.get('PORTAL_URL') || DEFAULT_PORTAL_URL

    if (!stripeKey || !priceId) {
      console.error('Missing required environment variables')
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const stripe = new Stripe(stripeKey, { apiVersion: '2023-10-16' })

    const result = await validateToken(req)

    if (isValidateError(result)) {
      return new Response(
        JSON.stringify({ error: result.error }),
        { status: result.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabase = getServiceClient()

    // Check if user already has an active subscription
    const { data: existingSub } = await supabase
      .from('user_subscriptions')
      .select('status, stripe_customer_id')
      .eq('user_id', result.userId)
      .single()

    if (existingSub?.status === 'active') {
      return new Response(
        JSON.stringify({ error: 'You already have an active subscription' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create checkout session
    const sessionOptions: Stripe.Checkout.SessionCreateParams = {
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      mode: 'subscription',
      success_url: `${portalUrl}?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${portalUrl}?checkout=cancel`,
      metadata: { user_id: result.userId },
      client_reference_id: result.userId,
    }

    if (existingSub?.stripe_customer_id) {
      sessionOptions.customer = existingSub.stripe_customer_id
    } else {
      sessionOptions.customer_email = result.email
    }

    const session = await stripe.checkout.sessions.create(sessionOptions)

    return new Response(
      JSON.stringify({ sessionId: session.id, url: session.url }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error: any) {
    console.error('Create checkout error:', error)
    return new Response(
      JSON.stringify({ error: 'Failed to create checkout session' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
