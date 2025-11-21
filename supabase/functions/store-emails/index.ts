// Supabase Edge Function: store-emails
// Handles storing emails with proper authentication

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create Supabase client with user's auth token
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    // Verify user is authenticated
    const {
      data: { user },
      error: authError
    } = await supabaseClient.auth.getUser()

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized. Please sign in.' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Parse request body
    const { emails } = await req.json()
    
    if (!emails || !Array.isArray(emails)) {
      return new Response(
        JSON.stringify({ error: 'Invalid request: emails array required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Prepare email records with user_id
    const emailRecords = emails.map((item: any) => ({
      email: item.email.toLowerCase().trim(),
      domain: item.domain,
      url: item.url,
      urls: item.urls || [item.url],
      first_seen: item.timestamp || item.first_seen,
      last_seen: item.lastSeen || item.last_seen || item.timestamp,
      user_id: user.id // Explicitly set user_id from authenticated user
    }))

    // Upsert emails (merge duplicates based on email + user_id)
    const { data, error } = await supabaseClient
      .from('collected_emails')
      .upsert(emailRecords, { 
        onConflict: 'email,user_id',
        ignoreDuplicates: false 
      })

    if (error) {
      console.error('Database error:', error)
      throw error
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        count: emailRecords.length,
        message: `Stored ${emailRecords.length} email(s)` 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  } catch (error: any) {
    console.error('Edge function error:', error)
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Internal server error',
        details: error.toString()
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})

