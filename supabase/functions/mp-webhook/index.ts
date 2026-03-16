import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : 'Erro desconhecido';

// ==== HELPER FUNCS ====
  if (!expDate || expDate === 'N/A') return null;
  
  if (typeof expDate === 'string' && expDate.includes('-')) {
    const d = new Date(expDate);
    if (!isNaN(d.getTime())) return d.toISOString();
  }

  const numericDate = Number(expDate);
  if (!isNaN(numericDate) && numericDate > 0) {
    const ms = numericDate > 10000000000 ? numericDate : numericDate * 1000;
    const d = new Date(ms);
    if (!isNaN(d.getTime())) return d.toISOString();
  }

  return null;
}

// ==== WWPANEL RENEWAL ====
async function renewViaWWPanel(panel: any, username: string, durationDays: number, supabase: any, externalReference: string) {
  const apiBase = panel.url.replace(/\/+$/, '');
  const adminUser = panel.admin_user;
  const adminPassword = panel.admin_password;
  const months = Math.max(1, Math.round(durationDays / 30));

  console.log(`[WWPanel] Iniciando renovação para usuário ${username} em ${apiBase}`);

  const commonHeaders = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Accept': 'application/json, text/plain, */*',
    'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
    'Origin': apiBase,
    'Referer': `${apiBase}/`
  };

  // 1. Gerar token fixo via /auth/login
  console.log(`[WWPanel] Gerando token via POST /auth/login...`);
  const tokenResponse = await fetch(`${apiBase}/auth/login`, {
    method: 'POST',
    headers: { ...commonHeaders, 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: adminUser, password: adminPassword })
  });
  const tokenText = await tokenResponse.text();
  console.log(`[WWPanel] Token response status: ${tokenResponse.status}, body: ${tokenText.substring(0, 300)}`);

  let tokenData;
  try { tokenData = JSON.parse(tokenText); } catch (e) {
    throw new Error(`[WWPanel] Falha ao parsear resposta do token: ${tokenText.substring(0, 200)}`);
  }

  if (!tokenData.token) {
    throw new Error(`[WWPanel] Token não retornado: ${tokenText.substring(0, 200)}`);
  }

  const authToken = tokenData.token;
  const authHeaders = {
    ...commonHeaders,
    'Authorization': `Bearer ${authToken}`,
    'Content-Type': 'application/json'
  };

  // 2. Buscar o ID interno do usuário via API de listagem
  console.log(`[WWPanel] Buscando ID interno do usuário ${username}...`);
  let internalUserId: string | null = null;

  // Tentar buscar na lista de linhas com search
  const searchUrl = `${apiBase}/lines?search=${encodeURIComponent(username)}&limit=100`;
  console.log(`[WWPanel] GET ${searchUrl}`);
  const searchResponse = await fetch(searchUrl, { headers: authHeaders });
  const searchText = await searchResponse.text();
  console.log(`[WWPanel] Search response status: ${searchResponse.status}, body: ${searchText.substring(0, 500)}`);

  if (searchResponse.ok) {
    try {
      const searchData = JSON.parse(searchText);
      // Handle different response formats: { data: [...] }, { items: [...] }, or direct array
      const lines = searchData.data || searchData.items || searchData.rows || (Array.isArray(searchData) ? searchData : []);
      if (Array.isArray(lines)) {
        const found = lines.find((line: any) =>
          String(line.username) === String(username) ||
          String(line.token) === String(username) ||
          String(line.name) === String(username)
        );
        if (found) {
          internalUserId = String(found.id || found._id);
          console.log(`[WWPanel] Usuário encontrado! ID interno: ${internalUserId}`);
        }
      }
    } catch (e) {
      console.error(`[WWPanel] Erro ao parsear resultado da busca:`, e);
    }
  }

  if (!internalUserId) {
    throw new Error(`[WWPanel] Usuário ${username} não encontrado na API do painel. Verifique se o username está correto.`);
  }

  // 3. Estender usando o ID interno numérico
  const extendUrl = `${apiBase}/lines/extend/${internalUserId}`;
  console.log(`[WWPanel] Chamando PATCH ${extendUrl} com credits=${months}...`);

  const extendResponse = await fetch(extendUrl, {
    method: 'PATCH',
    headers: authHeaders,
    body: JSON.stringify({ credits: months })
  });
  const extendText = await extendResponse.text();
  console.log(`[WWPanel] Extend response status: ${extendResponse.status}, body: ${extendText.substring(0, 500)}`);

  if (!extendResponse.ok) {
    throw new Error(`[WWPanel] API extend falhou (status ${extendResponse.status}): ${extendText.substring(0, 300)}`);
  }

  let extendData;
  try { extendData = JSON.parse(extendText); } catch (e) {}

  const newExpDate = extendData?.exp_date || extendData?.expDate || 'N/A';

  // Atualizar o registro do pagamento
  await supabase
    .from('payments')
    .update({
      renewal_status: 'success',
      renewal_message: `[WWPanel] Usuário ${username} renovado por ${months} mês(es). Nova expiração: ${newExpDate}`,
    })
    .eq('id', externalReference);

  // Atualizar a data de expiração no cadastro do usuário
  const formattedExpDate = formatExpirationDate(newExpDate);
  if (formattedExpDate) {
    await supabase
      .from('iptv_users')
      .update({ expires_at: formattedExpDate })
      .eq('username', username);
  }

  console.log(`[WWPanel] Renovação concluída com sucesso para ${username}! Nova expiração: ${newExpDate}`);
}

// ==== XUI ONE RENEWAL ====
async function renewViaXuiOne(panel: any, username: string, durationDays: number, plan: any, supabase: any, externalReference: string) {
  const adminUser = panel.admin_user;
  const adminPassword = panel.admin_password;
  const apiBase = panel.url.replace(/\/+$/, '');
  const apiRoot = apiBase.replace(/\/(p2p|iptv|nexus|red-club)$/i, '');
  const systemMatch = apiBase.match(/\/(p2p|iptv|nexus|red-club)$/i);
  const primarySystem = systemMatch ? systemMatch[1].toLowerCase() : 'p2p';
  const allSystems = ['p2p', 'iptv', 'nexus', 'red-club'];
  const systemsToTry = [primarySystem, ...allSystems.filter(s => s !== primarySystem)];
  const months = durationDays / 30;

  console.log(`[XUI] Iniciando renovação para usuário ${username}. Sistema primário: ${primarySystem}`);

  // 1. Login via POST /auth/login
  const loginResponse = await fetch(`${apiRoot}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: adminUser, password: adminPassword })
  });
  const loginText = await loginResponse.text();
  console.log(`[XUI] Login response status: ${loginResponse.status}, body: ${loginText.substring(0, 300)}`);

  let loginData;
  try { loginData = JSON.parse(loginText); } catch (e) {
    throw new Error(`[XUI] Falha ao parsear resposta do login: ${loginText.substring(0, 200)}`);
  }

  if (!loginData.auth || !loginData.token) {
    throw new Error(`[XUI] Login falhou: ${loginText.substring(0, 200)}`);
  }

  const authToken = loginData.token;
  const authHeaders = {
    'Authorization': `Bearer ${authToken}`,
    'Content-Type': 'application/json'
  };

  // 2. Buscar usuário nos sistemas
  let internalUserId: string | null = null;
  let foundInSystem: string | null = null;
  let userDataFromApi: any = null;

  for (const systemPath of systemsToTry) {
    const listUrl = `${apiRoot}/${systemPath}/list?limit=100&page=1&orderBy=id&order=desc&search=${encodeURIComponent(username)}`;
    console.log(`[XUI] Buscando usuário ${username} no sistema ${systemPath}...`);
    try {
      const listResponse = await fetch(listUrl, { headers: authHeaders });
      const listText = await listResponse.text();
      console.log(`[XUI][${systemPath}] status: ${listResponse.status}, body: ${listText.substring(0, 300)}`);

      const listData = JSON.parse(listText);
      const users = listData.items || listData.data || listData.users || listData.rows || listData;
      if (Array.isArray(users)) {
        const found = users.find((u: any) =>
          String(u.username) === String(username) ||
          String(u.token) === String(username) ||
          String(u.notes)?.includes(String(username))
        );
        if (found) {
          internalUserId = String(found.id);
          foundInSystem = systemPath;
          userDataFromApi = found;
          console.log(`[XUI] Usuário encontrado no sistema ${systemPath}! ID interno: ${internalUserId}`);
          break;
        }
      }
    } catch (e) {
      console.error(`[XUI] Erro ao buscar no sistema ${systemPath}:`, e);
    }
  }

  if (!internalUserId || !foundInSystem) {
    throw new Error(`[XUI] Usuário ${username} não encontrado em nenhum sistema (tentados: ${systemsToTry.join(', ')})`);
  }

  // 3. PUT /extend/{userId}
  const extendQs = `token=${encodeURIComponent(authToken)}&password=${encodeURIComponent(adminPassword)}&username=${encodeURIComponent(adminUser)}`;
  const extendUrl = `${apiRoot}/${foundInSystem}/extend/${internalUserId}?${extendQs}`;
  console.log(`[XUI] Chamando PUT extend para usuário ID ${internalUserId} no sistema ${foundInSystem} com month=${months}...`);
  const extendResponse = await fetch(extendUrl, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ month: months })
  });
  const extendText = await extendResponse.text();
  console.log(`[XUI] Extend response status: ${extendResponse.status}, body: ${extendText.substring(0, 300)}`);

  let extendData;
  try { extendData = JSON.parse(extendText); } catch (e) {}

  if (extendData?.success === true) {
    const newExpDate = extendData.result?.endTime || 'N/A';

    await supabase
      .from('payments')
      .update({
        renewal_status: 'success',
        renewal_message: `[XUI] Usuário ${username} (ID: ${internalUserId}) renovado no sistema ${foundInSystem} por ${months} mês(es). Nova expiração: ${newExpDate}`,
      })
      .eq('id', externalReference);

    const formattedExpDate = formatExpirationDate(newExpDate);
    if (formattedExpDate) {
      await supabase
        .from('iptv_users')
        .update({ expires_at: formattedExpDate })
        .eq('username', username);
    }

    console.log(`[XUI] Renovação concluída com sucesso para ${username} no sistema ${foundInSystem}! Nova expiração: ${newExpDate}`);
  } else {
    // FALLBACK: If extend fails, it might be a Trial. Try to convert it via deep PUT update.
    console.log(`[XUI] Extend falhou. Tentando conversão completa de Teste para Oficial (Trial to Official)...`);
    
    // Injecting mandatory fields like WhatsApp if they are missing
    const convertBody = {
        ...userDataFromApi,
        isTrial: false, // Forces official mode
        whatsapp: userDataFromApi?.whatsapp || "+5511999999999", // Random fallback
        notes: "Ativado pelo Sistema Automático",
        month: months
    };

    const convertUrl = `${apiRoot}/${foundInSystem}/${internalUserId}?${extendQs}`;
    console.log(`[XUI] Chamando PUT ${convertUrl} com conversão...`);
    
    const convertResponse = await fetch(convertUrl, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(convertBody)
    });
    
    const convertText = await convertResponse.text();
    console.log(`[XUI] Convert response status: ${convertResponse.status}, body: ${convertText.substring(0, 300)}`);
    
    let convertData;
    try { convertData = JSON.parse(convertText); } catch (e) {}

    if (convertData?.success === true || convertResponse.ok) {
        let newExpDate = convertData?.result?.endTime || 'N/A';
        
        await supabase
          .from('payments')
          .update({
            renewal_status: 'success',
            renewal_message: `[XUI-Conv] Teste ${username} (ID: ${internalUserId}) convertido no sistema ${foundInSystem} por ${months} mês(es).`,
          })
          .eq('id', externalReference);

        const formattedExpDate = formatExpirationDate(newExpDate);
        if (formattedExpDate && newExpDate !== 'N/A') {
          await supabase
            .from('iptv_users')
            .update({ expires_at: formattedExpDate })
            .eq('username', username);
        }
        console.log(`[XUI] Conversão de Teste concluída com sucesso para ${username}!`);
    } else {
        throw new Error(`[XUI] Falha dupla (Extend e Convert) no sistema ${foundInSystem}: ${convertText.substring(0, 200)}`);
    }
  }
}

serve(async (req) => {
  try {
    const url = new URL(req.url);
    let id = url.searchParams.get("id") || url.searchParams.get("data.id");
    let type = url.searchParams.get("type");

    if (req.method === 'POST') {
      const bodyText = await req.text();
      let body;
      try {
        body = JSON.parse(bodyText);
        if (body.type) type = body.type;
        if (body.data?.id) id = body.data.id;
      } catch (e) {
        console.log("Could not parse body as JSON", bodyText);
      }
    }

    if (type !== "payment" || !id) {
      return new Response(JSON.stringify({ message: "Ignored" }), { status: 200 });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const mpAccessToken = Deno.env.get('MERCADOPAGO_ACCESS_TOKEN');
    if (!mpAccessToken) {
      throw new Error('MERCADOPAGO_ACCESS_TOKEN is not configured');
    }

    // Verificar status do pagamento no Mercado Pago
    const mpResponse = await fetch(`https://api.mercadopago.com/v1/payments/${id}`, {
      headers: {
        'Authorization': `Bearer ${mpAccessToken}`,
      },
    });

    const paymentInfo = await mpResponse.json();

    if (!mpResponse.ok) {
      throw new Error(`Error fetching payment from MP: ${JSON.stringify(paymentInfo)}`);
    }

    const externalReference = paymentInfo.external_reference; // payment record ID in our DB
    if (!externalReference) {
      console.log('No external_reference, ignoring');
      return new Response("OK", { status: 200 });
    }

    // Obter o registro do pagamento
    const { data: paymentRecord, error: paymentError } = await supabase
      .from('payments')
      .select('*, plans(*)')
      .eq('id', externalReference)
      .single();

    if (paymentError || !paymentRecord) {
      console.log('Payment record not found:', externalReference);
      return new Response("OK", { status: 200 }); // Retornar 200 para o MP parar de enviar o webhook
    }

    // Se já estiver processado (approved) ou renovação já iniciada, ignora
    if (paymentRecord.status === 'approved' || paymentRecord.renewal_status === 'success' || paymentRecord.renewal_status === 'processing') {
      console.log('Payment already processed or renewal in progress, skipping');
      return new Response("OK", { status: 200 });
    }

    // Marcar como "processing" ANTES de renovar para evitar duplicatas (race condition)
    if (paymentInfo.status === 'approved') {
      const { error: lockError } = await supabase
        .from('payments')
        .update({ renewal_status: 'processing' })
        .eq('id', externalReference)
        .neq('renewal_status', 'success')
        .neq('renewal_status', 'processing');
      
      if (lockError) {
        console.log('Could not lock payment, likely already being processed');
        return new Response("OK", { status: 200 });
      }
    }

    // Atualiza status do pagamento no nosso banco
    const paymentStatus = paymentInfo.status; // 'approved', 'pending', 'rejected', etc
    await supabase
      .from('payments')
      .update({
        status: paymentStatus,
        mp_payment_id: id.toString(),
        paid_at: paymentStatus === 'approved' ? new Date().toISOString() : null,
      })
      .eq('id', externalReference);

    if (paymentStatus === 'approved') {
      // ==== RENOVAÇÃO VIA API DO PAINEL ====
      try {
        const plan = paymentRecord.plans;
        const username = paymentRecord.iptv_username;
        const panelId = paymentRecord.panel_id;

        if (!panelId) throw new Error("Missing panel_id on payment record");

        const { data: panel, error: panelError } = await supabase
          .from('iptv_panels')
          .select('*')
          .eq('id', panelId)
          .single();

        if (panelError || !panel) throw new Error("Panel not found: " + panelId);

        const panelType = panel.panel_type || 'xui_one';
        const durationDays = plan?.duration_days || 30;

        if (panelType === 'wwpanel') {
          // ==== WWPANEL API ====
          await renewViaWWPanel(panel, username, durationDays, supabase, externalReference);
        } else {
          // ==== XUI ONE API (existing logic) ====
          await renewViaXuiOne(panel, username, durationDays, plan, supabase, externalReference);
        }

      } catch (renewError) {
        console.error('Erro ao renovar:', renewError);
        await supabase
          .from('payments')
          .update({
            renewal_status: 'failed',
            renewal_message: renewError.message,
          })
          .eq('id', externalReference);
      }
    }

    return new Response("OK", { status: 200 });

  } catch (error) {
    console.error('Webhook error:', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
});