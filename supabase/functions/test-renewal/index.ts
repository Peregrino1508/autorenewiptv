import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const results: any[] = [];

    // Login first to get fresh token
    const loginRes = await fetch('https://api-new.paineloffice.click/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'Robsonamorim', password: 'vitoriadaluz' })
    });
    const loginData = JSON.parse(await loginRes.text());
    const token = loginData.token;

    const userId = "20555";
    // Use raw credentials in query params (this passed auth!)
    const qs = `token=${encodeURIComponent(token)}&password=vitoriadaluz&username=Robsonamorim`;

    // The UpdateUserP2PDto likely needs package/exp_date/type fields
    // Test various body payloads
    const payloads = [
      { name: 'package only', body: { package: "5da17892133a1d61888029aa" } },
      { name: 'type:renewal', body: { type: "renewal" } },
      { name: 'type:extend', body: { type: "extend" } },
      { name: 'type:renew', body: { type: "renew" } },
      { name: 'type:official', body: { type: "official" } },
      { name: 'package+type', body: { package: "5da17892133a1d61888029aa", type: "renewal" } },
      { name: 'package+exp', body: { package: "5da17892133a1d61888029aa", exp_date: "2026-05-08T23:59:59.999Z" } },
      { name: 'package+type+exp', body: { package: "5da17892133a1d61888029aa", type: "renewal", exp_date: "2026-05-08T23:59:59.999Z" } },
      { name: 'id_res', body: { id_res: "4556" } },
      { name: 'pack+idres', body: { package: "5da17892133a1d61888029aa", id_res: "4556" } },
    ];

    for (const p of payloads) {
      const r = await fetch(`https://api-new.paineloffice.click/p2p/extend/${userId}?${qs}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(p.body)
      });
      const t = await r.text();
      results.push({ test: p.name, status: r.status, body: t.substring(0, 300) });
      // If we get a different response, stop
      if (!t.includes('missing field')) break;
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
