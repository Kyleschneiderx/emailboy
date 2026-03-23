-- API Token System Migration
-- Run this in your Supabase SQL Editor
-- Adds permanent API tokens so users never get signed out of the Chrome extension

-- Create user_api_tokens table
CREATE TABLE IF NOT EXISTS user_api_tokens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  token TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index on token for fast lookups (every API call validates against this)
CREATE INDEX IF NOT EXISTS idx_user_api_tokens_token ON user_api_tokens(token);
CREATE INDEX IF NOT EXISTS idx_user_api_tokens_user_id ON user_api_tokens(user_id);

-- Enable RLS with no policies = only accessible via service role
ALTER TABLE user_api_tokens ENABLE ROW LEVEL SECURITY;

-- Update set_user_id() to handle service role context (auth.uid() is NULL)
-- When edge functions use service role client, they set user_id explicitly
CREATE OR REPLACE FUNCTION set_user_id()
RETURNS TRIGGER AS $$
BEGIN
  IF auth.uid() IS NOT NULL THEN
    NEW.user_id = auth.uid();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update log_suspicious_activity() to skip check under service role
CREATE OR REPLACE FUNCTION log_suspicious_activity()
RETURNS TRIGGER AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND NEW.user_id != auth.uid() THEN
    RAISE WARNING 'Suspicious activity detected: user_id mismatch for user %', auth.uid();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DO $$
BEGIN
  RAISE NOTICE 'API token system migration complete!';
  RAISE NOTICE 'Table created: user_api_tokens';
  RAISE NOTICE 'Triggers updated for service role compatibility';
END $$;
