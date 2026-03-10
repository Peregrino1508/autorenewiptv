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
    const { iptv_username, customer_email, customer_name, plan_id, panel_id, registered_user_payment } = await req.json();

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

    // Check if this is a registered user payment
    if (registered_user_payment) {
      // Look up the registered user
      const { data: registeredUser, error: userError } = await supabase
        .from('iptv_users')
        .select('*')
        .eq('username', iptv_username)
        .eq('is_active', true)
        .single();

      if (userError || !registeredUser) {
        throw new Error('Usuário não encontrado. Verifique o número do usuário cadastrado.');
      }

      // Use the amount_due from the registered user
      amount = Number(registeredUser.amount_due);
      if (!amount || amount <= 0) {
        throw new Error('Valor inválido para o usuário. Verifique o cadastro.');
      }
      paymentDescription = `Renovação IPTV - Usuário: ${iptv_username} - Valor: R$ ${amount.toFixed(2)}`;
      
      // Get the user's linked plan if available
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

      // If no plan linked, get first active plan as fallback
      if (!planData) {
        const { data: activePlan } = await supabase
          .from('plans')
          .select('*')
          .eq('is_active', true)
          .limit(1)
          .single();
        planData = activePlan;
      }

      // Get the first active panel for this user
      const { data: firstActivePanel, error: panelError2 } = await supabase
        .from('iptv_panels')
        .select('*')
        .eq('is_active', true)
        .limit(1)
        .single();
      
      if (panelError2) throw new Error('Nenhum painel ativo encontrado');
      panelData = firstActivePanel;
      
    } else {
      // Regular plan-based payment
      if (!plan_id) {
        throw new Error('Para pagamentos não cadastrados, é necessário selecionar um plano');
      }

      // Get plan data
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

      // Get panel data
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

    const mpAccessToken = Deno.env.get('MERCADOPAGO_ACCESS_TOKEN');
    if (!mpAccessToken) {
      throw new Error('MERCADOPAGO_ACCESS_TOKEN is not configured');
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
      })
      .select()
      .single();

    if (paymentError) throw paymentError;

    // Criar preferência no Mercado Pago
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
          success: `${req.headers.get('origin') || 'http://localhost:5173'}/checkout?checkout_status=success&user=${iptv_username}`,
          failure: `${req.headers.get('origin') || 'http://localhost:5173'}/checkout?checkout_status=failure&user=${iptv_username}`,
          pending: `${req.headers.get('origin') || 'http://localhost:5173'}/checkout?checkout_status=pending&user=${iptv_username}`,
        },
        auto_return: "approved",
        notification_url: "https://snoiymaflwumwlbschau.supabase.co/functions/v1/mp-webhook",
      }),
    });

    const preference = await response.json();

    if (!response.ok) {
      throw new Error(`Mercado Pago error: ${JSON.stringify(preference)}`);
    }

    // Atualizar registro com o mp_preference_id
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
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});