import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const token = "7222a544a4eddc1fadcfb1fa679fa2fb";
    const apiBase = "https://api-new.paineloffice.click/p2p";
    const results: any[] = [];

    // Test 1: Bearer token on /info
    const r1 = await fetch(`${apiBase}/info`, {
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
    });
    results.push({ test: 'Bearer on /info', status: r1.status, body: (await r1.text()).substring(0, 500) });

    // Test 2: Bearer token on /list
    const r2 = await fetch(`${apiBase}/list?limit=5&page=1`, {
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
    });
    results.push({ test: 'Bearer on /list', status: r2.status, body: (await r2.text()).substring(0, 500) });

    // Test 3: x-access-token header
    const r3 = await fetch(`${apiBase}/info`, {
      headers: { 'x-access-token': token, 'Content-Type': 'application/json' }
    });
    results.push({ test: 'x-access-token on /info', status: r3.status, body: (await r3.text()).substring(0, 500) });

    // Test 4: token as query param
    const r4 = await fetch(`${apiBase}/info?token=${token}`);
    results.push({ test: 'query param token on /info', status: r4.status, body: (await r4.text()).substring(0, 500) });

    return new Response(JSON.stringify(results, null, 2), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
