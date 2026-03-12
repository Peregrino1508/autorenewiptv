import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { step, token, userId } = await req.json();
    const apiRoot = "https://zapi.wwpanel.link";
    const adminUser = "Peregrino";
    const adminPassword = "15081986R6";

    if (step === "login") {
      const loginResp = await fetch(`${apiRoot}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: adminUser, password: adminPassword })
      });
      const text = await loginResp.text();
      return new Response(JSON.stringify({ status: loginResp.status, body: text }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (step === "search") {
      const searchUrl = `${apiRoot}/p2p/list?limit=100&page=1&orderBy=id&order=desc&search=422299`;
      const resp = await fetch(searchUrl, {
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
      });
      const text = await resp.text();
      return new Response(JSON.stringify({ status: resp.status, body: text.substring(0, 2000) }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (step === "extend") {
      const extendQs = `token=${encodeURIComponent(token)}&password=${encodeURIComponent(adminPassword)}&username=${encodeURIComponent(adminUser)}`;
      const extendUrl = `${apiRoot}/p2p/extend/${userId}?${extendQs}`;
      const resp = await fetch(extendUrl, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ month: 1 })
      });
      const text = await resp.text();
      return new Response(JSON.stringify({ status: resp.status, body: text.substring(0, 2000) }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ error: "step must be login, search, or extend" }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
