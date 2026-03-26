import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Allowed status values — reject anything not in this list
const ALLOWED_STATUSES = ['PENDING', 'COMPLETED', 'EXPIRED', 'FAILED', 'CANCELLED'];

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    // Verify webhook authorization token
    const webhookSecret = Deno.env.get('DUTTYFY_WEBHOOK_SECRET');
    if (!webhookSecret) {
      console.error('DUTTYFY_WEBHOOK_SECRET not configured — rejecting request');
      return new Response('Service Unavailable', { status: 503 });
    }
    const authHeader = req.headers.get('authorization') || req.headers.get('x-webhook-secret') || '';
    const token = authHeader.replace(/^Bearer\s+/i, '');
    if (token !== webhookSecret) {
      console.error('Webhook auth failed — invalid token');
      return new Response('Forbidden', { status: 403 });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const payload = await req.json();
    
    const transactionId = payload.transactionId || payload._id?.$oid;
    const status = payload.status;

    if (!transactionId || !status) {
      console.error('Webhook missing transactionId or status');
      return new Response('OK', { status: 200 });
    }

    // Whitelist status values
    if (!ALLOWED_STATUSES.includes(status)) {
      console.error(`Webhook rejected — invalid status: ${status}`);
      return new Response('Bad Request', { status: 400 });
    }

    console.log(`Webhook received: ${transactionId} → ${status}`);

    if (status === 'PENDING') {
      const { error } = await supabase
        .from('pix_transactions')
        .upsert({
          transaction_id: transactionId,
          status: 'PENDING',
          amount: payload.amount,
          customer_name: payload.customer?.name,
          customer_document: payload.customer?.document,
          customer_email: payload.customer?.email,
          customer_phone: payload.customer?.phone,
          item_title: payload.items?.title,
          item_price: payload.items?.price,
          item_quantity: payload.items?.quantity || 1,
          payment_method: payload.paymentMethod || 'PIX',
          utm: payload.utm,
          webhook_received_at: new Date().toISOString(),
        }, { onConflict: 'transaction_id' });

      if (error) {
        console.error('DB error on PENDING upsert:', error.message);
      }

    } else if (status === 'COMPLETED') {
      const { data: existing } = await supabase
        .from('pix_transactions')
        .select('status')
        .eq('transaction_id', transactionId)
        .single();

      if (existing?.status === 'COMPLETED') {
        console.log(`Transaction ${transactionId} already COMPLETED, skipping`);
        return new Response('OK', { status: 200 });
      }

      const { error } = await supabase
        .from('pix_transactions')
        .update({
          status: 'COMPLETED',
          completed_at: new Date().toISOString(),
          webhook_received_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('transaction_id', transactionId);

      if (error) {
        console.error('DB error on COMPLETED update:', error.message);
      } else {
        console.log(`Transaction ${transactionId} marked COMPLETED`);
      }

    } else {
      // Other statuses (EXPIRED, FAILED, etc.)
      const { error } = await supabase
        .from('pix_transactions')
        .update({
          status: status,
          updated_at: new Date().toISOString(),
          webhook_received_at: new Date().toISOString(),
        })
        .eq('transaction_id', transactionId);

      if (error) {
        console.error(`DB error on ${status} update:`, error.message);
      }
    }

    return new Response('OK', { status: 200 });

  } catch (error) {
    console.error('Webhook error:', error.message);
    return new Response('OK', { status: 200 });
  }
});
