# EmailBoy Configuration Guide

This document lists all environment variables needed for the EmailBoy system.

## Architecture Overview

```
┌─────────────────┐     ┌─────────────────────────┐     ┌─────────────┐
│  Chrome Ext     │────▶│  Supabase Edge Functions │────▶│   Stripe    │
│  (extension/)   │     │  (supabase/functions/)   │     │             │
└─────────────────┘     └─────────────────────────┘     └─────────────┘
        │                         ▲
        │                         │
        ▼                         │
┌─────────────────┐               │
│  Portal (React) │───────────────┘
│  (portal/)      │
│  Hosted: Vercel │
└─────────────────┘
```

---

## 1. Vercel (Portal Frontend)

**Dashboard:** https://vercel.com/your-project/settings/environment-variables

The portal only needs Supabase connection info. It does NOT need Stripe keys.

| Variable | Value | Description |
|----------|-------|-------------|
| `VITE_SUPABASE_URL` | `https://xgllxidtqbkftsbhiinl.supabase.co` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | `eyJhbGciOiJIUzI1NiIs...` | Supabase anonymous key |

**That's it for Vercel!** All Stripe operations go through Edge Functions.

---

## 2. Supabase Edge Functions

**Dashboard:** https://supabase.com/dashboard/project/xgllxidtqbkftsbhiinl/settings/functions

These secrets are used by the Edge Functions to communicate with Stripe.

| Secret | Value | Description |
|--------|-------|-------------|
| `STRIPE_SECRET_KEY` | `sk_test_51SvJLb...` | Stripe secret key (test or live) |
| `STRIPE_PRICE_ID` | `price_1SvJpTEowpcJyWxmpmHhm5uH` | Stripe subscription price ID |
| `STRIPE_WEBHOOK_SECRET` | `whsec_FcjTf9Hkunk...` | Stripe webhook signing secret |
| `PORTAL_URL` | `https://portal.emailextractorextension.com` | Portal URL for redirects |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJhbGciOiJIUzI1Ni...` | Service role key (from Project Settings → API) |

**Note:** `SUPABASE_URL` and `SUPABASE_ANON_KEY` are automatically available in Edge Functions.

---

## 3. Stripe Dashboard

**Webhook URL:** https://dashboard.stripe.com/webhooks

Add a webhook endpoint with:
- **URL:** `https://xgllxidtqbkftsbhiinl.supabase.co/functions/v1/stripe-webhook`
- **Events:**
  - `checkout.session.completed`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `invoice.payment_succeeded`
  - `invoice.payment_failed`

After creating the webhook, copy the **Signing secret** and add it to Supabase as `STRIPE_WEBHOOK_SECRET`.

---

## 4. Chrome Extension

The extension uses hardcoded values in the source files:

- `extension/popup.js` - CONFIG object
- `extension/background.js` - CONFIG object
- `extension/options.js` - CONFIG object
- `extension/content.js` - No config needed

Current values:
```javascript
const CONFIG = {
  supabaseUrl: 'https://xgllxidtqbkftsbhiinl.supabase.co',
  supabaseKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  portalUrl: 'https://portal.emailextractorextension.com'
};
```

---

## Quick Checklist

### Vercel
- [ ] `VITE_SUPABASE_URL` set
- [ ] `VITE_SUPABASE_ANON_KEY` set
- [ ] No Stripe keys (not needed!)

### Supabase Edge Functions
- [ ] `STRIPE_SECRET_KEY` set
- [ ] `STRIPE_PRICE_ID` set (get from Stripe Products page)
- [ ] `STRIPE_WEBHOOK_SECRET` set (get from Stripe Webhooks page)
- [ ] `PORTAL_URL` set to `https://portal.emailextractorextension.com`
- [ ] `SUPABASE_SERVICE_ROLE_KEY` set (from Project Settings → API)

### Stripe
- [ ] Webhook endpoint created pointing to Supabase
- [ ] Required events enabled
- [ ] Signing secret copied to Supabase

---

## Troubleshooting

### Checkout redirects to wrong product
→ Check `STRIPE_PRICE_ID` in Supabase Edge Functions secrets

### Subscription not updating after checkout
→ Check webhook is configured in Stripe Dashboard
→ Check `STRIPE_WEBHOOK_SECRET` matches (no extra whitespace!)
→ Check `SUPABASE_SERVICE_ROLE_KEY` is set

### Portal shows "Session expired"
→ Sign in again from the Chrome extension
→ Click the Portal button in extension to open with fresh session

### Edge Function returns 500 error
→ Check all required secrets are set in Supabase
→ View function logs in Supabase Dashboard → Edge Functions → Logs
