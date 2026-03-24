// Supabase Edge Function: check-subscription
// Checks if user has an active premium subscription
// Includes live Stripe fallback for self-healing stale records

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { validateToken, isValidateError, getServiceClient } from '../_shared/validate-token.ts'
import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno'

const ALLOWED_ORIGINS = [
  'https://portal.emailextractorextension.com',
  'https://portal-six-henna.vercel.app',
]

const GRACE_PERIOD_MS = 7 * 24 * 60 * 60 * 1000 // 7 days

function getCorsHeaders(req: Request) {
  const origin = req.headers.get('Origin') || ''
  const isAllowed = ALLOWED_ORIGINS.includes(origin) || origin.startsWith('chrome-extension://')
  return {
    'Access-Control-Allow-Origin': isAllowed ? origin : ALLOWED_ORIGINS[0],
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }
}

// Extract period dates from subscription (handles API version differences)
function getPeriodDates(sub: any) {
  const item = sub.items?.data?.[0]
  const periodStart = sub.current_period_start ?? item?.current_period_start
  const periodEnd = sub.current_period_end ?? item?.current_period_end
  return {
    current_period_start: periodStart ? new Date(periodStart * 1000).toISOString() : null,
    current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
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

    // Check subscription status (include stripe_subscription_id for fallback)
    const { data: subscription, error } = await supabase
      .from('user_subscriptions')
      .select('status, plan, current_period_end, cancel_at_period_end, stripe_subscription_id')
      .eq('user_id', result.userId)
      .single()

    if (error && error.code !== 'PGRST116') {
      console.error('Subscription query error:', error)
      throw error
    }

    let isPremium = subscription &&
                   subscription.status === 'active' &&
                   new Date(subscription.current_period_end) > new Date()

    // Live Stripe fallback: if DB says not premium but we have a Stripe subscription ID,
    // verify directly with Stripe and self-heal the DB record if needed
    if (!isPremium && subscription?.stripe_subscription_id) {
      try {
        const stripeKey = Deno.env.get('STRIPE_SECRET_KEY')
        if (stripeKey) {
          const stripe = new Stripe(stripeKey, { apiVersion: '2023-10-16' })
          const stripeSub = await stripe.subscriptions.retrieve(subscription.stripe_subscription_id)

          if (stripeSub.status === 'active') {
            isPremium = true

            // Self-heal: update the stale DB record with fresh Stripe data
            const periods = getPeriodDates(stripeSub)
            await supabase
              .from('user_subscriptions')
              .update({
                status: stripeSub.status,
                ...periods,
                cancel_at_period_end: stripeSub.cancel_at_period_end,
                updated_at: new Date().toISOString()
              })
              .eq('user_id', result.userId)

            // Update local subscription object for the response
            if (periods.current_period_end) {
              subscription.current_period_end = periods.current_period_end
            }
            subscription.status = stripeSub.status
            subscription.cancel_at_period_end = stripeSub.cancel_at_period_end
          } else if (stripeSub.status === 'canceled' || stripeSub.status === 'unpaid') {
            // Stripe confirms not active -- update DB to match
            await supabase
              .from('user_subscriptions')
              .update({
                status: stripeSub.status,
                updated_at: new Date().toISOString()
              })
              .eq('user_id', result.userId)

            subscription.status = stripeSub.status
          }
        }
      } catch (stripeError: any) {
        console.error('Stripe fallback check failed:', stripeError.message)
        // On Stripe API failure, apply grace period:
        // If subscription was active and expired recently (within 7 days), be generous
        if (subscription.status === 'active' && subscription.current_period_end) {
          const periodEnd = new Date(subscription.current_period_end)
          if (Date.now() - periodEnd.getTime() < GRACE_PERIOD_MS) {
            isPremium = true
          }
        }
      }
    }

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
