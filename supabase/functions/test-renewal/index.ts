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

    const payloads = [
      { name: 'tipo', body: { tipo: "oficial" } },
      { name: 'pacote', body: { pacote: "5da17892133a1d61888029aa" } },
      { name: 'status', body: { status: "active" } },
      { name: 'tipo+pacote+status', body: { tipo: "oficial", pacote: "5da17892133a1d61888029aa", status: "active" } },
      { name: 'trial:false', body: { trial: false } },
      { name: 'trial:false+pack', body: { trial: false, package: "5da17892133a1d61888029aa" } },
      // Maybe it's boolean "official" field
      { name: 'official:true', body: { official: true } },
      { name: 'test:false', body: { test: false } },
      // Maybe the field is about the package ID
      { name: 'packageId', body: { packageId: "5da17892133a1d61888029aa" } },
      // Maybe it needs ALL these together
      { name: 'all-pt', body: { tipo: "oficial", pacote: "5da17892133a1d61888029aa", status: "ativo", trial: false, package: "5da17892133a1d61888029aa" } },
      // Maybe it expects the same fields as user schema
      { name: 'user-like', body: { username: "39975095", password: "53825852", package: "5da17892133a1d61888029aa", trial: false, enabled: true, system: "P2P" } },
    ];

    for (const p of payloads) {
      const r = await fetch(url, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(p.body)
      });
      const t = await r.text();
      results.push({ test: p.name, status: r.status, body: t.substring(0, 300) });
      if (!t.includes('missing field')) {
        results.push({ note: 'DIFFERENT RESPONSE FOUND!' });
        break;
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
