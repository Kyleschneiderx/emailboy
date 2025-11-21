# Supabase Setup Guide

This guide will help you set up Supabase to store emails collected by EmailBoy.

## Step 1: Create a Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Sign up or sign in
3. Click "New Project"
4. Fill in your project details:
   - Name: `emailboy` (or your preferred name)
   - Database Password: Choose a strong password
   - Region: Choose the closest region
5. Click "Create new project"
6. Wait for the project to be created (takes 1-2 minutes)

## Step 2: Get Your Supabase Credentials

1. In your Supabase project dashboard, go to **Settings** → **API**
2. Copy the following:
   - **Project URL**: `https://your-project-id.supabase.co`
   - **anon/public key**: The `anon` or `public` key from the API keys section

## Step 3: Create the Database Table

1. In your Supabase dashboard, go to **SQL Editor**
2. Click "New query"
3. Paste the following SQL and click "Run":

```sql
-- Create the collected_emails table
CREATE TABLE IF NOT EXISTS collected_emails (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  domain TEXT NOT NULL,
  url TEXT,
  urls TEXT[] DEFAULT ARRAY[]::TEXT[],
  first_seen TIMESTAMPTZ DEFAULT NOW(),
  last_seen TIMESTAMPTZ DEFAULT NOW(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(email, user_id)
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_collected_emails_user_id ON collected_emails(user_id);
CREATE INDEX IF NOT EXISTS idx_collected_emails_email ON collected_emails(email);
CREATE INDEX IF NOT EXISTS idx_collected_emails_last_seen ON collected_emails(last_seen DESC);

-- Enable Row Level Security
ALTER TABLE collected_emails ENABLE ROW LEVEL SECURITY;

-- Create policy: Users can only see their own emails
CREATE POLICY "Users can view their own emails"
  ON collected_emails
  FOR SELECT
  USING (auth.uid() = user_id);

-- Create policy: Users can insert their own emails
CREATE POLICY "Users can insert their own emails"
  ON collected_emails
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create policy: Users can update their own emails
CREATE POLICY "Users can update their own emails"
  ON collected_emails
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Create policy: Users can delete their own emails
CREATE POLICY "Users can delete their own emails"
  ON collected_emails
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create function to automatically set user_id on insert
CREATE OR REPLACE FUNCTION set_user_id()
RETURNS TRIGGER AS $$
BEGIN
  NEW.user_id = auth.uid();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically set user_id
CREATE TRIGGER set_collected_emails_user_id
  BEFORE INSERT ON collected_emails
  FOR EACH ROW
  EXECUTE FUNCTION set_user_id();

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update updated_at
CREATE TRIGGER update_collected_emails_updated_at
  BEFORE UPDATE ON collected_emails
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

## Step 4: Configure EmailBoy Extension

1. Open the EmailBoy extension popup
2. Click "⚙️ Settings"
3. Enter your Supabase credentials:
   - **Supabase Project URL**: Paste your Project URL
   - **Supabase Anon Key**: Paste your anon/public key
4. Check "Automatically sync to Supabase" if you want real-time syncing
5. Click "Save Settings"
6. Click "Test Supabase Connection" to verify

## Step 5: Sign Up / Sign In

1. In the extension popup, you'll see a sign-in form
2. Click "Sign Up" to create an account (or "Sign In" if you already have one)
3. After signing in, emails will automatically sync to your Supabase database

## Optional: Using Supabase Edge Functions

If you prefer to use Edge Functions instead of direct database access, you can create an Edge Function:

### Create Edge Function

1. In Supabase dashboard, go to **Edge Functions**
2. Click "Create a new function"
3. Name it `store-emails`
4. Replace the code with:

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    const { emails } = await req.json()
    
    // Get user from session
    const {
      data: { user },
    } = await supabaseClient.auth.getUser()

    if (!user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Prepare emails with user_id
    const emailRecords = emails.map((item: any) => ({
      email: item.email.toLowerCase().trim(),
      domain: item.domain,
      url: item.url,
      urls: item.urls || [item.url],
      first_seen: item.timestamp,
      last_seen: item.lastSeen || item.timestamp,
      user_id: user.id
    }))

    // Upsert emails
    const { data, error } = await supabaseClient
      .from('collected_emails')
      .upsert(emailRecords, { onConflict: 'email,user_id' })

    if (error) throw error

    return new Response(
      JSON.stringify({ success: true, count: emailRecords.length }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
```

5. Deploy the function
6. Update the extension to use: `https://your-project.supabase.co/functions/v1/store-emails`

## Troubleshooting

### "Not authenticated" error
- Make sure you've signed in through the extension popup
- Check that your Supabase anon key is correct

### "Table does not exist" error
- Make sure you've run the SQL script to create the table
- Check the table name matches: `collected_emails`

### "Permission denied" error
- Verify Row Level Security policies are set up correctly
- Make sure the trigger function is created to set `user_id` automatically

### Emails not syncing
- Check "Automatically sync to Supabase" is enabled in settings
- Verify your Supabase URL and key are correct
- Check browser console for errors

## Security Notes

- The `anon` key is safe to use in client-side code (it's public)
- Row Level Security ensures users can only access their own emails
- Never share your `service_role` key (it bypasses RLS)

