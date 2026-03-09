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

    // Se já estiver processado (approved), ignora
    if (paymentRecord.status === 'approved') {
      console.log('Payment already approved');
      return new Response("OK", { status: 200 });
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

        console.log(`Iniciando renovação para usuário ${username} via API ${apiBase}`);

        // 1. Autenticar via POST /login
        const loginUrl = `${apiBase}/login`;
        console.log(`Chamando login: ${loginUrl}`);
        const loginResponse = await fetch(loginUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: adminUser, password: adminPassword })
        });
        const loginText = await loginResponse.text();
        console.log(`Login response status: ${loginResponse.status}, body: ${loginText.substring(0, 300)}`);
        
        let token = '';
        try {
          const loginData = JSON.parse(loginText);
          token = loginData.token || loginData.access_token || loginData.data?.token || '';
        } catch (e) {
          console.error('Erro ao parsear login response:', e);
        }

        // Se login não funcionou, tentar GET /info com headers
        if (!token) {
          console.log('Tentando autenticação alternativa via /info com headers...');
          const infoResponse = await fetch(`${apiBase}/info`, {
            headers: {
              'Authorization': `Basic ${btoa(`${adminUser}:${adminPassword}`)}`,
              'x-api-key': adminPassword,
              'Content-Type': 'application/json'
            }
          });
          const infoText = await infoResponse.text();
          console.log(`Info response status: ${infoResponse.status}, body: ${infoText.substring(0, 300)}`);
          
          try {
            const infoData = JSON.parse(infoText);
            token = infoData.token || infoData.access_token || infoData.data?.token || '';
          } catch (e) {
            console.error('Erro ao parsear info response:', e);
          }
        }

        if (!token) {
          throw new Error(`Falha na autenticação com o painel. Verifique usuário e senha admin.`);
        }
        console.log(`Token obtido: ${token.substring(0, 8)}...`);

        // Headers de autenticação para todas as chamadas
        const authHeaders = {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        };

        // 2. Buscar usuário na lista para encontrar o ID interno
        const listUrl = `${apiBase}/list?limit=100&page=1&orderBy=id&order=desc&search=${encodeURIComponent(username)}`;
        console.log(`Buscando usuário ${username} na lista...`);
        const listResponse = await fetch(listUrl, { headers: authHeaders });
        const listText = await listResponse.text();
        console.log(`List response status: ${listResponse.status}, body: ${listText.substring(0, 500)}`);

        let internalUserId: string | null = null;
        try {
          const listData = JSON.parse(listText);
          // Procurar o usuário pelo username/token na lista
          const users = listData.data || listData.users || listData.rows || listData;
          if (Array.isArray(users)) {
            const found = users.find((u: any) => 
              String(u.username) === String(username) || 
              String(u.token) === String(username) ||
              String(u.notes)?.includes(String(username))
            );
            if (found) {
              internalUserId = String(found.id);
              console.log(`Usuário encontrado! ID interno: ${internalUserId}`);
            }
          }
        } catch (e) {
          console.error('Erro ao parsear list response:', e);
        }

        if (!internalUserId) {
          throw new Error(`Usuário ${username} não encontrado na lista do painel. Resposta: ${listText.substring(0, 200)}`);
        }

        // 3. Chamar PUT /extend/{userId} para renovar
        const extendUrl = `${apiBase}/extend/${internalUserId}`;
        console.log(`Chamando PUT extend para usuário ID ${internalUserId}...`);
        const extendResponse = await fetch(extendUrl, { method: 'PUT', headers: authHeaders });
        const extendText = await extendResponse.text();
        console.log(`Extend response status: ${extendResponse.status}, body: ${extendText.substring(0, 300)}`);

        if (extendResponse.status === 200) {
          await supabase
            .from('payments')
            .update({
              renewal_status: 'success',
              renewal_message: `Usuário ${username} (ID: ${internalUserId}) renovado com sucesso via API do painel.`,
            })
            .eq('id', externalReference);
          console.log(`Renovação concluída com sucesso para ${username}!`);
        } else {
          throw new Error(`API extend retornou status ${extendResponse.status}: ${extendText.substring(0, 200)}`);
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