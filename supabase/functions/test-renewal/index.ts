import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const token = "7222a544a4eddc1fadcfb1fa679fa2fb";
    const authHeaders = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };
    const results: any[] = [];

    // Get Swagger JSON for schema details
    const swaggerPaths = [
      'https://api-new.paineloffice.click/api-docs-json',
      'https://api-new.paineloffice.click/api-docs/swagger.json',
      'https://api-new.paineloffice.click/swagger-json',
    ];
    for (const url of swaggerPaths) {
      const r = await fetch(url, { headers: authHeaders });
      const t = await r.text();
      results.push({ url, status: r.status, body: t.substring(0, 5000) });
    }

    // Also test POST /auth/login (the correct login endpoint from docs!)
    const loginRes = await fetch('https://api-new.paineloffice.click/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'Robsonamorim', password: 'vitoriadaluz' })
    });
    results.push({ test: 'POST /auth/login', status: loginRes.status, body: (await loginRes.text()).substring(0, 500) });

    return new Response(JSON.stringify(results, null, 2), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
