-- EmailBoy Supabase Database Setup
-- Run this in your Supabase SQL Editor

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

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_collected_emails_user_id ON collected_emails(user_id);
CREATE INDEX IF NOT EXISTS idx_collected_emails_email ON collected_emails(email);
CREATE INDEX IF NOT EXISTS idx_collected_emails_last_seen ON collected_emails(last_seen DESC);

-- Enable Row Level Security (ensures users only see their own emails)
ALTER TABLE collected_emails ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for re-running this script)
DROP POLICY IF EXISTS "Users can view their own emails" ON collected_emails;
DROP POLICY IF EXISTS "Users can insert their own emails" ON collected_emails;
DROP POLICY IF EXISTS "Users can update their own emails" ON collected_emails;
DROP POLICY IF EXISTS "Users can delete their own emails" ON collected_emails;

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

-- Drop existing function and trigger if they exist
DROP TRIGGER IF EXISTS set_collected_emails_user_id ON collected_emails;
DROP TRIGGER IF EXISTS update_collected_emails_updated_at ON collected_emails;
DROP FUNCTION IF EXISTS set_user_id();
DROP FUNCTION IF EXISTS update_updated_at_column();

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

-- Create user_subscriptions table for Stripe premium subscriptions
CREATE TABLE IF NOT EXISTS user_subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  stripe_subscription_id TEXT UNIQUE,
  stripe_customer_id TEXT,
  status TEXT NOT NULL DEFAULT 'inactive',
  plan TEXT NOT NULL DEFAULT 'free',
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for subscriptions
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_id ON user_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_stripe_subscription_id ON user_subscriptions(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_status ON user_subscriptions(status);

-- Enable Row Level Security for subscriptions
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own subscription" ON user_subscriptions;
DROP POLICY IF EXISTS "Users can update their own subscription" ON user_subscriptions;

-- Create policy: Users can only see their own subscription
CREATE POLICY "Users can view their own subscription"
  ON user_subscriptions
  FOR SELECT
  USING (auth.uid() = user_id);

-- Create policy: Users can update their own subscription (for cancel/resume)
CREATE POLICY "Users can update their own subscription"
  ON user_subscriptions
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Note: Inserts are handled by webhook with service role key
-- Updates from webhooks use service role key (bypasses RLS)

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ EmailBoy database setup complete!';
  RAISE NOTICE '✅ Table created: collected_emails';
  RAISE NOTICE '✅ Table created: user_subscriptions';
  RAISE NOTICE '✅ Row Level Security enabled';
  RAISE NOTICE '✅ Policies created for multi-user support';
  RAISE NOTICE '✅ Triggers configured';
END $$;

