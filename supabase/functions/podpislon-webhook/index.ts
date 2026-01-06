import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PodpislonWebhookPayload {
  document_id?: string;
  id?: string;
  status: string; // sent, viewed, signed, cancelled
  signed_at?: string;
  viewed_at?: string;
  signed_pdf_url?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const payload = await req.json() as PodpislonWebhookPayload;
    const documentId = payload.document_id || payload.id;
    
    console.log('Received webhook from Podpislon:', payload);

    if (!documentId) {
      console.error('No document_id in webhook payload');
      return new Response(
        JSON.stringify({ error: 'Missing document_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Находим договор по document_id
    const { data: contract, error: findError } = await supabase
      .from('contracts')
      .select('*')
      .eq('podpislon_document_id', documentId)
      .single();

    if (findError || !contract) {
      console.error('Contract not found for document_id:', documentId, findError);
      return new Response(
        JSON.stringify({ error: 'Contract not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Обновляем статус договора
    const updateData: Record<string, any> = {
      status: payload.status,
      updated_at: new Date().toISOString(),
    };

    if (payload.status === 'viewed' && payload.viewed_at) {
      updateData.viewed_at = payload.viewed_at;
    }

    if (payload.status === 'signed') {
      updateData.signed_at = payload.signed_at || new Date().toISOString();
      if (payload.signed_pdf_url) {
        updateData.signed_pdf_url = payload.signed_pdf_url;
      }
    }

    const { error: updateError } = await supabase
      .from('contracts')
      .update(updateData)
      .eq('id', contract.id);

    if (updateError) {
      console.error('Error updating contract:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to update contract' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Contract ${contract.id} updated to status: ${payload.status}`);

    // Логируем в audit_log
    await supabase
      .from('audit_log')
      .insert({
        user_id: contract.user_id,
        action: 'CONTRACT_STATUS_UPDATE',
        table_name: 'contracts',
        record_id: contract.id,
      });

    return new Response(
      JSON.stringify({ success: true, message: 'Webhook processed' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in podpislon-webhook:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
