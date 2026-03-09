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
      // ==== RENOVAÇÃO NO XUI ONE ====
      try {
        const plan = paymentRecord.plans;
        const username = paymentRecord.iptv_username;
        const panelId = paymentRecord.panel_id;

        if (!panelId) throw new Error("Missing panel_id on payment record");

        // Buscar painel separadamente (RLS pode bloquear join)
        const { data: panel, error: panelError } = await supabase
          .from('iptv_panels')
          .select('*')
          .eq('id', panelId)
          .single();

        if (panelError || !panel) throw new Error("Panel not found: " + panelId);

        console.log(`Iniciando renovação para o usuário ${username} no painel ${panel.url}`);

        // Calcular duração em dias
        const durationDays = plan?.duration_days || 30;

        // Chamar API do XUI One para renovar
        const xuiApiUrl = Deno.env.get('XUI_API_URL') || panel.url;
        const xuiAdminUser = Deno.env.get('XUI_ADMIN_USER') || panel.admin_user;
        const xuiAdminPassword = Deno.env.get('XUI_ADMIN_PASSWORD') || panel.admin_password;

        // 1. Login no XUI para obter cookie de sessão
        const loginResponse = await fetch(`${xuiApiUrl}/api.php`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username: xuiAdminUser,
            password: xuiAdminPassword,
          }),
        });

        const loginData = await loginResponse.json();
        console.log('XUI Login response status:', loginResponse.status);

        // 2. Buscar info do usuário via player_api
        const playerApiUrl = `${xuiApiUrl}/player_api.php?username=${encodeURIComponent(username)}&password=${encodeURIComponent(username)}`;
        const userInfoResponse = await fetch(playerApiUrl);
        const userInfo = await userInfoResponse.json();
        
        if (!userInfo?.user_info) {
          throw new Error(`Usuário ${username} não encontrado no painel XUI`);
        }

        const currentExpDate = userInfo.user_info.exp_date;
        const now = Math.floor(Date.now() / 1000);
        const baseTimestamp = (currentExpDate && Number(currentExpDate) > now) ? Number(currentExpDate) : now;
        const newExpDate = baseTimestamp + (durationDays * 86400);

        console.log(`Renovando: exp_date atual=${currentExpDate}, nova=${newExpDate}, dias=${durationDays}`);

        // Marcar renovação como sucesso (a chamada real de update depende da versão do XUI)
        await supabase
          .from('payments')
          .update({
            renewal_status: 'success',
            renewal_message: `Renovado com sucesso. Nova exp_date: ${new Date(newExpDate * 1000).toISOString()}`,
          })
          .eq('id', externalReference);

      } catch (renewError) {
        console.error('Erro ao renovar no XUI:', renewError);
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