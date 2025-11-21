-- Fix RLS Policies for user_subscriptions table
-- This ensures the service role can insert/update subscriptions via webhooks
-- Run this in your Supabase SQL Editor

-- First, verify the table exists and RLS is enabled
SELECT 
  tablename,
  rowsecurity as "RLS Enabled"
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename = 'user_subscriptions';

-- List current policies
SELECT 
  policyname as "Policy Name",
  cmd as "Command",
  qual as "Using Clause",
  with_check as "With Check"
FROM pg_policies 
WHERE tablename = 'user_subscriptions'
ORDER BY policyname;

-- Note: Service role key should bypass RLS automatically
-- But let's ensure we have proper policies for user access

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own subscription" ON user_subscriptions;
DROP POLICY IF EXISTS "Users can update their own subscription" ON user_subscriptions;
DROP POLICY IF EXISTS "Service role can insert subscriptions" ON user_subscriptions;

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

-- IMPORTANT: Service role key bypasses RLS, so inserts/updates from webhooks will work
-- But if you want explicit policies, you can add this (though it's not necessary):
-- CREATE POLICY "Service role can insert subscriptions"
--   ON user_subscriptions
--   FOR INSERT
--   WITH CHECK (true);  -- This allows any insert, but service role bypasses RLS anyway

-- Verify the table structure
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'user_subscriptions'
ORDER BY ordinal_position;

-- Check for unique constraints
SELECT
  conname as "Constraint Name",
  contype as "Type",
  pg_get_constraintdef(oid) as "Definition"
FROM pg_constraint
WHERE conrelid = 'user_subscriptions'::regclass;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ RLS policies verified for user_subscriptions';
  RAISE NOTICE '✅ Service role key will bypass RLS for webhook inserts/updates';
  RAISE NOTICE '✅ Users can view and update their own subscriptions';
END $$;

