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

    // Try complete user object
    const fullBody = {
      id: 20555, username: "39975095", password: "53825852", whatsapp: " 55 ",
      exp_date: "2026-05-08T23:59:59.999Z", package: "5da17892133a1d61888029aa",
      id_res: "4556", trial: false, enabled: true, trash: "false",
      notes: "felipe karina", screens: null, email: "", sale_value: 0, system: "P2P"
    };
    let r = await fetch(`${apiBase}/extend/${userId}`, { method: 'PUT', headers: authHeaders, body: JSON.stringify(fullBody) });
    results.push({ test: 'full-object', status: r.status, body: (await r.text()).substring(0, 300) });

    // Try with 'date' field
    const dateFields = [
      { date: "2026-05-08" },
      { date: "2026-05-08T23:59:59.999Z" },
      { credit: 30 },
      { credits: 30 },
      { plan: "5da17892133a1d61888029aa" },
      { type: "extend" },
      { action: "extend" },
      { password: "53825852" },
      { username: "39975095" },
      { value: 30 },
      { amount: 30 },
    ];
    for (const body of dateFields) {
      r = await fetch(`${apiBase}/extend/${userId}`, { method: 'PUT', headers: authHeaders, body: JSON.stringify(body) });
      results.push({ test: Object.keys(body)[0], status: r.status, body: (await r.text()).substring(0, 200) });
    }

    // Try username-based extend (instead of numeric ID)
    r = await fetch(`${apiBase}/extend/39975095`, { method: 'PUT', headers: authHeaders, body: JSON.stringify({ exp_date: "2026-05-08T23:59:59.999Z" }) });
    results.push({ test: 'extend-by-username', status: r.status, body: (await r.text()).substring(0, 200) });

    return new Response(JSON.stringify(results, null, 2), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
