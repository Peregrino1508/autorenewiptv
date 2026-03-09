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

    const body = await req.json().catch(() => ({}));
    const action = body.action || 'test-login';

    const results: any = { action };

    // Get panel
    const { data: panel } = await supabase
      .from('iptv_panels')
      .select('*')
      .eq('is_active', true)
      .single();

    if (!panel) throw new Error('Painel não encontrado');

    const apiRoot = panel.url.replace(/\/+$/, '').replace(/\/(p2p|iptv|nexus|red-club)$/i, '');
    results.panel = panel.name;
    results.apiRoot = apiRoot;

    if (action === 'update-password') {
      // Update password in DB to real password
      const { error } = await supabase
        .from('iptv_panels')
        .update({ admin_password: 'vitoriadaluz' })
        .eq('id', panel.id);
      results.password_updated = !error;
      if (error) results.update_error = error.message;
    }

    // Always test login with real password
    const testPassword = action === 'update-password' ? 'vitoriadaluz' : panel.admin_password;
    
    const loginResp = await fetch(`${apiRoot}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: panel.admin_user, password: testPassword })
    });
    const loginData = await loginResp.json();
    results.login_status = loginResp.status;
    results.login_success = !!loginData.auth;
    results.password_used = testPassword.substring(0, 4) + '...';

    if (!loginData.auth || !loginData.token) {
      // Try with vitoriadaluz if current password failed
      if (testPassword !== 'vitoriadaluz') {
        const login2 = await fetch(`${apiRoot}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: panel.admin_user, password: 'vitoriadaluz' })
        });
        const login2Data = await login2.json();
        results.retry_with_real_password = login2.status;
        results.retry_success = !!login2Data.auth;
        
        if (login2Data.auth && login2Data.token) {
          results.message = 'Login com senha real funcionou! Atualizando banco...';
          // Update DB
          await supabase.from('iptv_panels').update({ admin_password: 'vitoriadaluz' }).eq('id', panel.id);
          results.db_updated = true;
          
          // Now try create P2P trial
          const authToken = login2Data.token;
          const qs = `token=${encodeURIComponent(authToken)}&password=${encodeURIComponent('vitoriadaluz')}&username=${encodeURIComponent(panel.admin_user)}`;
          
          if (action === 'create-p2p-trial') {
            const createResp = await fetch(`${apiRoot}/p2p?${qs}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken}` },
              body: JSON.stringify({ isTrial: true, packageId: "5da17892133a1d61888029aa", notes: "teste-lovable", typeUser: 2 })
            });
            results.p2p_create_status = createResp.status;
            results.p2p_create_data = await createResp.json();
          }
        }
      }
      
      if (!results.db_updated) {
        results.login_error = loginData;
      }
      
      return new Response(JSON.stringify(results, null, 2), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const authToken = loginData.token;
    results.token_obtained = authToken.substring(0, 20) + '...';

    if (action === 'create-p2p-trial') {
      const qs = `token=${encodeURIComponent(authToken)}&password=${encodeURIComponent(testPassword)}&username=${encodeURIComponent(panel.admin_user)}`;
      const createResp = await fetch(`${apiRoot}/p2p?${qs}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken}` },
        body: JSON.stringify({ isTrial: true, packageId: "5da17892133a1d61888029aa", notes: "teste-lovable", typeUser: 2 })
      });
      results.p2p_create_status = createResp.status;
      results.p2p_create_data = await createResp.json();
    }

    if (action === 'create-iptv-trial') {
      const qs = `token=${encodeURIComponent(authToken)}&password=${encodeURIComponent(testPassword)}&username=${encodeURIComponent(panel.admin_user)}`;
      const createResp = await fetch(`${apiRoot}/iptv?${qs}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken}` },
        body: JSON.stringify({ packageId: 24, isTrial: true, notes: "teste-lovable", screen: 1, whatsapp: "" })
      });
      results.iptv_create_status = createResp.status;
      results.iptv_create_data = await createResp.json();
    }

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
