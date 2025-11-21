# Portal Security Guide

## Overview

The EmailBoy subscription portal implements multiple layers of security to ensure that:
1. Only authenticated users can access the portal
2. Users can only see and modify their own subscription data
3. Session tokens are validated and refreshed automatically
4. All API calls are properly authenticated

## Security Layers

### 1. Authentication & Session Management

#### Session Validation
- **Token Expiration Checking**: Tokens are checked for expiration before use
- **Server-Side Validation**: Every session is validated with Supabase auth server
- **Automatic Refresh**: Expired tokens are automatically refreshed when possible
- **Session Cleanup**: Invalid sessions are automatically cleared from localStorage

#### Implementation
- `sessionValidation.ts`: Core validation logic
- `useSupabaseSession` hook: Validates session on mount and periodically
- `AuthGuard` component: Protects routes requiring authentication

### 2. Row Level Security (RLS)

The database enforces Row Level Security policies:

```sql
-- Users can only view their own subscription
CREATE POLICY "Users can view their own subscription"
  ON user_subscriptions
  FOR SELECT
  USING (auth.uid() = user_id);
```

**Key Points:**
- RLS is enforced at the database level
- Even if someone bypasses frontend checks, RLS prevents data access
- Each query automatically filters by `auth.uid()`

### 3. Edge Function Security

All Supabase Edge Functions validate authentication:

```typescript
// Verify user is authenticated
const { data: { user }, error: authError } = await supabaseClient.auth.getUser()

if (authError || !user) {
  return new Response(
    JSON.stringify({ error: 'Unauthorized. Please sign in.' }),
    { status: 401 }
  )
}
```

**Security Features:**
- Every function checks `auth.getUser()` before processing
- User ID is extracted from the validated token
- All database queries use the authenticated user's ID

### 4. API Request Security

#### Token Validation
- All API requests include `Authorization: Bearer <token>` header
- Tokens are validated before each request
- Expired tokens trigger automatic refresh or sign-out

#### Error Handling
- 401/403 errors automatically clear invalid sessions
- Users are prompted to sign in again when sessions expire
- No sensitive data is exposed in error messages

### 5. Frontend Protection

#### AuthGuard Component
- Wraps protected routes
- Validates session before rendering content
- Shows sign-in prompt for unauthenticated users

#### Session Monitoring
- Periodic validation (every 5 minutes)
- Storage event listeners for session updates
- Automatic cleanup of expired sessions

## Data Isolation

### How Data is Linked to Users

1. **Session Token**: Contains the authenticated user's ID
2. **Database Queries**: Filtered by `user_id = auth.uid()`
3. **RLS Policies**: Enforce user-specific access at database level
4. **Edge Functions**: Extract user ID from validated token

### Example Flow

```
User opens portal
  ↓
Session loaded from localStorage
  ↓
Token validated with Supabase auth server
  ↓
API call made with validated token
  ↓
Edge function extracts user ID from token
  ↓
Database query filtered by user_id (RLS enforced)
  ↓
Only user's own data returned
```

## Security Best Practices

### ✅ Implemented

1. **Token Expiration Checking**: Prevents use of expired tokens
2. **Server-Side Validation**: Every session validated with auth server
3. **Automatic Token Refresh**: Seamless user experience
4. **RLS Enforcement**: Database-level security
5. **Error Handling**: Proper cleanup of invalid sessions
6. **Auth Guards**: Route-level protection

### ⚠️ Additional Recommendations

1. **CORS Configuration**: Consider restricting CORS origins in production
2. **Rate Limiting**: Enable rate limiting in Supabase dashboard
3. **HTTPS Only**: Ensure portal is served over HTTPS in production
4. **Content Security Policy**: Add CSP headers to prevent XSS
5. **Session Timeout**: Consider implementing idle timeout

## CORS Configuration

Currently, Edge Functions use permissive CORS (`*`) for development. For production:

1. Update Edge Functions to restrict origins:
```typescript
const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://your-portal-domain.com',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}
```

2. Or use environment variable:
```typescript
const allowedOrigin = Deno.env.get('ALLOWED_ORIGIN') || '*';
const corsHeaders = {
  'Access-Control-Allow-Origin': allowedOrigin,
  // ...
}
```

## Testing Security

### Verify Session Validation
1. Open portal with valid session
2. Manually expire token in localStorage
3. Portal should detect and prompt for re-authentication

### Verify RLS
1. Try to access another user's subscription ID
2. Database should return empty result (RLS blocks it)

### Verify Edge Function Security
1. Make API call without Authorization header
2. Should receive 401 Unauthorized

## Troubleshooting

### "Session expired" errors
- Check if token is actually expired
- Verify Supabase auth server is accessible
- Check browser console for detailed errors

### "Unauthorized" errors
- Verify session exists in localStorage
- Check if token format is correct
- Ensure Supabase URL and keys are configured

### Data not loading
- Verify RLS policies are enabled
- Check user_id matches auth.uid()
- Review Edge Function logs in Supabase dashboard

