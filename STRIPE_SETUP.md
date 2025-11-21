# Stripe Premium Subscription Setup Guide

This guide will help you set up Stripe for premium subscriptions in EmailBoy.

## Prerequisites

1. A Stripe account (sign up at https://stripe.com)
2. Supabase project with Edge Functions enabled
3. Supabase CLI installed

## Step 1: Create a Stripe Product and Price

1. Log in to your Stripe Dashboard: https://dashboard.stripe.com
2. Go to **Products** → **Add Product**
3. Create a product:
   - **Name**: EmailBoy Premium
   - **Description**: Premium subscription for EmailBoy
   - **Pricing model**: Recurring
   - **Price**: Set your monthly/yearly price (e.g., $9.99/month)
   - **Billing period**: Monthly or Yearly
4. Click **Save product**
5. **Copy the Price ID** (starts with `price_...`) - you'll need this later

## Step 2: Get Your Stripe API Keys

1. In Stripe Dashboard, go to **Developers** → **API keys**
2. Copy your **Secret key** (starts with `sk_...`)
3. Keep this secure - you'll add it to Supabase secrets

## Step 3: Set Up Stripe Webhook

**IMPORTANT**: Supabase Edge Functions require authentication. For Stripe webhooks, you need to add your Supabase anon key to the webhook URL.

1. Get your Supabase Anon Key:
   - Go to Supabase Dashboard → Settings → API
   - Copy your **anon/public** key (starts with `eyJ...`)

2. In Stripe Dashboard, go to **Developers** → **Webhooks**
3. Click **Add endpoint**
4. Set the endpoint URL to (include your anon key as a query parameter):
   ```
   https://xgllxidtqbkftsbhiinl.supabase.co/functions/v1/stripe-webhook?apikey=YOUR_ANON_KEY_HERE
   ```
   Replace `YOUR_ANON_KEY_HERE` with your actual anon key from step 1.
   
   **Example:**
   ```
   https://xgllxidtqbkftsbhiinl.supabase.co/functions/v1/stripe-webhook?apikey=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```
   
   (Replace with your Supabase project URL if different)

5. Select events to listen to:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
6. Click **Add endpoint**
7. **Copy the Signing secret** (starts with `whsec_...`) - you'll need this for Supabase secrets

**Note**: The anon key is safe to include in the webhook URL. It's designed to be public, and the webhook function will still verify the Stripe signature for security.

## Step 4: Configure Supabase Edge Functions

### Install Supabase CLI (if not already installed)

```bash
npm install -g supabase
```

### Login to Supabase

```bash
supabase login
```

### Link your project

```bash
supabase link --project-ref xgllxidtqbkftsbhiinl
```

(Replace with your project reference ID)

### Set Environment Variables

Set the following secrets in Supabase:

```bash
supabase secrets set STRIPE_SECRET_KEY=sk_test_... # Your Stripe secret key
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_... # Your webhook signing secret
supabase secrets set STRIPE_PRICE_ID=price_... # Your Stripe price ID
# Optional: where Stripe should send users after leaving the billing portal
supabase secrets set STRIPE_PORTAL_RETURN_URL=https://example.com/settings
```

**Note**: For production, use your live Stripe keys (`sk_live_...`). For testing, use test keys (`sk_test_...`).

### Deploy Edge Functions

Deploy all the subscription-related edge functions:

```bash
supabase functions deploy check-subscription
supabase functions deploy create-checkout
supabase functions deploy checkout-success
supabase functions deploy checkout-cancel
supabase functions deploy create-portal-session
supabase functions deploy cancel-subscription
supabase functions deploy resume-subscription
```

**IMPORTANT: Deploy the webhook function with `--no-verify-jwt` flag:**

```bash
supabase functions deploy stripe-webhook --no-verify-jwt
```

This flag is required because:
- Stripe webhooks don't send authentication headers
- The function still verifies Stripe's webhook signature (secure)
- This only bypasses Supabase's JWT verification at the gateway level

## Step 5: Update Database Schema

Run the updated `setup.sql` in your Supabase SQL Editor to create the `user_subscriptions` table:

```sql
-- This is already included in setup.sql
-- Just run the entire setup.sql file in Supabase SQL Editor
```

## Step 6: Test the Integration

1. **Test Mode**: Make sure you're using Stripe test mode keys
2. **Test Card**: Use Stripe's test card: `4242 4242 4242 4242`
   - Expiry: Any future date
   - CVC: Any 3 digits
   - ZIP: Any 5 digits
3. **Test Flow**:
   - Sign up for an account in the extension
   - Go to Settings → Premium Subscription
   - Click "Upgrade to Premium"
   - Complete checkout with test card
   - Verify subscription appears in Stripe Dashboard
   - Verify subscription status shows as "Premium Active" in extension

## Step 7: Production Setup

When ready for production:

1. **Switch to Live Mode** in Stripe Dashboard
2. **Get Live API Keys** from Stripe
3. **Update Supabase Secrets** with live keys:
   ```bash
   supabase secrets set STRIPE_SECRET_KEY=sk_live_...
   supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_... # Live webhook secret
   ```
4. **Create Live Webhook** in Stripe with your production Supabase URL
5. **Update Price ID** if using a different price for production

## Troubleshooting

### Webhook Not Receiving Events

1. Check webhook endpoint URL is correct
2. Verify webhook secret is set correctly in Supabase
3. Check Stripe Dashboard → Webhooks → Recent events for errors
4. Check Supabase Edge Function logs:
   ```bash
   supabase functions logs stripe-webhook
   ```

### Subscription Not Showing as Active

1. Verify `user_subscriptions` table exists and has correct schema
2. Check RLS policies are set correctly
3. Verify webhook events are being received
4. Check Edge Function logs for errors

### Checkout Not Working

1. Verify `STRIPE_PRICE_ID` is set correctly
2. Check `create-checkout` function logs:
   ```bash
   supabase functions logs create-checkout
   ```
3. Verify user is authenticated before creating checkout

## Security Notes

- Never commit Stripe keys to version control
- Use environment variables/secrets for all sensitive data
- Enable RLS on `user_subscriptions` table (already configured in setup.sql)
- Webhook signature verification is handled automatically by the edge function

## Support

For issues:
1. Check Supabase Edge Function logs
2. Check Stripe Dashboard → Events for webhook delivery status
3. Verify all environment variables are set correctly
4. Ensure database schema matches the setup.sql file

