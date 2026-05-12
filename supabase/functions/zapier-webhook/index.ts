
import { corsHeaders } from '../_shared/cors.ts';

console.log("Zapier webhook function started");

Deno.serve(async (req) => {
  console.log("Received request:", req.method, req.url);

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { formData, zapierWebhookUrl } = await req.json();
    
    console.log("Form data received:", formData);
    console.log("Zapier webhook URL:", zapierWebhookUrl);

    if (!zapierWebhookUrl) {
      console.error("No Zapier webhook URL provided");
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Zapier webhook URL is required' 
        }),
        { 
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Подготавливаем данные для отправки в Zapier
    const zapierData = {
      name: formData.name,
      phone: formData.phone,
      social: formData.social || '',
      course: 'male', // фиксированное значение для кэмп-клуба
      source: 'КЭМП - Клуб Эффективного Мужского Прогресса',
      timestamp: new Date().toISOString(),
      website: 'https://kempclub.pro'
    };

    console.log("Sending data to Zapier:", zapierData);

    // Отправляем данные в Zapier
    const zapierResponse = await fetch(zapierWebhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(zapierData),
    });

    console.log("Zapier response status:", zapierResponse.status);

    if (!zapierResponse.ok) {
      console.error("Zapier webhook failed:", await zapierResponse.text());
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Failed to send data to Zapier' 
        }),
        { 
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const zapierResult = await zapierResponse.text();
    console.log("Zapier response:", zapierResult);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Data sent to Zapier successfully',
        zapierResponse: zapierResult 
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error("Error in Zapier webhook function:", error);
    
    return new Response(
      JSON.stringify({ 
        success: false,
        error: 'Internal server error' 
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
