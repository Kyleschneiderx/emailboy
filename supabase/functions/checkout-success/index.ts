// checkout-success
// Verifies checkout session and redirects to portal with session data
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  try {
    const url = new URL(req.url);
    const sessionId = url.searchParams.get("session_id") ?? "";
    const PORTAL_URL = Deno.env.get('PORTAL_URL') || 'http://localhost:5173'

    if (!sessionId) {
      // Redirect to portal with error
      return new Response(null, {
        status: 302,
        headers: {
          ...corsHeaders,
          'Location': `${PORTAL_URL}?checkout=error&message=Missing session ID`,
        },
      });
    }

    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
      apiVersion: '2023-10-16',
    })

    // Retrieve the checkout session from Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId)

    // Only process if payment was successful
    if (session.payment_status !== 'paid') {
      return new Response("Payment not completed", {
        status: 400,
        headers: { ...corsHeaders, "content-type": "text/plain; charset=utf-8" },
      });
    }

    const userId = session.client_reference_id || session.metadata?.user_id
    if (!userId) {
      console.error('No user ID in checkout session')
      return new Response(null, {
        status: 302,
        headers: {
          ...corsHeaders,
          'Location': `${PORTAL_URL}?checkout=error&message=No user ID found`,
        },
      });
    }

    // Get subscription ID
    const subscriptionId = session.subscription as string | null
    if (!subscriptionId) {
      console.error('No subscription ID in checkout session')
      return new Response(null, {
        status: 302,
        headers: {
          ...corsHeaders,
          'Location': `${PORTAL_URL}?checkout=error&message=No subscription ID found`,
        },
      });
    }

    // Create Supabase admin client to update database
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Check if subscription already exists (webhook may have already processed it)
    const { data: existing } = await supabaseAdmin
      .from('user_subscriptions')
      .select('id')
      .eq('user_id', userId)
      .single()

    // If subscription doesn't exist, fetch from Stripe and update
    // (This is a fallback in case the webhook hasn't processed yet)
    if (!existing) {
      try {
        const subscription = await stripe.subscriptions.retrieve(subscriptionId)

        const { error } = await supabaseAdmin
          .from('user_subscriptions')
          .upsert({
            user_id: userId,
            stripe_subscription_id: subscription.id,
            stripe_customer_id: subscription.customer as string,
            status: subscription.status,
            plan: 'premium',
            current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            cancel_at_period_end: subscription.cancel_at_period_end,
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'user_id'
          })

        if (error) {
          console.error('Error saving subscription in checkout-success:', error)
        } else {
          console.log('Successfully saved subscription in checkout-success for user:', userId)
        }
      } catch (err: any) {
        console.error('Error retrieving subscription in checkout-success:', err.message)
      }
    }

    // Get user's session token to pass to portal
    // We need to get the user's auth session to pass it to the portal
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    )

    // Get user's session - we'll redirect to portal and let them sign in if needed
    // The portal will handle session management
    return new Response(null, {
      status: 302,
      headers: {
        ...corsHeaders,
        'Location': `${PORTAL_URL}?checkout=success&session_id=${sessionId}`,
      },
    });
  } catch (error: any) {
    console.error('Checkout success error:', error)
    return new Response(null, {
      status: 302,
      headers: {
        ...corsHeaders,
        'Location': `${Deno.env.get('PORTAL_URL') || 'http://localhost:5173'}?checkout=error&message=${encodeURIComponent(error.message || 'Unknown error')}`,
      },
    });
  }
});