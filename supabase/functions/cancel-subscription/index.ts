// Supabase Edge Function: cancel-subscription
// Cancels user's Stripe subscription

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
      apiVersion: '2023-10-16',
    })

    if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Create Supabase client with user's auth token for auth check
    const supabaseClient = createClient(
      SUPABASE_URL,
      SUPABASE_ANON_KEY,
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    // Verify user is authenticated
    const {
      data: { user },
      error: authError
    } = await supabaseClient.auth.getUser()

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized. Please sign in.' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Get user's subscription using direct REST API (avoids Node.js polyfill issues)
    const subscriptionResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/user_subscriptions?user_id=eq.${user.id}&select=stripe_subscription_id`,
      {
        method: 'GET',
        headers: {
          'apikey': SUPABASE_SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    )

    if (!subscriptionResponse.ok) {
      return new Response(
        JSON.stringify({ error: 'Failed to fetch subscription' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const subscriptionData = await subscriptionResponse.json()
    const subscription = Array.isArray(subscriptionData) ? subscriptionData[0] : subscriptionData

    if (!subscription || !subscription.stripe_subscription_id) {
      return new Response(
        JSON.stringify({ error: 'No active subscription found' }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Cancel subscription at period end
    const canceledSubscription = await stripe.subscriptions.update(
      subscription.stripe_subscription_id,
      { cancel_at_period_end: true }
    )

    // Update database using direct REST API (avoids Node.js polyfill issues)
    try {
      const updateResponse = await fetch(
        `${SUPABASE_URL}/rest/v1/user_subscriptions?user_id=eq.${user.id}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'apikey': SUPABASE_SERVICE_ROLE_KEY,
            'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
            'Prefer': 'return=minimal'
          },
          body: JSON.stringify({
            cancel_at_period_end: true,
            updated_at: new Date().toISOString()
          })
        }
      )

      if (!updateResponse.ok) {
        const errorText = await updateResponse.text()
        console.error('Error updating subscription in database:', errorText)
        // Still return success since Stripe was updated, but log the error
      }
    } catch (updateErr) {
      console.error('Error updating subscription in database:', updateErr)
      // Still return success since Stripe was updated, but log the error
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Subscription will be canceled at the end of the current period',
        cancel_at: canceledSubscription.cancel_at
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  } catch (error: any) {
    console.error('Cancel subscription error:', error)
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Failed to cancel subscription'
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})

