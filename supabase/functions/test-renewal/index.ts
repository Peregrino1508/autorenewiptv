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
    const userId = "20555";
    const authHeaders = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
    const results: any[] = [];

    // More payload variants
    const payloads = [
      { name: 'exp_date only', body: { exp_date: "2026-05-08T23:59:59.999Z" } },
      { name: 'username+exp_date', body: { username: "39975095", exp_date: "2026-05-08T23:59:59.999Z" } },
      { name: 'id+exp_date', body: { id: 20555, exp_date: "2026-05-08T23:59:59.999Z" } },
      { name: 'full user fields', body: { username: "39975095", password: "53825852", exp_date: "2026-05-08T23:59:59.999Z", package: "5da17892133a1d61888029aa", id_res: "4556", enabled: true, system: "P2P" } },
    ];

    for (const p of payloads) {
      const r = await fetch(`${apiBase}/extend/${userId}`, {
        method: 'PUT',
        headers: authHeaders,
        body: JSON.stringify(p.body)
      });
      const t = await r.text();
      results.push({ test: p.name, status: r.status, body: t.substring(0, 300) });
    }

    // Also try other endpoints
    const endpoints = [
      { name: 'PUT /renew/20555', method: 'PUT', url: `${apiBase}/renew/${userId}`, body: { exp_date: "2026-05-08T23:59:59.999Z" } },
      { name: 'PUT /update/20555', method: 'PUT', url: `${apiBase}/update/${userId}`, body: { exp_date: "2026-05-08T23:59:59.999Z" } },
      { name: 'PUT /user/20555', method: 'PUT', url: `${apiBase}/user/${userId}`, body: { exp_date: "2026-05-08T23:59:59.999Z" } },
      { name: 'PUT /edit/20555', method: 'PUT', url: `${apiBase}/edit/${userId}`, body: { exp_date: "2026-05-08T23:59:59.999Z" } },
    ];

    for (const e of endpoints) {
      const r = await fetch(e.url, { method: e.method, headers: authHeaders, body: JSON.stringify(e.body) });
      const t = await r.text();
      results.push({ test: e.name, status: r.status, body: t.substring(0, 300) });
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
