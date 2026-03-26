import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Server-side prices
const PRICE_PER_TICKET_CENTS = 99;
const IPHONE_FRETE_CENTS = 1798;
const MAX_QUANTITY = 1000;

// Order bump prices (cents) – keyed by bump ID
const BUMP_PRICES: Record<string, number> = {
  'rasp10': 995,   // 10 raspadinhas R$ 9,95
  'rasp50': 2750,  // 50 raspadinhas R$ 27,50
  'rasp75': 2990,  // 75 raspadinhas R$ 29,90
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const DUTTYFY_URL = Deno.env.get('DUTTYFY_PIX_URL_ENCRYPTED');
    if (!DUTTYFY_URL) {
      throw new Error('DUTTYFY_PIX_URL_ENCRYPTED not configured');
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const body = await req.json();
    const { cpf, nome, telefone, quantidade, utm, tipo, bumps } = body;

    // Validate
    const document = (cpf || '').replace(/\D/g, '');
    const phone = (telefone || '').replace(/\D/g, '');

    if (!document || document.length !== 11) {
      return new Response(JSON.stringify({ success: false, error: 'CPF inválido' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (!phone || phone.length < 10 || phone.length > 11) {
      return new Response(JSON.stringify({ success: false, error: 'Telefone inválido' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    let amountCents: number;
    let itemTitle: string;
    let qty: number;

    if (tipo === 'iphone-frete' || tipo === 'smarttv-frete' || tipo === 'geladeira-frete') {
      // Fixed shipping price for prize redemption
      amountCents = IPHONE_FRETE_CENTS;
      const prizeNames: Record<string, string> = {
        'iphone-frete': 'Frete iPhone 17 Pro Max',
        'smarttv-frete': 'Frete Smart TV Samsung 50"',
        'geladeira-frete': 'Frete Geladeira Consul Frost Free',
      };
      itemTitle = prizeNames[tipo] || 'Frete Prêmio';
      qty = 1;
    } else if (tipo === 'taxa-premio') {
      // Fixed tax for prize regularization (R$ 27.40)
      amountCents = 2740;
      itemTitle = 'Regularização de Premiação';
      qty = 1;
    } else if (tipo === 'taxa-envio') {
      // Envio upsell (R$ 178.39)
      amountCents = 17839;
      itemTitle = 'Regularização de Premiação - Envio';
      qty = 1;
    } else {
      // Standard ticket purchase
      qty = parseInt(String(quantidade)) || 0;
      if (qty < 1 || qty > MAX_QUANTITY) {
        return new Response(JSON.stringify({ success: false, error: 'Quantidade inválida (1-1000)' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      amountCents = qty * PRICE_PER_TICKET_CENTS;

      // Add order bumps (server-validated prices)
      let bumpExtra = 0;
      if (Array.isArray(bumps)) {
        for (const bumpId of bumps) {
          const price = BUMP_PRICES[String(bumpId)];
          if (price) bumpExtra += price;
        }
      }
      amountCents += bumpExtra;

      itemTitle = bumpExtra > 0
        ? `${qty} Títulos Viva Sorte + Raspadinhas`
        : `${qty} Títulos Viva Sorte`;
    }

    const gatewayBody = {
      amount: amountCents,
      customer: {
        name: nome || 'Cliente',
        document: document,
        email: `${document}@vivasorte.com`,
        phone: phone,
      },
      item: {
        title: itemTitle,
        price: amountCents,
        quantity: 1,
      },
      paymentMethod: 'PIX',
      utm: utm || '',
    };

    console.log(`Creating PIX charge, qty: ${qty}, amount: ${amountCents} cents`);

    // Retry logic for 5xx
    let lastError: Error | null = null;
    const delays = [1000, 2000, 4000];

    for (let attempt = 0; attempt <= 2; attempt++) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 15000);

        const apiKey = Deno.env.get('DUTTYFY_API_KEY') || '';
        const response = await fetch(DUTTYFY_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey },
          body: JSON.stringify(gatewayBody),
          signal: controller.signal,
        });

        clearTimeout(timeout);

        if (response.status >= 400 && response.status < 500) {
          const errorText = await response.text();
          console.error(`Gateway 4xx error: ${response.status}`, errorText);
          return new Response(JSON.stringify({ success: false, error: `Erro no gateway: ${response.status}` }), {
            status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        if (response.status >= 500) {
          lastError = new Error(`Gateway 5xx: ${response.status}`);
          if (attempt < 2) {
            await new Promise(r => setTimeout(r, delays[attempt]));
            continue;
          }
          break;
        }

        const data = await response.json();
        console.log(`PIX charge created, transactionId: ${data.transactionId}`);

        // Persist transaction immediately
        const { error: dbError } = await supabase
          .from('pix_transactions')
          .insert({
            transaction_id: data.transactionId,
            status: 'PENDING',
            amount: amountCents,
            customer_name: nome || 'Cliente',
            customer_document: document,
            customer_email: `${document}@vivasorte.com`,
            customer_phone: phone,
            item_title: itemTitle,
            item_price: amountCents,
            item_quantity: qty,
            payment_method: 'PIX',
            utm: utm || '',
            pix_code: data.pixCode,
          });

        if (dbError) {
          console.error('DB insert error (non-blocking):', dbError.message);
        }

        return new Response(JSON.stringify({
          success: true,
          transaction_id: data.transactionId,
          codigo_pix: data.pixCode,
          qr_code: data.pixCode,
          status: data.status,
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

      } catch (e) {
        lastError = e;
        if (attempt < 2) {
          await new Promise(r => setTimeout(r, delays[attempt]));
          continue;
        }
      }
    }

    throw lastError || new Error('Failed after retries');

  } catch (error) {
    console.error('Error creating PIX:', error);
    return new Response(JSON.stringify({ success: false, error: 'Internal server error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
