import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const results: any[] = [];

    // Step 1: Login to get real token
    const loginRes = await fetch('https://api-new.paineloffice.click/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'Robsonamorim', password: 'vitoriadaluz' })
    });
    const loginData = JSON.parse(await loginRes.text());
    results.push({ step: 'login', status: loginRes.status, data: loginData });

    const authToken = loginData.token;
    const authUsername = loginData.username;
    const authPassword = loginData.password;

    // Step 2: Search for user 39975095
    const listUrl = `https://api-new.paineloffice.click/p2p/list?limit=10&page=1&search=39975095`;
    const listRes = await fetch(listUrl, {
      headers: { 'Authorization': `Bearer ${authToken}`, 'Content-Type': 'application/json' }
    });
    const listText = await listRes.text();
    results.push({ step: 'list', status: listRes.status, body: listText.substring(0, 500) });

    let userId: string | null = null;
    try {
      const listData = JSON.parse(listText);
      const items = listData.items || listData.data || listData;
      if (Array.isArray(items) && items.length > 0) {
        const found = items.find((u: any) => String(u.username) === "39975095");
        if (found) userId = String(found.id);
      }
    } catch (e) {}

    results.push({ step: 'userId', userId });

    if (userId) {
      // Step 3: Extend via PUT with query params
      const extendUrl = `https://api-new.paineloffice.click/p2p/extend/${userId}?token=${encodeURIComponent(authToken)}&password=${encodeURIComponent(authPassword)}&username=${encodeURIComponent(authUsername)}`;
      const extendRes = await fetch(extendUrl, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${authToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });
      const extendText = await extendRes.text();
      results.push({ step: 'extend', status: extendRes.status, body: extendText.substring(0, 500) });
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
