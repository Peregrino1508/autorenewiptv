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
    const { iptv_username, customer_email, customer_name, plan_id, panel_id } = await req.json();

    if (!iptv_username || !plan_id) {
      throw new Error('Missing required fields');
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Obter dados do plano
    const { data: plan, error: planError } = await supabase
      .from('plans')
      .select('*')
      .eq('id', plan_id)
      .single();

    if (planError || !plan) {
      throw new Error('Plan not found');
    }

    // Obter dados do painel, ou o primeiro painel ativo se panel_id não for fornecido
    let panelData = null;
    if (panel_id) {
      const { data, error } = await supabase.from('iptv_panels').select('*').eq('id', panel_id).single();
      if (error) throw new Error('Panel not found');
      panelData = data;
    } else {
      const { data, error } = await supabase.from('iptv_panels').select('*').eq('is_active', true).limit(1).single();
      if (error) throw new Error('No active panel found');
      panelData = data;
    }

    const mpAccessToken = Deno.env.get('MERCADOPAGO_ACCESS_TOKEN');
    if (!mpAccessToken) {
      throw new Error('MERCADOPAGO_ACCESS_TOKEN is not configured');
    }

    // Criar pagamento pendente no banco
    const { data: paymentRecord, error: paymentError } = await supabase
      .from('payments')
      .insert({
        iptv_username,
        customer_email,
        customer_name,
        plan_id,
        panel_id: panelData.id,
        amount: plan.price,
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
            id: plan.id,
            title: `Renovação IPTV - ${plan.name} - Usuário: ${iptv_username}`,
            quantity: 1,
            unit_price: Number(plan.price),
            currency_id: 'BRL',
          }
        ],
        payer: {
          email: customer_email || 'cliente@email.com',
          name: customer_name || 'Cliente IPTV',
        },
        external_reference: paymentRecord.id,
        back_urls: {
          success: `${req.headers.get('origin') || 'http://localhost:5173'}/checkout?status=success`,
          failure: `${req.headers.get('origin') || 'http://localhost:5173'}/checkout?status=failure`,
          pending: `${req.headers.get('origin') || 'http://localhost:5173'}/checkout?status=pending`,
        },
        auto_return: "approved",
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