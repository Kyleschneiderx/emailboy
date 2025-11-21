// Supabase Edge Function: checkout-cancel
// Handles Stripe checkout cancel redirect to portal

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  // Get portal URL and redirect there
  const PORTAL_URL = Deno.env.get('PORTAL_URL') || 'http://localhost:5173'
  
  return new Response(null, {
    status: 302,
    headers: {
      ...corsHeaders,
      'Location': `${PORTAL_URL}?checkout=cancel`,
    },
  });
})
