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
    const { iptv_username, customer_email, customer_name, plan_id, panel_id, registered_user_payment, origin_url } = await req.json();

    if (!iptv_username) {
      throw new Error('Campo iptv_username é obrigatório');
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    let planData = null;
    let panelData = null;
    let amount = 0;
    let paymentDescription = '';
    let adminId: string | null = null;

    // Check if this is a registered user payment
    if (registered_user_payment) {
      const { data: registeredUser, error: userError } = await supabase
        .from('iptv_users')
        .select('*')
        .eq('username', iptv_username)
        .eq('is_active', true)
        .single();

      if (userError || !registeredUser) {
        throw new Error('Usuário não encontrado. Verifique o número do usuário cadastrado.');
      }

      // Track the admin who created this user
      adminId = registeredUser.created_by || null;

      amount = Number(registeredUser.amount_due);
      if (!amount || amount <= 0) {
        throw new Error('Valor inválido para o usuário. Verifique o cadastro.');
      }
      paymentDescription = `Renovação IPTV - Usuário: ${iptv_username} - Valor: R$ ${amount.toFixed(2)}`;
      
      if (registeredUser.plan_id) {
        const { data: userPlan, error: planError } = await supabase
          .from('plans')
          .select('*')
          .eq('id', registeredUser.plan_id)
          .single();
        
        if (!planError && userPlan) {
          planData = userPlan;
          paymentDescription = `Renovação IPTV - ${userPlan.name} (${userPlan.duration_days} dias) - Usuário: ${iptv_username}`;
        }
      }

      if (!planData) {
        const { data: activePlan } = await supabase
          .from('plans')
          .select('*')
          .eq('is_active', true)
          .limit(1)
          .single();
        planData = activePlan;
      }

      let resolvedPanelId = registeredUser.panel_id;
      if (!resolvedPanelId && planData?.panel_id) {
        resolvedPanelId = planData.panel_id;
      }

      if (resolvedPanelId) {
        const { data: panel, error: panelErr } = await supabase
          .from('iptv_panels')
          .select('*')
          .eq('id', resolvedPanelId)
          .single();
        if (panelErr || !panel) throw new Error('Painel vinculado ao usuário não encontrado');
        panelData = panel;
      } else {
        const { data: fallbackPanel, error: panelErr2 } = await supabase
          .from('iptv_panels')
          .select('*')
          .eq('is_active', true)
          .limit(1)
          .single();
        if (panelErr2) throw new Error('Nenhum painel ativo encontrado');
        panelData = fallbackPanel;
      }
      
    } else {
      if (!plan_id) {
        throw new Error('Para pagamentos não cadastrados, é necessário selecionar um plano');
      }

      const { data: plan, error: planError } = await supabase
        .from('plans')
        .select('*')
        .eq('id', plan_id)
        .single();

      if (planError || !plan) {
        throw new Error('Plano não encontrado');
      }
      
      planData = plan;
      amount = Number(plan.price);
      paymentDescription = `Renovação IPTV - ${plan.name} - Usuário: ${iptv_username}`;

      if (panel_id) {
        const { data, error } = await supabase.from('iptv_panels').select('*').eq('id', panel_id).single();
        if (error) throw new Error('Painel não encontrado');
        panelData = data;
      } else {
        const { data, error } = await supabase.from('iptv_panels').select('*').eq('is_active', true).limit(1).single();
        if (error) throw new Error('Nenhum painel ativo encontrado');
        panelData = data;
      }
    }

    // Resolve MP Access Token: per-admin first, then global fallback
    let mpAccessToken: string | null = null;

    if (adminId) {
      const { data: adminCreds } = await supabase
        .from('admin_mp_credentials')
        .select('mp_access_token')
        .eq('user_id', adminId)
        .eq('is_active', true)
        .maybeSingle();
      
      if (adminCreds?.mp_access_token) {
        mpAccessToken = adminCreds.mp_access_token;
        console.log(`[create-payment] Using per-admin MP token for admin ${adminId}`);
      }
    }

    if (!mpAccessToken) {
      mpAccessToken = Deno.env.get('MERCADOPAGO_ACCESS_TOKEN') || null;
      console.log('[create-payment] Using global MERCADOPAGO_ACCESS_TOKEN fallback');
    }

    if (!mpAccessToken) {
      throw new Error('Nenhum Access Token do Mercado Pago configurado. Configure nas credenciais do admin ou como Secret do Supabase.');
    }

    // Create pending payment in database
    const { data: paymentRecord, error: paymentError } = await supabase
      .from('payments')
      .insert({
        iptv_username,
        customer_email,
        customer_name,
        plan_id: planData?.id || null,
        panel_id: panelData.id,
        amount: amount,
        status: 'pending',
        admin_id: adminId,
      })
      .select()
      .single();

    if (paymentError) throw paymentError;

    const response = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${mpAccessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        items: [
          {
            id: planData?.id || `user_${iptv_username}`,
            title: paymentDescription,
            quantity: 1,
            unit_price: amount,
            currency_id: 'BRL',
          }
        ],
        payer: {
          email: customer_email || 'cliente@email.com',
          name: customer_name || 'Cliente IPTV',
        },
        external_reference: paymentRecord.id,
        back_urls: {
          success: `${origin_url || req.headers.get('origin') || 'https://autorenewiptv.lovable.app'}/checkout?checkout_status=success&user=${iptv_username}`,
          failure: `${origin_url || req.headers.get('origin') || 'https://autorenewiptv.lovable.app'}/checkout?checkout_status=failure&user=${iptv_username}`,
          pending: `${origin_url || req.headers.get('origin') || 'https://autorenewiptv.lovable.app'}/checkout?checkout_status=pending&user=${iptv_username}`,
        },
        auto_return: "approved",
        notification_url: "https://snoiymaflwumwlbschau.supabase.co/functions/v1/mp-webhook",
      }),
    });

    const preference = await response.json();

    if (!response.ok) {
      throw new Error(`Mercado Pago error: ${JSON.stringify(preference)}`);
    }

    await supabase
      .from('payments')
      .update({ mp_preference_id: preference.id })
      .eq('id', paymentRecord.id);

    return new Response(
      JSON.stringify({ 
        preferenceId: preference.id,
        initPoint: preference.init_point,
        paymentId: paymentRecord.id
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error creating payment:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido ao criar pagamento';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
