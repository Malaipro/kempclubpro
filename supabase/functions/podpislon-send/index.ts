import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SendContractRequest {
  userId: string;
  streamId?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const podpislonApiKey = Deno.env.get('PODPISLON_API_KEY');

    if (!podpislonApiKey) {
      console.error('PODPISLON_API_KEY is not configured');
      return new Response(
        JSON.stringify({ error: 'Podpislon API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { userId, streamId } = await req.json() as SendContractRequest;
    console.log('Sending contract for user:', userId);

    // Получаем данные профиля
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (profileError || !profile) {
      console.error('Profile not found:', profileError);
      return new Response(
        JSON.stringify({ error: 'Profile not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Получаем данные для договора
    const { data: contractData, error: contractDataError } = await supabase
      .from('contract_data')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (contractDataError || !contractData) {
      console.error('Contract data not found:', contractDataError);
      return new Response(
        JSON.stringify({ error: 'Contract data not filled. Please fill passport data first.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Валидируем обязательные поля
    if (!contractData.passport_series || !contractData.passport_number || 
        !contractData.passport_issued_by || !contractData.passport_issued_date ||
        !contractData.registration_address) {
      console.error('Incomplete contract data');
      return new Response(
        JSON.stringify({ error: 'Incomplete contract data. Please fill all required fields.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Проверяем номер телефона
    if (!profile.phone) {
      console.error('Phone number not found in profile');
      return new Response(
        JSON.stringify({ error: 'Phone number is required. Please add phone to your profile.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Формируем данные для договора
    const fullName = `${profile.last_name || ''} ${profile.first_name || ''}`.trim();
    const passport = `${contractData.passport_series} ${contractData.passport_number}`;
    const issuedDate = new Date(contractData.passport_issued_date).toLocaleDateString('ru-RU');
    const currentDate = new Date().toLocaleDateString('ru-RU');
    
    // Текст договора (шаблон)
    const contractText = `ДОГОВОР ОКАЗАНИЯ УСЛУГ

г. Москва                                              ${currentDate}

${fullName}, паспорт ${passport}, выдан ${contractData.passport_issued_by} ${issuedDate}, ${contractData.passport_department_code ? `код подразделения ${contractData.passport_department_code},` : ''}
зарегистрированный по адресу: ${contractData.registration_address},${contractData.inn ? ` ИНН: ${contractData.inn},` : ''}
именуемый в дальнейшем «Заказчик», 

и ИП Шакирзянов Дмитрий Ринатович, именуемый в дальнейшем «Исполнитель», заключили настоящий Договор о нижеследующем:

1. ПРЕДМЕТ ДОГОВОРА
1.1. Исполнитель обязуется оказать Заказчику услуги по проведению курса интенсива КЭМП.

2. ПОРЯДОК ОКАЗАНИЯ УСЛУГ
2.1. Услуги оказываются в соответствии с программой курса.

3. СТОИМОСТЬ И ПОРЯДОК РАСЧЕТОВ
3.1. Стоимость услуг определяется согласно выбранному тарифу.

4. ПОДПИСИ СТОРОН

Заказчик: ${fullName}
Подпись: ____________________`;

    // Формируем номер телефона (только цифры, с 7 в начале)
    let phoneNumber = profile.phone.replace(/\D/g, '');
    if (phoneNumber.startsWith('8')) {
      phoneNumber = '7' + phoneNumber.slice(1);
    } else if (!phoneNumber.startsWith('7')) {
      phoneNumber = '7' + phoneNumber;
    }

    // Webhook URL для получения статусов
    const webhookUrl = `${supabaseUrl}/functions/v1/podpislon-webhook`;

    // Отправляем в Podpislon API
    // Документация: PUT https://podpislon.ru/integration/add-document
    console.log('Sending request to Podpislon API...');
    console.log('Phone:', phoneNumber);
    console.log('Webhook URL:', webhookUrl);
    
    const podpislonResponse = await fetch('https://podpislon.ru/integration/add-document', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-Api-Key': podpislonApiKey,
      },
      body: JSON.stringify({
        contact: phoneNumber,
        name: fullName,
        text: contractText,
        webhook: webhookUrl,
        // Опционально: можно добавить файл PDF в base64
        // file: base64EncodedPdf,
      }),
    });

    const responseText = await podpislonResponse.text();
    console.log('Podpislon response status:', podpislonResponse.status);
    console.log('Podpislon response:', responseText);

    if (!podpislonResponse.ok) {
      console.error('Podpislon API error:', responseText);
      return new Response(
        JSON.stringify({ error: `Podpislon API error: ${responseText}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let podpislonResult;
    try {
      podpislonResult = JSON.parse(responseText);
    } catch {
      podpislonResult = { id: responseText };
    }
    
    console.log('Podpislon parsed result:', podpislonResult);

    // Получаем ID документа из ответа
    const documentId = podpislonResult.id || podpislonResult.file_id || podpislonResult.FILE_ID || null;

    // Создаём запись в таблице contracts
    const { data: contract, error: contractError } = await supabase
      .from('contracts')
      .insert({
        user_id: userId,
        stream_id: streamId || null,
        podpislon_document_id: documentId ? String(documentId) : null,
        status: 'sent',
        sent_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (contractError) {
      console.error('Error creating contract record:', contractError);
      return new Response(
        JSON.stringify({ error: 'Failed to save contract record' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Contract created successfully:', contract.id);

    return new Response(
      JSON.stringify({ 
        success: true, 
        contractId: contract.id,
        documentId: documentId,
        message: 'Contract sent for signing. SMS will be delivered to the participant.'
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in podpislon-send:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
