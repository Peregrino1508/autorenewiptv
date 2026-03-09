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
    const { panel_url, admin_user, admin_password } = await req.json();
    const apiBase = panel_url.replace(/\/+$/, '');
    const results: any[] = [];

    // Test 1: Password as Bearer token on /info
    try {
      const r1 = await fetch(`${apiBase}/info`, {
        headers: { 'Authorization': `Bearer ${admin_password}`, 'Content-Type': 'application/json' }
      });
      const t1 = await r1.text();
      results.push({ test: 'Bearer password on /info', status: r1.status, body: t1.substring(0, 300) });
    } catch (e) { results.push({ test: 'Bearer password on /info', error: e.message }); }

    // Test 2: Password as x-api-key on /info
    try {
      const r2 = await fetch(`${apiBase}/info`, {
        headers: { 'x-api-key': admin_password, 'Content-Type': 'application/json' }
      });
      const t2 = await r2.text();
      results.push({ test: 'x-api-key password on /info', status: r2.status, body: t2.substring(0, 300) });
    } catch (e) { results.push({ test: 'x-api-key password on /info', error: e.message }); }

    // Test 3: POST /auth/login with JSON body
    try {
      const r3 = await fetch(`${apiBase}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: admin_user, password: admin_password })
      });
      const t3 = await r3.text();
      results.push({ test: 'POST /auth/login', status: r3.status, body: t3.substring(0, 300) });
    } catch (e) { results.push({ test: 'POST /auth/login', error: e.message }); }

    // Test 4: POST /login with form data
    try {
      const formData = new URLSearchParams();
      formData.append('username', admin_user);
      formData.append('password', admin_password);
      const r4 = await fetch(`${apiBase}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: formData.toString()
      });
      const t4 = await r4.text();
      results.push({ test: 'POST /login form-data', status: r4.status, body: t4.substring(0, 300) });
    } catch (e) { results.push({ test: 'POST /login form-data', error: e.message }); }

    // Test 5: GET /list with password as Bearer
    try {
      const r5 = await fetch(`${apiBase}/list`, {
        headers: { 'Authorization': `Bearer ${admin_password}`, 'Content-Type': 'application/json' }
      });
      const t5 = await r5.text();
      results.push({ test: 'Bearer password on /list', status: r5.status, body: t5.substring(0, 500) });
    } catch (e) { results.push({ test: 'Bearer password on /list', error: e.message }); }

    // Test 6: Username as token
    try {
      const r6 = await fetch(`${apiBase}/info`, {
        headers: { 'Authorization': `Bearer ${admin_user}`, 'Content-Type': 'application/json' }
      });
      const t6 = await r6.text();
      results.push({ test: 'Bearer username on /info', status: r6.status, body: t6.substring(0, 300) });
    } catch (e) { results.push({ test: 'Bearer username on /info', error: e.message }); }

    return new Response(JSON.stringify(results, null, 2), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
