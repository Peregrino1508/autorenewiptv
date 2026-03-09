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
    const username = "39975095";
    const authHeaders = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
    const results: any[] = [];

    // Step 1: Search for user in list
    const listUrl = `${apiBase}/list?limit=100&page=1&orderBy=id&order=desc&search=${encodeURIComponent(username)}`;
    const listRes = await fetch(listUrl, { headers: authHeaders });
    const listText = await listRes.text();
    results.push({ step: '1-list', status: listRes.status, body: listText.substring(0, 800) });

    // Try to find user ID
    let internalUserId: string | null = null;
    try {
      const listData = JSON.parse(listText);
      const users = listData.items || listData.data || listData.users || listData.rows || listData;
      if (Array.isArray(users)) {
        const found = users.find((u: any) =>
          String(u.username) === String(username) ||
          String(u.password) === String(username) ||
          String(u.token) === String(username)
        );
        if (found) {
          internalUserId = String(found.id);
          results.push({ step: '2-found-user', id: internalUserId, user: JSON.stringify(found).substring(0, 300) });
        } else {
          results.push({ step: '2-not-found', usersCount: users.length, firstUser: users[0] ? JSON.stringify(users[0]).substring(0, 200) : 'none' });
        }
      }
    } catch (e) {
      results.push({ step: '2-parse-error', error: e.message });
    }

    if (internalUserId) {
      // Step 3: Try PUT /extend/{id}
      const extendUrl = `${apiBase}/extend/${internalUserId}`;
      const extRes = await fetch(extendUrl, { method: 'PUT', headers: authHeaders });
      const extText = await extRes.text();
      results.push({ step: '3-extend-PUT', status: extRes.status, body: extText.substring(0, 300) });

      // Step 4: Also try PATCH /extend/{id}
      const extRes2 = await fetch(extendUrl, { method: 'PATCH', headers: authHeaders });
      const extText2 = await extRes2.text();
      results.push({ step: '4-extend-PATCH', status: extRes2.status, body: extText2.substring(0, 300) });

      // Step 5: Try POST /extend/{id}
      const extRes3 = await fetch(extendUrl, { method: 'POST', headers: authHeaders });
      const extText3 = await extRes3.text();
      results.push({ step: '5-extend-POST', status: extRes3.status, body: extText3.substring(0, 300) });
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
