# Security Guide for EmailBoy

## Understanding Supabase Security

### The Anon Key is Safe to be Public

The **anon key** (anonymous key) in your Supabase configuration is **designed to be public** and used in client-side code. Here's why it's safe:

1. **It's read-only by default** - The anon key alone cannot modify or delete data
2. **Row Level Security (RLS) protects your data** - Even with the anon key, users can only access their own data
3. **Authentication is required** - Users must sign in to perform any operations
4. **Each request is validated** - Supabase checks the user's authentication token on every request

### What the Anon Key CANNOT Do

- ❌ Access other users' data (RLS blocks this)
- ❌ Modify database schema
- ❌ Delete tables
- ❌ Access service_role functions
- ❌ Bypass Row Level Security policies

### What the Anon Key CAN Do (with proper auth)

- ✅ Allow users to sign up/sign in
- ✅ Allow users to insert their own emails (via RLS)
- ✅ Allow users to view their own emails (via RLS)
- ✅ Allow users to update their own emails (via RLS)

## Your Current Security Setup

Your database is protected by:

1. **Row Level Security (RLS)** - Enabled on `collected_emails` table
2. **User-specific policies** - Users can only see/modify their own data
3. **Automatic user_id assignment** - Database trigger ensures emails are tagged correctly
4. **Unique constraint** - Prevents duplicate emails per user

## Additional Security Measures

### 1. Verify Your RLS Policies

Run this query in Supabase SQL Editor to verify your policies:

```sql
-- Check RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename = 'collected_emails';

-- List all policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'collected_emails';
```

### 2. Enable Rate Limiting in Supabase

Go to your Supabase dashboard:
1. Settings → API
2. Enable rate limiting
3. Set appropriate limits (e.g., 100 requests per minute per IP)

### 3. Monitor Usage

In Supabase dashboard:
1. Go to **Logs** → **API Logs**
2. Monitor for suspicious activity
3. Set up alerts for unusual patterns

### 4. Review and Strengthen RLS Policies

Your current policies are good, but you can add additional checks:

```sql
-- Add a policy to prevent users from inserting emails for other users
-- (This should already be handled by the trigger, but extra protection doesn't hurt)
DROP POLICY IF EXISTS "Users can only insert with their own user_id" ON collected_emails;

CREATE POLICY "Users can only insert with their own user_id"
  ON collected_emails
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND
    user_id IS NOT NULL
  );
```

### 5. Enable Email Confirmation (Recommended)

In Supabase dashboard:
1. Go to **Authentication** → **Settings**
2. Enable **"Enable email confirmations"**
3. This requires users to verify their email before they can use the extension

### 6. Set Up Database Backups

In Supabase dashboard:
1. Go to **Settings** → **Database**
2. Enable automatic backups
3. Set backup retention period

### 7. Use Supabase's Built-in Security Features

- **API Keys**: Never share your `service_role` key (keep it secret!)
- **Database Functions**: Use SECURITY DEFINER functions carefully
- **Webhooks**: Monitor for suspicious activity
- **Auth Hooks**: Set up auth hooks to log sign-ups

## What If Someone Extracts the Anon Key?

Even if someone extracts your anon key from the extension code, they **cannot**:

1. **Access other users' data** - RLS policies prevent this
2. **Modify the database structure** - The anon key doesn't have those permissions
3. **Delete data** - RLS policies restrict deletions to own data only
4. **Bypass authentication** - They still need valid user credentials

## Best Practices

1. ✅ **Keep RLS enabled** - This is your primary protection
2. ✅ **Regularly review policies** - Make sure they're working as expected
3. ✅ **Monitor API usage** - Watch for unusual patterns
4. ✅ **Enable email confirmation** - Prevents spam accounts
5. ✅ **Set rate limits** - Prevents abuse
6. ✅ **Keep service_role key secret** - Never expose this in client code
7. ✅ **Regular backups** - Protect against data loss

## Testing Your Security

Test that RLS is working correctly:

```sql
-- As a test, try to query without authentication
-- This should return empty or error
SELECT * FROM collected_emails;

-- With proper authentication, users should only see their own data
-- This is automatically handled by RLS policies
```

## If You're Still Concerned

If you want additional protection, consider:

1. **Supabase Edge Functions** - Move sensitive operations to server-side
2. **API Gateway** - Add an additional layer with your own API
3. **Custom Authentication** - Implement your own auth system (more complex)
4. **IP Whitelisting** - Restrict access by IP (not practical for public extension)

However, for a public Chrome extension, the current setup with RLS is the **recommended and secure approach**.

## Summary

Your Supabase anon key being in the extension code is **safe and expected**. The real security comes from:

- ✅ Row Level Security policies
- ✅ User authentication
- ✅ Proper database constraints
- ✅ Supabase's built-in security features

The anon key is like a public API endpoint - it's meant to be accessible, but the data is protected by authentication and RLS policies.

