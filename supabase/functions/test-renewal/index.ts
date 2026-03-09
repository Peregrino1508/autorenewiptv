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
    const authHeaders = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };
    const results: any[] = [];

    // Try every single field from user object
    const singleFields = [
      { id_res: "4556" },
      { package: "5da17892133a1d61888029aa" },
      { system: "P2P" },
      { enabled: true },
      { trash: "false" },
      { trial: false },
      { screens: null },
      { notes: "felipe karina" },
      // Try combined required fields
      { id_res: "4556", package: "5da17892133a1d61888029aa" },
      { id_res: "4556", exp_date: "2026-05-08T23:59:59.999Z" },
      { package: "5da17892133a1d61888029aa", exp_date: "2026-05-08T23:59:59.999Z" },
      { id_res: "4556", package: "5da17892133a1d61888029aa", exp_date: "2026-05-08T23:59:59.999Z" },
    ];

    for (const body of singleFields) {
      const r = await fetch(`${apiBase}/extend/${userId}`, {
        method: 'PUT', headers: authHeaders, body: JSON.stringify(body)
      });
      const t = await r.text();
      results.push({ fields: Object.keys(body).join('+'), status: r.status, body: t.substring(0, 200) });
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
