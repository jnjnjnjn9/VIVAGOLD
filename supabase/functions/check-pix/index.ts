import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
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
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const body = await req.json();
    const { transaction_id } = body;

    if (!transaction_id) {
      return new Response(JSON.stringify({ success: false, error: 'transaction_id obrigatório' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Check DB first (webhook is source of truth)
    const { data: dbRecord } = await supabase
      .from('pix_transactions')
      .select('status, completed_at')
      .eq('transaction_id', transaction_id)
      .single();

    if (dbRecord) {
      let mappedStatus = 'pending';
      if (dbRecord.status === 'COMPLETED') mappedStatus = 'paid';
      else if (dbRecord.status === 'EXPIRED') mappedStatus = 'expired';
      else if (dbRecord.status === 'FAILED') mappedStatus = 'failed';

      // If DB already has definitive status, return it without polling
      if (mappedStatus !== 'pending') {
        return new Response(JSON.stringify({
          success: true,
          status: mappedStatus,
          allowpay_status: dbRecord.status,
          paidAt: dbRecord.completed_at || null,
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }

    // Fallback: poll Duttyfy API
    const DUTTYFY_URL = Deno.env.get('DUTTYFY_PIX_URL_ENCRYPTED');
    if (!DUTTYFY_URL) {
      throw new Error('DUTTYFY_PIX_URL_ENCRYPTED not configured');
    }

    const url = `${DUTTYFY_URL}?transactionId=${encodeURIComponent(transaction_id)}`;

    let data;
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);
      const apiKey = Deno.env.get('DUTTYFY_API_KEY') || '';
      const response = await fetch(url, { method: 'GET', headers: { 'x-api-key': apiKey }, signal: controller.signal });
      clearTimeout(timeout);
      data = await response.json();
      console.log(`Status check for ${transaction_id}: ${data.status}`);
    } catch (networkError) {
      // Network error (connection reset, timeout, etc.) — return pending so polling retries
      console.warn(`Network error polling ${transaction_id}: ${networkError.message}`);
      return new Response(JSON.stringify({
        success: true,
        status: 'pending',
        allowpay_status: 'PENDING',
        paidAt: null,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // If API says COMPLETED, update DB
    if (data.status === 'COMPLETED' && dbRecord?.status !== 'COMPLETED') {
      await supabase
        .from('pix_transactions')
        .update({
          status: 'COMPLETED',
          completed_at: data.paidAt || new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('transaction_id', transaction_id);
    }

    let mappedStatus = 'pending';
    if (data.status === 'COMPLETED') mappedStatus = 'paid';
    else if (data.status === 'EXPIRED') mappedStatus = 'expired';
    else if (data.status === 'FAILED') mappedStatus = 'failed';

    return new Response(JSON.stringify({
      success: true,
      status: mappedStatus,
      allowpay_status: data.status,
      paidAt: data.paidAt || null,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error checking PIX status:', error);
    return new Response(JSON.stringify({ success: false, error: 'Internal server error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
