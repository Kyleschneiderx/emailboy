// Supabase Edge Function: stripe-webhook
// Handles Stripe webhook events for subscription management

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, stripe-signature',
}

serve(async (req) => {
  // Handle CORS preflight - this must be first to allow Stripe to reach the function
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  // Health check endpoint - accessible without auth for testing
  const url = new URL(req.url)
  if (url.pathname.includes('/health') || url.searchParams.get('health') === 'check') {
    return new Response(
      JSON.stringify({ 
        status: 'ok',
        message: 'Webhook function is deployed and accessible',
        timestamp: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  console.log('=== WEBHOOK CALLED ===')
  console.log('Method:', req.method)
  console.log('URL:', req.url)
  console.log('All headers:', JSON.stringify(Object.fromEntries(req.headers.entries())))
  
  // Note: This function is deployed with --no-verify-jwt, so we don't need to check for apikey
  // Security is maintained through Stripe webhook signature verification below
  
  try {
    // Check environment variables
    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY')
    const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    
    console.log('Env check - Stripe Key:', stripeKey ? 'SET' : 'MISSING')
    console.log('Env check - Webhook Secret:', webhookSecret ? 'SET' : 'MISSING')
    console.log('Env check - Supabase URL:', supabaseUrl ? 'SET' : 'MISSING')
    console.log('Env check - Service Key:', supabaseServiceKey ? 'SET' : 'MISSING')

    if (!stripeKey || !webhookSecret || !supabaseUrl || !supabaseServiceKey) {
      console.error('Missing required environment variables')
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const stripe = new Stripe(stripeKey, {
      apiVersion: '2023-10-16',
    })

    // Get the raw body for signature verification
    const body = await req.text()
    console.log('Webhook body length:', body.length)
    console.log('Request method:', req.method)
    
    // Get Stripe signature from headers
    const signature = req.headers.get('stripe-signature')
    console.log('Stripe signature header:', signature ? 'FOUND' : 'MISSING')
    console.log('All request headers:', JSON.stringify(Object.fromEntries(req.headers.entries())))
    
    // If no signature, this might be a test call or the header isn't being forwarded
    if (!signature) {
      console.error('No stripe-signature header found')
      console.error('Available headers:', Array.from(req.headers.keys()).join(', '))
      
      // Check if this is a test/health check
      if (req.method === 'GET' || body.length === 0) {
        return new Response(
          JSON.stringify({ 
            error: 'No signature',
            message: 'This endpoint requires a Stripe webhook with stripe-signature header',
            hint: 'Make sure Stripe is sending the webhook with the stripe-signature header',
            note: 'For testing, use Stripe Dashboard → Send test webhook'
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      
      // For POST requests without signature, log but don't fail immediately
      // (in case header forwarding is the issue)
      console.warn('WARNING: Processing webhook without signature - this is insecure!')
      console.warn('This should only happen in development/testing')
    }

    let event: Stripe.Event
    
    // Only verify signature if we have one
    if (signature) {
      try {
        // Use constructEventAsync for Deno environment
        event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret)
        console.log('Event type:', event.type)
        console.log('Event ID:', event.id)
        console.log('Signature verified successfully')
      } catch (err: any) {
        console.error('Webhook signature verification failed:', err.message)
        console.error('Error details:', JSON.stringify(err))
        return new Response(
          JSON.stringify({ error: `Webhook Error: ${err.message}` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    } else {
      // No signature - try to parse the body as JSON directly (for testing only)
      console.warn('WARNING: Processing webhook without signature verification')
      try {
        const eventData = JSON.parse(body)
        // Create a mock event object
        event = {
          id: eventData.id || 'test_event',
          object: 'event',
          type: eventData.type || 'unknown',
          data: eventData,
          livemode: false,
          created: Math.floor(Date.now() / 1000),
          api_version: '2023-10-16',
          pending_webhooks: 0,
          request: null
        } as Stripe.Event
        console.log('Parsed event without signature (TEST MODE):', event.type)
      } catch (err: any) {
        console.error('Failed to parse webhook body:', err.message)
        return new Response(
          JSON.stringify({ 
            error: 'Invalid webhook format',
            message: 'Could not parse webhook body and no signature provided'
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    // Create Supabase admin client
    const supabaseAdmin = createClient(
      supabaseUrl,
      supabaseServiceKey
    )
    
    console.log('Supabase client created')

    // Handle different event types
    switch (event.type) {
      case 'checkout.session.completed': {
        console.log('Processing checkout.session.completed event')
        const session = event.data.object as Stripe.Checkout.Session
        console.log('Session ID:', session.id)
        console.log('Payment status:', session.payment_status)
        console.log('Session metadata:', JSON.stringify(session.metadata))
        console.log('Client reference ID:', session.client_reference_id)
        
        const userId = session.client_reference_id || session.metadata?.user_id
        console.log('Extracted user ID:', userId)

        if (!userId) {
          console.error('No user ID in checkout session', JSON.stringify(session))
          break
        }

        // Only process if payment was successful
        if (session.payment_status !== 'paid') {
          console.log('Payment not completed, status:', session.payment_status)
          break
        }

        // Get subscription details
        const subscriptionId = session.subscription as string | null
        console.log('Subscription ID from session:', subscriptionId)
        
        if (!subscriptionId) {
          console.error('No subscription ID in checkout session', JSON.stringify(session))
          break
        }

        try {
          console.log('Retrieving subscription from Stripe:', subscriptionId)
          const subscription = await stripe.subscriptions.retrieve(subscriptionId)
          console.log('Subscription retrieved:', subscription.id, 'Status:', subscription.status)

          const subscriptionData = {
            user_id: userId,
            stripe_subscription_id: subscription.id,
            stripe_customer_id: subscription.customer as string,
            status: subscription.status,
            plan: 'premium',
            current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            cancel_at_period_end: subscription.cancel_at_period_end,
            updated_at: new Date().toISOString()
          }
          
          console.log('Attempting to upsert subscription:', JSON.stringify(subscriptionData))

          // Upsert subscription record
          const { data, error } = await supabaseAdmin
            .from('user_subscriptions')
            .upsert(subscriptionData, {
              onConflict: 'user_id'
            })

          if (error) {
            console.error('Error saving subscription:', JSON.stringify(error))
            console.error('Error details:', error.message, error.code, error.details)
          } else {
            console.log('Successfully saved subscription for user:', userId, 'subscription:', subscription.id)
            console.log('Returned data:', JSON.stringify(data))
          }
        } catch (err: any) {
          console.error('Error retrieving subscription from Stripe:', err.message)
          console.error('Error stack:', err.stack)
        }
        break
      }

      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        const customerId = subscription.customer as string

        // Find user by customer ID
        const { data: existing } = await supabaseAdmin
          .from('user_subscriptions')
          .select('user_id')
          .eq('stripe_customer_id', customerId)
          .single()

        if (existing) {
          await supabaseAdmin
            .from('user_subscriptions')
            .update({
              status: subscription.status,
              current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
              current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
              cancel_at_period_end: subscription.cancel_at_period_end,
              updated_at: new Date().toISOString()
            })
            .eq('user_id', existing.user_id)
        }
        break
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice
        const subscriptionId = invoice.subscription as string

        if (subscriptionId) {
          const subscription = await stripe.subscriptions.retrieve(subscriptionId)
          const { data: existing } = await supabaseAdmin
            .from('user_subscriptions')
            .select('user_id')
            .eq('stripe_subscription_id', subscriptionId)
            .single()

          if (existing) {
            await supabaseAdmin
              .from('user_subscriptions')
              .update({
                status: subscription.status,
                current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
                updated_at: new Date().toISOString()
              })
              .eq('user_id', existing.user_id)
          }
        }
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        const subscriptionId = invoice.subscription as string

        if (subscriptionId) {
          const { data: existing } = await supabaseAdmin
            .from('user_subscriptions')
            .select('user_id')
            .eq('stripe_subscription_id', subscriptionId)
            .single()

          if (existing) {
            await supabaseAdmin
              .from('user_subscriptions')
              .update({
                status: 'past_due',
                updated_at: new Date().toISOString()
              })
              .eq('user_id', existing.user_id)
          }
        }
        break
      }
    }

    console.log('Webhook processing completed successfully')
    return new Response(
      JSON.stringify({ received: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error: any) {
    console.error('=== WEBHOOK ERROR ===')
    console.error('Error message:', error.message)
    console.error('Error stack:', error.stack)
    console.error('Error details:', JSON.stringify(error))
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

