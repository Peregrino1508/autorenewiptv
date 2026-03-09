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

    const { panel_id, system_type, notes } = await req.json();

    if (!panel_id || !system_type) {
      throw new Error('panel_id e system_type são obrigatórios');
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
    const apiRoot = apiBase.replace(/\/(p2p|iptv|nexus|red-club)$/i, '');

    // Step 1: Login to get JWT token
    console.log(`Autenticando ${adminUser} via POST /auth/login...`);
    const loginResponse = await fetch(`${apiRoot}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: adminUser, password: adminPassword })
    });
    const loginData = await loginResponse.json();

    if (!loginData.auth || !loginData.token) {
      throw new Error(`Login falhou: ${JSON.stringify(loginData).substring(0, 200)}`);
    }

    const authToken = loginData.token;
    console.log(`JWT obtido com sucesso`);

    // Build auth query params
    const authQs = `token=${encodeURIComponent(authToken)}&password=${encodeURIComponent(adminPassword)}&username=${encodeURIComponent(adminUser)}`;

    // Step 2: Create trial user
    let createUrl: string;
    let createBody: Record<string, unknown>;
    const trialNotes = notes || 'teste-auto';

    switch (system_type.toLowerCase()) {
      case 'iptv':
        createUrl = `${apiRoot}/iptv?${authQs}`;
        createBody = {
          packageId: 24,
          isTrial: true,
          notes: trialNotes,
          screen: 1,
          whatsapp: ""
        };
        break;
      case 'p2p':
        createUrl = `${apiRoot}/p2p?${authQs}`;
        createBody = {
          isTrial: true,
          packageId: "5da17892133a1d61888029aa",
          notes: trialNotes,
          typeUser: 2
        };
        break;
      default:
        throw new Error(`Sistema não suportado para teste: ${system_type}`);
    }

    console.log(`Criando teste ${system_type}...`);
    const createResponse = await fetch(createUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify(createBody)
    });

    const createData = await createResponse.json();
    console.log(`Resposta: status ${createResponse.status}`);

    if (createResponse.status !== 201 && createResponse.status !== 200) {
      throw new Error(`Erro ao criar teste: ${JSON.stringify(createData).substring(0, 300)}`);
    }

    return new Response(JSON.stringify({
      success: true,
      message: `Teste ${system_type.toUpperCase()} criado com sucesso!`,
      data: createData
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error creating trial:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
