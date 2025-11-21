# EmailBoy - Chrome Extension

A Chrome extension that automatically finds and collects email addresses while you browse the web, with premium subscription support via Stripe.

## Features

- 🔍 **Automatic Email Detection**: Scans web pages for email addresses as you browse
- ☁️ **Cloud Sync**: Automatically syncs emails to Supabase database
- 👤 **Multi-User Support**: Each user has their own account and data
- 🔒 **Secure**: Row Level Security ensures data privacy
- ⭐ **Premium Subscriptions**: Stripe-powered premium subscription system
- 🔄 **Real-Time Sync**: Automatic real-time synchronization enabled by default

## Installation

1. Clone this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" (toggle in top right)
4. Click "Load unpacked" and select the extension directory
5. The extension is now installed!

## Setup

### 1. Database Setup

Run the SQL script in `setup.sql` in your Supabase SQL Editor to create the necessary tables and policies.

### 2. Stripe Setup (For Premium Subscriptions)

Follow the detailed guide in `STRIPE_SETUP.md` to:
- Create a Stripe product and price
- Set up webhooks
- Configure Supabase Edge Functions
- Deploy subscription management functions

### 3. Edge Functions Deployment

Deploy all edge functions to Supabase:

```bash
supabase functions deploy check-subscription
supabase functions deploy create-checkout
supabase functions deploy stripe-webhook
supabase functions deploy cancel-subscription
supabase functions deploy resume-subscription
supabase functions deploy store-emails
supabase functions deploy get-emails
supabase functions deploy auth-signup
supabase functions deploy auth-signin
supabase functions deploy auth-signout
supabase functions deploy auth-session
```

## Usage

1. **Sign Up/Sign In**: Click the extension icon and sign up or sign in
2. **Upgrade to Premium**: Go to Settings → Premium Subscription to upgrade
3. **Browse the Web**: The extension automatically collects emails as you browse
4. **View Emails**: Click the extension icon to see collected emails
5. **Export**: Export your emails as CSV

## Premium Subscription

- **Free Plan**: Extension is installed but email collection is disabled
- **Premium Plan**: Full access to email collection and cloud sync
- **Manage Subscription**: Go to Settings → Premium Subscription

## Project Structure

```
emailboy/
├── manifest.json              # Extension manifest
├── popup.html/js              # Extension popup UI
├── options.html/js            # Settings page with subscription management
├── content.js                 # Content script for email detection
├── background.js              # Background service worker
├── supabase-client.js         # Supabase client initialization
├── styles.css                 # Styling
├── icons/                     # Extension icons
├── setup.sql                  # Database schema
├── portal/                    # React subscription portal
│   └── src/                   # Portal source code
├── STRIPE_SETUP.md            # Stripe integration guide
├── SUPABASE_SETUP.md          # Supabase setup guide
├── QUICK_START.md             # Quick start guide
├── TROUBLESHOOTING.md         # Troubleshooting guide
└── supabase/
    └── functions/             # Supabase Edge Functions
        ├── check-subscription/
        ├── create-checkout/
        ├── create-portal-session/
        ├── stripe-webhook/
        ├── cancel-subscription/
        ├── resume-subscription/
        ├── store-emails/
        ├── get-emails/
        └── auth-*/
```

## Security

- All API keys are stored securely in Supabase secrets
- Row Level Security (RLS) ensures users only see their own data
- Authentication required for all operations
- Premium subscription required for email collection

## Troubleshooting

See `TROUBLESHOOTING.md` for common issues and solutions.

## License

MIT
