import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const results: any[] = [];

    // Get IPTV extend schema for comparison
    const r = await fetch('https://api-new.paineloffice.click/api-docs-json', {
      headers: { 'Authorization': 'Bearer 7222a544a4eddc1fadcfb1fa679fa2fb' }
    });
    const swagger = await r.json();
    const iptvExtend = swagger.paths?.['/iptv/extend/{id}'];
    const updateIptv = swagger.components?.schemas?.UpdateUserIptvDto;
    const createP2P = swagger.paths?.['/p2p']?.post;

    // Login
    const loginRes = await fetch('https://api-new.paineloffice.click/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'Robsonamorim', password: 'vitoriadaluz' })
    });
    const loginData = JSON.parse(await loginRes.text());
    const token = loginData.token;

    const userId = "20555";

    // Maybe the "missing field" is a query param. Try adding extra query params
    const extraParams = [
      'id_res=4556',
      'package=5da17892133a1d61888029aa',
      'type=official',
      'system=P2P',
      'trial=false',
      'reseller=4556',
    ];
    
    for (const extra of extraParams) {
      const qs = `token=${encodeURIComponent(token)}&password=vitoriadaluz&username=Robsonamorim&${extra}`;
      const r2 = await fetch(`https://api-new.paineloffice.click/p2p/extend/${userId}?${qs}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });
      const t = await r2.text();
      results.push({ test: `query:${extra}`, status: r2.status, body: t.substring(0, 300) });
      if (!t.includes('missing field')) {
        results.push({ note: 'DIFFERENT RESPONSE!' });
        break;
      }
    }

    results.push({ iptvExtend: JSON.stringify(iptvExtend).substring(0, 1000) });
    results.push({ updateIptv });
    results.push({ createP2P: JSON.stringify(createP2P).substring(0, 1000) });

    return new Response(JSON.stringify(results, null, 2), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
