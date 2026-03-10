import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

        const adminUser = panel.admin_user;
        const adminPassword = panel.admin_password;
        const apiBase = panel.url.replace(/\/+$/, '');
        // Remove the system path to get the root API URL
        const apiRoot = apiBase.replace(/\/(p2p|iptv|nexus|red-club)$/i, '');
        // Get the primary system path from the panel URL
        const systemMatch = apiBase.match(/\/(p2p|iptv|nexus|red-club)$/i);
        const primarySystem = systemMatch ? systemMatch[1].toLowerCase() : 'p2p';
        // All systems to try (primary first, then the others)
        const allSystems = ['p2p', 'iptv', 'nexus', 'red-club'];
        const systemsToTry = [primarySystem, ...allSystems.filter(s => s !== primarySystem)];

        console.log(`Iniciando renovação para usuário ${username}. Sistema primário: ${primarySystem}`);

        // 1. Login via POST /auth/login para obter token
        console.log(`Autenticando via POST /auth/login...`);
        const loginResponse = await fetch(`${apiRoot}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: adminUser, password: adminPassword })
        });
        const loginText = await loginResponse.text();
        console.log(`Login response status: ${loginResponse.status}, body: ${loginText.substring(0, 300)}`);

        let loginData;
        try { loginData = JSON.parse(loginText); } catch (e) {
          throw new Error(`Falha ao parsear resposta do login: ${loginText.substring(0, 200)}`);
        }

        if (!loginData.auth || !loginData.token) {
          throw new Error(`Login falhou: ${loginText.substring(0, 200)}`);
        }

        const authToken = loginData.token;
        console.log(`Token obtido: ${authToken.substring(0, 8)}...`);

        const authHeaders = {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        };

        // 2. Buscar usuário nos sistemas (primário primeiro, depois os demais)
        let internalUserId: string | null = null;
        let foundInSystem: string | null = null;

        for (const systemPath of systemsToTry) {
          const listUrl = `${apiRoot}/${systemPath}/list?limit=100&page=1&orderBy=id&order=desc&search=${encodeURIComponent(username)}`;
          console.log(`Buscando usuário ${username} no sistema ${systemPath}...`);
          try {
            const listResponse = await fetch(listUrl, { headers: authHeaders });
            const listText = await listResponse.text();
            console.log(`[${systemPath}] status: ${listResponse.status}, body: ${listText.substring(0, 300)}`);

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
                console.log(`Usuário encontrado no sistema ${systemPath}! ID interno: ${internalUserId}`);
                break;
              }
            }
          } catch (e) {
            console.error(`Erro ao buscar no sistema ${systemPath}:`, e);
          }
        }

        if (!internalUserId || !foundInSystem) {
          throw new Error(`Usuário ${username} não encontrado em nenhum sistema (tentados: ${systemsToTry.join(', ')})`);
        }

        // 3. Chamar PUT /extend/{userId} no sistema onde o usuário foi encontrado
        const durationDays = plan?.duration_days || 30;
        const months = durationDays / 30;
        const extendQs = `token=${encodeURIComponent(authToken)}&password=${encodeURIComponent(adminPassword)}&username=${encodeURIComponent(adminUser)}`;
        const extendUrl = `${apiRoot}/${foundInSystem}/extend/${internalUserId}?${extendQs}`;
        console.log(`Chamando PUT extend para usuário ID ${internalUserId} no sistema ${foundInSystem} com month=${months}...`);
        const extendResponse = await fetch(extendUrl, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ month: months })
        });
        const extendText = await extendResponse.text();
        console.log(`Extend response status: ${extendResponse.status}, body: ${extendText.substring(0, 300)}`);

        let extendData;
        try { extendData = JSON.parse(extendText); } catch (e) {}

        if (extendData?.success === true) {
          const newExpDate = extendData.result?.endTime || 'N/A';
          
          // Atualizar o registro do pagamento
          await supabase
            .from('payments')
            .update({
              renewal_status: 'success',
              renewal_message: `Usuário ${username} (ID: ${internalUserId}) renovado no sistema ${foundInSystem} por ${months} mês(es). Nova expiração: ${newExpDate}`,
            })
            .eq('id', externalReference);

          // Atualizar a data de expiração no cadastro do usuário
          if (newExpDate !== 'N/A') {
            await supabase
              .from('iptv_users')
              .update({ expires_at: newExpDate })
              .eq('username', username);
          }
          
          console.log(`Renovação concluída com sucesso para ${username} no sistema ${foundInSystem}! Nova expiração: ${newExpDate}`);
        } else {
          throw new Error(`API extend falhou no sistema ${foundInSystem}: ${extendText.substring(0, 200)}`);
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