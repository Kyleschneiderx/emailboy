// Shared helper: validates permanent API tokens from user_api_tokens table
// Used by all authenticated edge functions instead of Supabase JWT auth

import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'

export function getServiceClient(): SupabaseClient {
  return createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  )
}

type ValidateSuccess = { userId: string; email: string }
type ValidateError = { error: string; status: number }

export async function validateToken(req: Request): Promise<ValidateSuccess | ValidateError> {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return { error: 'Missing or invalid authorization header', status: 401 }
  }

  const token = authHeader.replace('Bearer ', '')
  if (!token || token.length < 32) {
    return { error: 'Invalid token format', status: 401 }
  }

  const supabase = getServiceClient()

  // Look up token in user_api_tokens
  const { data, error } = await supabase
    .from('user_api_tokens')
    .select('user_id')
    .eq('token', token)
    .single()

  if (error || !data) {
    return { error: 'Invalid or expired token', status: 401 }
  }

  // Get user email from auth.users
  const { data: userData, error: userError } = await supabase.auth.admin.getUserById(data.user_id)

  if (userError || !userData?.user) {
    return { error: 'User not found', status: 401 }
  }

  // Fire-and-forget: update last_used_at for token activity tracking
  supabase
    .from('user_api_tokens')
    .update({ last_used_at: new Date().toISOString() })
    .eq('token', token)
    .then(() => {})
    .catch(() => {})

  return { userId: data.user_id, email: userData.user.email! }
}

// Helper to check if validateToken returned an error
export function isValidateError(result: ValidateSuccess | ValidateError): result is ValidateError {
  return 'error' in result
}

// Generate a cryptographically secure 64-character hex token
export function generateApiToken(): string {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('')
}
