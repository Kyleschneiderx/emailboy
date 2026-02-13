// Supabase Edge Function: check-subscription
// Checks if user has an active premium subscription

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

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

    // Check subscription status from database
    const { data: subscription, error } = await supabaseClient
      .from('user_subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Subscription query error:', error)
      throw error
    }

    // Check if subscription is active and not expired
    const isPremium = subscription &&
                     subscription.status === 'active' &&
                     new Date(subscription.current_period_end) > new Date()

    console.log('Subscription check for user:', user.id)
    console.log('- Found subscription:', !!subscription)
    console.log('- Status:', subscription?.status)
    console.log('- Period end:', subscription?.current_period_end)
    console.log('- Is premium:', isPremium)

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
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  } catch (error: any) {
    console.error('Subscription check error:', error)
    return new Response(
      JSON.stringify({
        isPremium: false,
        error: error.message || 'Failed to check subscription'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
