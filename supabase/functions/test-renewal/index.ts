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
    const token = loginData.token;
    const userId = "20555";
    const qs = `token=${encodeURIComponent(token)}&password=vitoriadaluz&username=Robsonamorim`;
    const url = `https://api-new.paineloffice.click/p2p/extend/${userId}?${qs}`;

    // Test with create DTO fields
    const payloads = [
      { name: 'month:1', body: { month: 1 } },
      { name: 'month:0.5', body: { month: 0.5 } },
      { name: 'isTrial:false', body: { isTrial: false } },
      { name: 'typeUser:2', body: { typeUser: 2 } },
      { name: 'packageId', body: { packageId: "5da17892133a1d61888029aa" } },
      { name: 'month+packageId', body: { month: 1, packageId: "5da17892133a1d61888029aa" } },
      { name: 'month+typeUser', body: { month: 1, typeUser: 2 } },
      { name: 'month+packageId+isTrial', body: { month: 1, packageId: "5da17892133a1d61888029aa", isTrial: false } },
      { name: 'all-create-fields', body: { month: 1, packageId: "5da17892133a1d61888029aa", notes: "felipe karina", isTrial: false, typeUser: 2, sale_value: 0 } },
    ];

    for (const p of payloads) {
      const r = await fetch(url, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(p.body)
      });
      const t = await r.text();
      results.push({ test: p.name, status: r.status, body: t.substring(0, 500) });
      if (!t.includes('missing field')) {
        results.push({ note: '*** DIFFERENT RESPONSE! ***' });
      }
    }

    return new Response(JSON.stringify(results, null, 2), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
