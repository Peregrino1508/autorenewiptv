import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
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

    // Verify admin role
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Não autorizado');

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) throw new Error('Não autorizado');

    const { data: hasRole } = await supabase.rpc('has_role', { _user_id: user.id, _role: 'admin' });
    if (!hasRole) throw new Error('Acesso negado: somente administradores');

    const { panel_id, test_type, notes } = await req.json();

    if (!panel_id) {
      throw new Error('panel_id é obrigatório');
    }

    // Fetch panel credentials
    const { data: panel, error: panelError } = await supabase
      .from('iptv_panels')
      .select('*')
      .eq('id', panel_id)
      .single();

    if (panelError || !panel) throw new Error('Painel não encontrado');

    const adminUser = panel.admin_user;
    const adminPassword = panel.admin_password;
    const apiBase = panel.url.replace(/\/+$/, '');

    // 1. Auth via static-token
    console.log(`[WWPanel Trial] Autenticando em ${apiBase}...`);
    const tokenResponse = await fetch(`${apiBase}/auth/static-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: adminUser, password: adminPassword })
    });
    const tokenText = await tokenResponse.text();
    console.log(`[WWPanel Trial] Token response: ${tokenResponse.status} - ${tokenText.substring(0, 300)}`);

    let tokenData;
    try { tokenData = JSON.parse(tokenText); } catch (e) {
      throw new Error(`Falha ao autenticar: ${tokenText.substring(0, 200)}`);
    }

    if (!tokenData.token) {
      throw new Error(`Token não retornado: ${tokenText.substring(0, 200)}`);
    }

    const authToken = tokenData.token;
    const authHeaders = {
      'Authorization': `Bearer ${authToken}`,
      'Content-Type': 'application/json'
    };

    // 2. Create trial line via POST /lines/test
    const trialNotes = notes || '';
    const createUrl = `${apiBase}/lines/test`;
    
    // Build payload based on test type
    let createBody: Record<string, unknown>;
    const testTypeNorm = (test_type || 'wplay').toLowerCase();
    
    if (testTypeNorm === 'krator') {
      createBody = {
        notes: trialNotes,
        package_p2p: "",
        package_iptv: "",
        krator_package: "1",
        testDuration: 4
      };
      console.log(`[WWPanel Trial] Criando teste KRATOR+ via POST ${createUrl}...`);
    } else {
      // wplay = P2P + IPTV
      createBody = {
        notes: trialNotes,
        package_p2p: "64399dca5ea59e8a1de2b083",
        package_iptv: "30",
        krator_package: "",
        testDuration: 4
      };
      console.log(`[WWPanel Trial] Criando teste WPLAY via POST ${createUrl}...`);
    }

    const createResponse = await fetch(createUrl, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify(createBody)
    });
    const createText = await createResponse.text();
    console.log(`[WWPanel Trial] Create response: ${createResponse.status} - ${createText.substring(0, 500)}`);

    let createData;
    try { createData = JSON.parse(createText); } catch (e) {
      throw new Error(`Resposta inesperada: ${createText.substring(0, 300)}`);
    }

    if (!createResponse.ok) {
      throw new Error(`Erro ao criar teste (${createResponse.status}): ${createText.substring(0, 300)}`);
    }

    return new Response(JSON.stringify({
      success: true,
      message: 'Teste WWPanel criado com sucesso!',
      data: createData
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error creating WWPanel trial:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
