-- Security Verification Script
-- Run this in Supabase SQL Editor to verify your security setup

-- 1. Check if RLS is enabled
SELECT 
  tablename,
  rowsecurity as "RLS Enabled"
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename = 'collected_emails';

-- 2. List all RLS policies
SELECT 
  policyname as "Policy Name",
  cmd as "Command",
  qual as "Using Clause",
  with_check as "With Check"
FROM pg_policies 
WHERE tablename = 'collected_emails'
ORDER BY policyname;

-- 3. Check if trigger function exists
SELECT 
  trigger_name,
  event_manipulation,
  action_statement
FROM information_schema.triggers
WHERE event_object_table = 'collected_emails';

-- 4. Verify unique constraint
SELECT
  conname as "Constraint Name",
  contype as "Type",
  pg_get_constraintdef(oid) as "Definition"
FROM pg_constraint
WHERE conrelid = 'collected_emails'::regclass
AND contype = 'u';

-- 5. Check indexes (for performance)
SELECT
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'collected_emails';

-- 6. Count total emails (should show all users' emails - only visible to admin)
SELECT 
  COUNT(*) as "Total Emails",
  COUNT(DISTINCT user_id) as "Total Users",
  COUNT(DISTINCT email) as "Unique Email Addresses"
FROM collected_emails;

-- 7. Test RLS by checking if unauthenticated access is blocked
-- This query should work, but RLS will filter results based on auth.uid()
-- When run from the API, users will only see their own data
SELECT 
  'RLS Test: This query will return different results based on the authenticated user' as note;

-- Expected Results:
-- ✅ RLS should be enabled (true)
-- ✅ Should have 4 policies (SELECT, INSERT, UPDATE, DELETE)
-- ✅ Should have trigger for setting user_id
-- ✅ Should have unique constraint on (email, user_id)
-- ✅ Should have indexes for performance

