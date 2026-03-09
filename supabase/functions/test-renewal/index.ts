import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const results: any[] = [];

    // Login
    const loginRes = await fetch('https://api-new.paineloffice.click/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'Robsonamorim', password: 'vitoriadaluz' })
    });
    const loginData = JSON.parse(await loginRes.text());
    const { token, username, password } = loginData;
    results.push({ step: 'login', token, username, password });

    const userId = "20555";
    const qs = `token=${encodeURIComponent(token)}&password=${encodeURIComponent(password)}&username=${encodeURIComponent(username)}`;

    // Test 1: PUT with query params ONLY (no Bearer)
    let r = await fetch(`https://api-new.paineloffice.click/p2p/extend/${userId}?${qs}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });
    results.push({ test: 'PUT query-only', status: r.status, body: (await r.text()).substring(0, 500) });

    // Test 2: PUT with Bearer + query params  
    r = await fetch(`https://api-new.paineloffice.click/p2p/extend/${userId}?${qs}`, {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });
    results.push({ test: 'PUT Bearer+query', status: r.status, body: (await r.text()).substring(0, 500) });

    // Test 3: PUT with raw password (not base64) in query
    const qs2 = `token=${encodeURIComponent(token)}&password=vitoriadaluz&username=Robsonamorim`;
    r = await fetch(`https://api-new.paineloffice.click/p2p/extend/${userId}?${qs2}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });
    results.push({ test: 'PUT raw-creds', status: r.status, body: (await r.text()).substring(0, 500) });

    return new Response(JSON.stringify(results, null, 2), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
