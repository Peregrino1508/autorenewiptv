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
    const { username, panel_id, duration_days } = await req.json();

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get panel
    const { data: panel, error: panelError } = await supabase
      .from('iptv_panels')
      .select('*')
      .eq('id', panel_id)
      .single();

    if (panelError || !panel) {
      throw new Error('Panel not found: ' + panel_id);
    }

    console.log(`[Test] Panel: ${panel.name}, type: ${panel.panel_type}, url: ${panel.url}`);

    const apiBase = panel.url.replace(/\/+$/, '');
    const adminUser = panel.admin_user;
    const adminPassword = panel.admin_password;
    const months = Math.max(0.5, Math.round((duration_days / 30) * 2) / 2); // allow 0.5

    console.log(`[Test] Renovando ${username} por ${months} mês(es) (${duration_days} dias)...`);

    // 1. Auth
    console.log(`[Test] POST ${apiBase}/auth/static-token`);
    const tokenResponse = await fetch(`${apiBase}/auth/static-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: adminUser, password: adminPassword })
    });
    const tokenText = await tokenResponse.text();
    console.log(`[Test] Token response: ${tokenResponse.status} - ${tokenText.substring(0, 500)}`);

    let tokenData;
    try { tokenData = JSON.parse(tokenText); } catch (e) {
      throw new Error('Failed to parse token response: ' + tokenText.substring(0, 200));
    }

    if (!tokenData.token) {
      throw new Error('No token returned: ' + tokenText.substring(0, 200));
    }

    const authToken = tokenData.token;
    const authHeaders = {
      'Authorization': `Bearer ${authToken}`,
      'Content-Type': 'application/json'
    };

    // 2. Extend
    const credits = duration_days / 30; // 15 days = 0.5 credits
    const extendUrl = `${apiBase}/lines/extend/${username}`;
    console.log(`[Test] PATCH ${extendUrl} with credits=${credits}`);

    const extendResponse = await fetch(extendUrl, {
      method: 'PATCH',
      headers: authHeaders,
      body: JSON.stringify({ credits: credits })
    });
    const extendText = await extendResponse.text();
    console.log(`[Test] Extend response: ${extendResponse.status} - ${extendText.substring(0, 500)}`);

    return new Response(JSON.stringify({
      success: extendResponse.ok,
      status: extendResponse.status,
      response: extendText.substring(0, 1000),
      credits_used: credits,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Test error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
