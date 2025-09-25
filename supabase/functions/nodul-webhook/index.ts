import { corsHeaders } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const requestBody = await req.json();
    const { webhookUrl, ...data } = requestBody;
    
    console.log('Nodul webhook request:', { webhookUrl, data });

    if (!webhookUrl) {
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Webhook URL is required' 
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Forward the request to Nodul
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    const responseText = await response.text();
    console.log('Nodul response:', { status: response.status, text: responseText });

    if (!response.ok) {
      // Check for specific Nodul errors
      if (responseText.includes('cant find webhook') || responseText.includes('deployed scenario to prod')) {
        return new Response(
          JSON.stringify({ 
            success: false,
            error: 'Сценарий не развернут в продакшене. Убедитесь, что сценарий опубликован в Nodul.',
            status: 'webhook_not_found'
          }),
          { 
            status: 200, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }
      
      return new Response(
        JSON.stringify({ 
          success: false,
          error: `HTTP ${response.status}: ${responseText}`,
          status: 'nodul_error'
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Data sent to Nodul successfully',
        nodulResponse: responseText 
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in nodul-webhook function:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false,
        error: (error as Error).message || 'Failed to send data to Nodul',
        details: (error as Error).toString()
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});