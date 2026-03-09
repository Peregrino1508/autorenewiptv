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

    // Test various body payloads for PUT /extend
    const payloads = [
      { name: 'days:30', body: { days: 30 } },
      { name: 'duration:30', body: { duration: 30 } },
      { name: 'months:1', body: { months: 1 } },
      { name: 'exp_date+days', body: { exp_date: "2026-05-08T23:59:59.999Z", days: 30 } },
      { name: 'package+days', body: { package: "5da17892133a1d61888029aa", days: 30 } },
      { name: 'period:30d', body: { period: "30d" } },
      { name: 'time:30', body: { time: 30 } },
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

    return new Response(JSON.stringify(results, null, 2), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
