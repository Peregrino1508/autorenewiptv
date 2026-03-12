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