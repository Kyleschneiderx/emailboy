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
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  // Health check endpoint
  const url = new URL(req.url)
  if (url.searchParams.get('health') === 'check') {
    return new Response(
      JSON.stringify({
        status: 'ok',
        message: 'Webhook function is deployed and accessible',
        timestamp: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  console.log('=== STRIPE WEBHOOK CALLED ===')
  console.log('Method:', req.method)

  try {
    // Get environment variables
    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY')
    const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')?.trim() // Trim whitespace!
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    console.log('Environment check:')
    console.log('- STRIPE_SECRET_KEY:', stripeKey ? 'SET' : 'MISSING')
    console.log('- STRIPE_WEBHOOK_SECRET:', webhookSecret ? `SET (length: ${webhookSecret.length})` : 'MISSING')
    console.log('- SUPABASE_URL:', supabaseUrl ? 'SET' : 'MISSING')
    console.log('- SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? 'SET' : 'MISSING')

    if (!stripeKey || !webhookSecret || !supabaseUrl || !supabaseServiceKey) {
      const missing = []
      if (!stripeKey) missing.push('STRIPE_SECRET_KEY')
      if (!webhookSecret) missing.push('STRIPE_WEBHOOK_SECRET')
      if (!supabaseUrl) missing.push('SUPABASE_URL')
      if (!supabaseServiceKey) missing.push('SUPABASE_SERVICE_ROLE_KEY')

      console.error('Missing environment variables:', missing.join(', '))
      return new Response(
        JSON.stringify({ error: 'Server configuration error', missing }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const stripe = new Stripe(stripeKey, { apiVersion: '2023-10-16' })

    // Get the raw body for signature verification
    const body = await req.text()
    console.log('Webhook body length:', body.length)

    // Get Stripe signature
    const signature = req.headers.get('stripe-signature')
    console.log('Stripe signature:', signature ? 'FOUND' : 'MISSING')

    if (!signature) {
      console.error('No stripe-signature header')
      return new Response(
        JSON.stringify({ error: 'Missing stripe-signature header' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verify signature
    let event: Stripe.Event
    try {
      event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret)
      console.log('✓ Signature verified')
      console.log('Event type:', event.type)
      console.log('Event ID:', event.id)
    } catch (err: any) {
      console.error('Signature verification failed:', err.message)
      return new Response(
        JSON.stringify({ error: `Webhook signature verification failed: ${err.message}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create Supabase admin client
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

    // Handle events
    switch (event.type) {
      case 'checkout.session.completed': {
        console.log('Processing checkout.session.completed')
        const session = event.data.object as Stripe.Checkout.Session

        const userId = session.client_reference_id || session.metadata?.user_id
        console.log('User ID:', userId)
        console.log('Payment status:', session.payment_status)
        console.log('Subscription ID:', session.subscription)

        if (!userId) {
          console.error('No user ID in session')
          break
        }

        if (session.payment_status !== 'paid') {
          console.log('Payment not completed yet')
          break
        }

        const subscriptionId = session.subscription as string
        if (!subscriptionId) {
          console.error('No subscription ID in session')
          break
        }

        // Get subscription details from Stripe
        const subscription = await stripe.subscriptions.retrieve(subscriptionId)
        console.log('Subscription status:', subscription.status)

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

        console.log('Upserting subscription:', JSON.stringify(subscriptionData))

        const { error } = await supabaseAdmin
          .from('user_subscriptions')
          .upsert(subscriptionData, { onConflict: 'user_id' })

        if (error) {
          console.error('Database error:', error)
        } else {
          console.log('✓ Subscription saved successfully')
        }
        break
      }

      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        console.log('Processing', event.type)
        const subscription = event.data.object as Stripe.Subscription
        const customerId = subscription.customer as string

        const { data: existing } = await supabaseAdmin
          .from('user_subscriptions')
          .select('user_id')
          .eq('stripe_customer_id', customerId)
          .single()

        if (existing) {
          const { error } = await supabaseAdmin
            .from('user_subscriptions')
            .update({
              status: subscription.status,
              current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
              current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
              cancel_at_period_end: subscription.cancel_at_period_end,
              updated_at: new Date().toISOString()
            })
            .eq('user_id', existing.user_id)

          if (error) {
            console.error('Database error:', error)
          } else {
            console.log('✓ Subscription updated')
          }
        } else {
          console.log('No existing subscription found for customer:', customerId)
        }
        break
      }

      case 'invoice.payment_succeeded': {
        console.log('Processing invoice.payment_succeeded')
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
            console.log('✓ Subscription renewed')
          }
        }
        break
      }

      case 'invoice.payment_failed': {
        console.log('Processing invoice.payment_failed')
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
            console.log('✓ Subscription marked as past_due')
          }
        }
        break
      }

      default:
        console.log('Unhandled event type:', event.type)
    }

    console.log('=== WEBHOOK COMPLETED ===')
    return new Response(
      JSON.stringify({ received: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    console.error('=== WEBHOOK ERROR ===')
    console.error('Error:', error.message)
    console.error('Stack:', error.stack)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
