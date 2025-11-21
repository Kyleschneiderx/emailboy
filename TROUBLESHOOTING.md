# Troubleshooting Guide

## Sign Up Failing with 401 Error

If you're getting a 401 error when trying to sign up, here are the most common causes and solutions:

### 1. Edge Function Not Deployed

**Symptom:** 401 error, "Sign up failed"

**Solution:** Deploy the edge function first:

```bash
# Make sure you're in the project directory
cd /Users/kyleschneider/Documents/emailboy

# Deploy the signup function
supabase functions deploy auth-signup
```

### 2. Check Function Deployment Status

Verify the function is deployed:
1. Go to Supabase Dashboard → Edge Functions
2. Check if `auth-signup` appears in the list
3. Click on it to see deployment status

### 3. Check Function Logs

View logs to see what's happening:
```bash
supabase functions logs auth-signup --tail
```

Or in Supabase Dashboard:
- Edge Functions → auth-signup → Logs

### 4. Environment Variables Not Set

Edge functions need these environment variables (they should be automatic):
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`

If missing, you can set them manually:
```bash
supabase secrets set SUPABASE_URL=https://xgllxidtqbkftsbhiinl.supabase.co
supabase secrets set SUPABASE_ANON_KEY=your_anon_key_here
```

### 5. Test Function Directly

Test the function with curl to see the actual error:

```bash
curl -X POST https://xgllxidtqbkftsbhiinl.supabase.co/functions/v1/auth-signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "test123456"
  }'
```

This will show you the exact error message.

### 6. Quick Fix: Use Direct Supabase Auth (Temporary)

If edge functions aren't working, you can temporarily use direct Supabase auth. Update `popup.js`:

```javascript
// Temporary: Use direct Supabase auth instead of edge function
async function handleSignUp() {
  // ... existing code ...
  
  try {
    // Use direct Supabase client (temporary workaround)
    const supabaseClient = window.supabase.createClient(
      'https://xgllxidtqbkftsbhiinl.supabase.co',
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhnbGx4aWR0cWJrZnRzYmhpaW5sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMxNTY2NzEsImV4cCI6MjA3ODczMjY3MX0.gCK3wRjpVF-BFwaLrF_3P4Rb3-lbFPqeu7JxHRQKky4'
    );
    
    const { data, error } = await supabaseClient.auth.signUp({
      email,
      password
    });
    
    if (error) throw error;
    
    // ... rest of the code ...
  }
}
```

### 7. Check Browser Console

Open browser DevTools (F12) and check:
- **Console tab**: Look for detailed error messages
- **Network tab**: Check the actual request/response to the edge function
  - Look for the `auth-signup` request
  - Check the response status and body

### 8. Verify Supabase Project Settings

1. Go to Supabase Dashboard → Settings → API
2. Verify your project URL is correct
3. Verify your anon key is correct
4. Check if email confirmations are enabled (might affect signup)

### 9. Common Error Messages

**"Server configuration error: Missing Supabase credentials"**
- Solution: Environment variables not set in edge function
- Fix: Deploy function or set secrets manually

**"User already registered"**
- Solution: Email already exists, try signing in instead

**"Invalid email format"**
- Solution: Check email format is valid

**"Password must be at least 6 characters"**
- Solution: Use a longer password

**401 Unauthorized**
- Most likely: Function not deployed or environment variables missing
- Check: Function deployment status and logs

## Still Having Issues?

1. Check Supabase Dashboard → Edge Functions → Logs for detailed errors
2. Check browser console for client-side errors
3. Verify all functions are deployed
4. Try the direct auth workaround above to test if it's an edge function issue

