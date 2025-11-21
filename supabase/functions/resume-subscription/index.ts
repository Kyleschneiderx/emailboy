// Supabase Edge Function: resume-subscription
// Resumes a canceled subscription

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno'

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
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
      apiVersion: '2023-10-16',
    })

    // Create Supabase client with user's auth token
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
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

    // Get user's subscription
    const { data: subscription, error: subError } = await supabaseClient
      .from('user_subscriptions')
      .select('stripe_subscription_id')
      .eq('user_id', user.id)
      .single()

    if (subError || !subscription || !subscription.stripe_subscription_id) {
      return new Response(
        JSON.stringify({ error: 'No subscription found' }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Resume subscription
    const resumedSubscription = await stripe.subscriptions.update(
      subscription.stripe_subscription_id,
      { cancel_at_period_end: false }
    )

    // Update database
    await supabaseClient
      .from('user_subscriptions')
      .update({
        cancel_at_period_end: false,
        status: 'active',
        updated_at: new Date().toISOString()
      })
      .eq('user_id', user.id)

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Subscription resumed successfully'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  } catch (error: any) {
    console.error('Resume subscription error:', error)
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Failed to resume subscription'
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})

