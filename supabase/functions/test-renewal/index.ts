import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const token = "7222a544a4eddc1fadcfb1fa679fa2fb";
    const apiBase = "https://api-new.paineloffice.click";
    const authHeaders = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };
    const results: any[] = [];

    // Check for API docs
    const docPaths = ['/docs', '/swagger', '/api-docs', '/api', '/p2p/docs', '/p2p/swagger', '/p2p/routes'];
    for (const p of docPaths) {
      const r = await fetch(`${apiBase}${p}`, { headers: authHeaders });
      const t = await r.text();
      results.push({ path: p, status: r.status, body: t.substring(0, 300) });
    }

    // Try different extend body structures with ALL possible fields
    const userId = "20555";
    const testBodies = [
      { name: 'telegram', body: { telegram: "" } },
      { name: 'whatsapp', body: { whatsapp: " 55 " } },
      { name: 'sale_value', body: { sale_value: 0 } },
      { name: 'reseller', body: { reseller: "4556" } },
      { name: 'renewal', body: { renewal: true } },
      { name: 'extend', body: { extend: true } },
      { name: 'renew', body: { renew: true } },
      { name: 'period+package', body: { period: 30, package: "5da17892133a1d61888029aa" } },
      { name: 'expDate camel', body: { expDate: "2026-05-08T23:59:59.999Z" } },
      { name: 'expirationDate', body: { expirationDate: "2026-05-08T23:59:59.999Z" } },
    ];
    for (const t of testBodies) {
      const r = await fetch(`${apiBase}/p2p/extend/${userId}`, { method: 'PUT', headers: authHeaders, body: JSON.stringify(t.body) });
      results.push({ test: t.name, status: r.status, body: (await r.text()).substring(0, 200) });
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
