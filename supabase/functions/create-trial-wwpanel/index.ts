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

    const startTime = Date.now();
    const log = (msg: string) => console.log(`[WWPanel Trial][${Date.now() - startTime}ms] ${msg}`);

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

    // Headers common to all requests to bypass simple bot detection
    const commonHeaders = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      'Accept': 'application/json, text/plain, */*',
      'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
      'Origin': apiBase,
      'Referer': `${apiBase}/`
    };

    // 1. Auth via static-token
    log(`Autenticando em ${apiBase}...`);
    const tokenResponse = await fetch(`${apiBase}/auth/static-token`, {
      method: 'POST',
      headers: { ...commonHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: adminUser, password: adminPassword })
    });

    const tokenText = await tokenResponse.text();
    const isJsonToken = tokenResponse.headers.get('content-type')?.includes('application/json');

    if (!tokenResponse.ok) {
      if (tokenText.includes('<!DOCTYPE html>')) {
        throw new Error('O servidor do painel bloqueou a conexão (Cloudflare/Firewall). Tente novamente em instantes.');
      }
      throw new Error(`Erro na autenticação (${tokenResponse.status}): ${tokenText.substring(0, 100)}`);
    }

    let tokenData;
    try { 
      tokenData = isJsonToken ? JSON.parse(tokenText) : { token: tokenText.trim() }; 
    } catch (e) {
      throw new Error(`Falha ao processar token: ${tokenText.substring(0, 100)}`);
    }

    const authToken = tokenData.token;
    if (!authToken) throw new Error('Token não retornado pelo painel');

    const authHeaders = {
      ...commonHeaders,
      'Authorization': `Bearer ${authToken}`,
      'Content-Type': 'application/json'
    };

    // 2. Create trial line via POST /lines/test
    const trialNotes = notes || '';
    const createUrl = `${apiBase}/lines/test`;
    
    // Build payload - always send all fields populated (API requires it)
    const testTypeNorm = (test_type || 'wplay').toLowerCase();
    
    const createBody = {
      notes: trialNotes,
      package_p2p: "64399dca5ea59e8a1de2b083",
      package_iptv: "30",
      krator_package: "1",
      testDuration: 4
    };
    
    log(`Criando teste ${testTypeNorm.toUpperCase()}...`);

    const createResponse = await fetch(createUrl, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify(createBody)
    });

    const createText = await createResponse.text();
    const isJsonCreate = createResponse.headers.get('content-type')?.includes('application/json');

    if (!createResponse.ok) {
      if (createText.includes('<!DOCTYPE html>')) {
        throw new Error('Bloqueio de firewall ao criar teste. O painel pode estar sobrecarregado.');
      }
      throw new Error(`Erro ao criar teste (${createResponse.status}): ${createText.substring(0, 100)}`);
    }

    let createData;
    try { 
      createData = isJsonCreate ? JSON.parse(createText) : { success: true, data: createText }; 
    } catch (e) {
      createData = { success: true, message: createText };
    }

    log(`Teste criado com sucesso.`);

    return new Response(JSON.stringify({
      success: true,
      message: 'Teste WWPanel criado com sucesso!',
      data: createData
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
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
