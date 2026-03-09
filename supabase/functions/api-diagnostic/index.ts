import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get panel credentials
    const { data: panel } = await supabase
      .from('iptv_panels')
      .select('*')
      .eq('is_active', true)
      .single();

    if (!panel) throw new Error('Painel não encontrado');

    const adminUser = panel.admin_user;
    const adminPassword = panel.admin_password;
    const apiBase = panel.url.replace(/\/+$/, '');
    const apiRoot = apiBase.replace(/\/(p2p|iptv|nexus|red-club)$/i, '');

    const results: any = { panel_name: panel.name, apiRoot, adminUser };

    // Step 1: Login
    const loginResponse = await fetch(`${apiRoot}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: adminUser, password: adminPassword })
    });
    const loginData = await loginResponse.json();
    results.login_status = loginResponse.status;
    results.login_success = !!loginData.auth;
    results.has_token = !!loginData.token;

    if (!loginData.auth || !loginData.token) {
      results.login_error = loginData;
      return new Response(JSON.stringify(results), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const authToken = loginData.token;
    const authQs = `token=${encodeURIComponent(authToken)}&password=${encodeURIComponent(adminPassword)}&username=${encodeURIComponent(adminUser)}`;

    // Step 2: Try to get price info for IPTV
    try {
      const priceResp = await fetch(`${apiRoot}/iptv/price?${authQs}`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      results.iptv_price_status = priceResp.status;
      results.iptv_price = await priceResp.json();
    } catch (e) { results.iptv_price_error = e.message; }

    // Step 3: Try P2P create with isTrial=true (should be free)
    try {
      const p2pResp = await fetch(`${apiRoot}/p2p?${authQs}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          isTrial: true,
          packageId: "5da17892133a1d61888029aa",
          notes: "teste-diagnostico-lovable",
          typeUser: 2
        })
      });
      results.p2p_create_status = p2pResp.status;
      results.p2p_create_data = await p2pResp.json();
    } catch (e) { results.p2p_create_error = e.message; }

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
