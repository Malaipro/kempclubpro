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

    // Формируем данные для Podpislon API
    const fullName = `${profile.last_name} ${profile.first_name}`.trim();
    const passport = `${contractData.passport_series} ${contractData.passport_number}`;
    
    // Текст договора (шаблон)
    const contractText = `
ДОГОВОР ОКАЗАНИЯ УСЛУГ

г. Москва                                              ${new Date().toLocaleDateString('ru-RU')}

${fullName}, паспорт ${passport}, выдан ${contractData.passport_issued_by} ${new Date(contractData.passport_issued_date).toLocaleDateString('ru-RU')}, 
код подразделения ${contractData.passport_department_code || 'не указан'},
зарегистрированный по адресу: ${contractData.registration_address},
${contractData.inn ? `ИНН: ${contractData.inn},` : ''}
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
Подпись: ____________________
`.trim();

    // Отправляем в Podpislon API
    console.log('Sending request to Podpislon API...');
    
    const podpislonResponse = await fetch('https://podpislon.ru/api/v1/documents/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${podpislonApiKey}`,
      },
      body: JSON.stringify({
        phone: profile.phone.replace(/\D/g, ''), // Только цифры
        text: contractText,
        signer_name: fullName,
        callback_url: `${supabaseUrl}/functions/v1/podpislon-webhook`,
      }),
    });

    if (!podpislonResponse.ok) {
      const errorText = await podpislonResponse.text();
      console.error('Podpislon API error:', errorText);
      return new Response(
        JSON.stringify({ error: `Podpislon API error: ${errorText}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const podpislonResult = await podpislonResponse.json();
    console.log('Podpislon response:', podpislonResult);

    // Создаём запись в таблице contracts
    const { data: contract, error: contractError } = await supabase
      .from('contracts')
      .insert({
        user_id: userId,
        stream_id: streamId || null,
        podpislon_document_id: podpislonResult.document_id || podpislonResult.id,
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
        documentId: podpislonResult.document_id || podpislonResult.id,
        message: 'Contract sent for signing'
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
