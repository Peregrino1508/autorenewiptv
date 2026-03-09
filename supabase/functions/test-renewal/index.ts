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

    // Get swagger JSON
    const paths = [
      'https://api-new.paineloffice.click/api-docs/swagger.json',
      'https://api-new.paineloffice.click/api-docs-json',
      'https://api-new.paineloffice.click/swagger.json',
      'https://api-new.paineloffice.click/api-docs/v1/swagger.json',
    ];
    const results: any[] = [];

    for (const url of paths) {
      const r = await fetch(url, { headers: authHeaders });
      const t = await r.text();
      results.push({ url, status: r.status, body: t.substring(0, 2000) });
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
