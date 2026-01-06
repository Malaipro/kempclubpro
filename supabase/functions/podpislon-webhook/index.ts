import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Podpislon отправляет webhooks в формате application/x-www-form-urlencoded
// События: DOCUMENT_OPENED (просмотрен), DOCUMENT_SIGNED (подписан)
// Поля: EVENT, FILE_ID, COMPANY_ID, SIGNATURE, CONTACT (только для OPENED)

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Получаем данные в зависимости от Content-Type
    const contentType = req.headers.get('content-type') || '';
    let eventType: string | null = null;
    let fileId: string | null = null;
    let companyId: string | null = null;
    let signature: string | null = null;
    let contact: string | null = null;

    if (contentType.includes('application/x-www-form-urlencoded')) {
      // Podpislon отправляет в формате form-urlencoded
      const formData = await req.text();
      const params = new URLSearchParams(formData);
      
      eventType = params.get('EVENT');
      fileId = params.get('FILE_ID');
      companyId = params.get('COMPANY_ID');
      signature = params.get('SIGNATURE');
      contact = params.get('CONTACT');
      
      console.log('Received form-urlencoded webhook:', {
        EVENT: eventType,
        FILE_ID: fileId,
        COMPANY_ID: companyId,
        SIGNATURE: signature ? '[HIDDEN]' : null,
        CONTACT: contact,
      });
    } else if (contentType.includes('application/json')) {
      // Fallback для JSON формата
      const payload = await req.json();
      console.log('Received JSON webhook:', payload);
      
      eventType = payload.EVENT || payload.event;
      fileId = payload.FILE_ID || payload.file_id || payload.id || payload.document_id;
      companyId = payload.COMPANY_ID || payload.company_id;
      signature = payload.SIGNATURE || payload.signature;
      contact = payload.CONTACT || payload.contact;
    } else {
      // Попробуем как text
      const text = await req.text();
      console.log('Received raw webhook:', text);
      
      // Попробуем распарсить как URL params
      try {
        const params = new URLSearchParams(text);
        eventType = params.get('EVENT');
        fileId = params.get('FILE_ID');
        companyId = params.get('COMPANY_ID');
        signature = params.get('SIGNATURE');
        contact = params.get('CONTACT');
      } catch {
        console.error('Failed to parse webhook data');
      }
    }

    console.log('Parsed webhook data:', { eventType, fileId, companyId });

    if (!fileId) {
      console.error('No FILE_ID in webhook payload');
      return new Response(
        JSON.stringify({ error: 'Missing FILE_ID' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Находим договор по document_id
    const { data: contract, error: findError } = await supabase
      .from('contracts')
      .select('*')
      .eq('podpislon_document_id', String(fileId))
      .single();

    if (findError || !contract) {
      console.error('Contract not found for FILE_ID:', fileId, findError);
      // Возвращаем 200, чтобы Podpislon не повторял запрос
      return new Response(
        JSON.stringify({ success: true, message: 'Contract not found but acknowledged' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Определяем новый статус и обновляемые поля
    const updateData: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (eventType === 'DOCUMENT_OPENED') {
      updateData.status = 'viewed';
      updateData.viewed_at = new Date().toISOString();
      console.log('Document viewed:', contract.id);
    } else if (eventType === 'DOCUMENT_SIGNED') {
      updateData.status = 'signed';
      updateData.signed_at = new Date().toISOString();
      console.log('Document signed:', contract.id);
    } else {
      console.log('Unknown event type:', eventType);
      // Всё равно отмечаем получение
    }

    // Обновляем статус договора
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

    console.log(`Contract ${contract.id} updated to status: ${updateData.status || 'unchanged'}`);

    // Логируем в audit_log
    await supabase
      .from('audit_log')
      .insert({
        user_id: contract.user_id,
        action: 'CONTRACT_STATUS_UPDATE',
        table_name: 'contracts',
        record_id: contract.id,
      });

    // Podpislon ожидает успешный ответ
    return new Response(
      JSON.stringify({ success: true, message: 'Webhook processed' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in podpislon-webhook:', error);
    // Возвращаем 200, чтобы Podpislon не повторял запрос
    return new Response(
      JSON.stringify({ success: true, error: error.message }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
