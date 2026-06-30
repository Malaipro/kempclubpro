import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Input validation schema for webhook data
const validateWebhookInput = (data: any) => {
  const errors: string[] = [];
  
  if (!data || typeof data !== 'object') {
    errors.push('Invalid data format');
    return { valid: false, errors };
  }
  
  // Common validations for contact form data
  if (data.name) {
    if (typeof data.name !== 'string' || data.name.length < 2 || data.name.length > 100) {
      errors.push('Name must be between 2 and 100 characters');
    }
    if (!/^[А-Яа-яA-Za-z\s\-']+$/.test(data.name.trim())) {
      errors.push('Name contains invalid characters');
    }
  }
  
  if (data.phone) {
    if (typeof data.phone !== 'string' || data.phone.length < 10 || data.phone.length > 20) {
      errors.push('Phone must be between 10 and 20 characters');
    }
    if (!/^[\+\d\s\-\(\)]+$/.test(data.phone.trim())) {
      errors.push('Phone contains invalid characters');
    }
  }
  
  if (data.email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.email)) {
      errors.push('Invalid email format');
    }
  }
  
  return { valid: errors.length === 0, errors };
};

// Sanitize input to prevent XSS attacks
const sanitizeInput = (input: string): string => {
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
    .trim();
};

// Rate limiting backed by contact_rate_limit table — survives cold starts and scales
// across multiple edge function instances. Uses enhanced_contact_rate_limit RPC
// which atomically increments submission_count within a sliding window.
const checkRateLimit = async (supabase: any, clientIP: string): Promise<boolean> => {
  const { data, error } = await supabase.rpc('enhanced_contact_rate_limit', {
    p_ip_address: clientIP,
  });
  if (error) {
    console.warn('DB rate limit check failed, failing secure:', error.message);
    return false;
  }
  return data === true;
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get request body
    const requestData = await req.json();
    console.log('Enhanced Security Webhook received data:', requestData);

    // Get client IP for rate limiting
    const clientIP = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
    
    // Enhanced rate limiting with database integration
    if (!(await checkRateLimit(supabase, clientIP))) {
      console.log(`Enhanced rate limit exceeded for IP: ${clientIP}`);
      
      // Log enhanced security event
      try {
        await supabase.rpc('log_security_event', {
          event_type: 'RATE_LIMIT_EXCEEDED',
          user_id_param: null,
          details: { ip: clientIP, source: 'webhook' }
        });
      } catch (error) {
        console.error('Failed to log rate limit event:', error);
      }
      
      return new Response(
        JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
        { 
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Enhanced validation with database functions
    const validation = validateWebhookInput(requestData);
    if (!validation.valid) {
      console.log('Enhanced validation failed:', validation.errors);
      
      // Log enhanced security event for invalid data
      try {
        await supabase.rpc('log_security_event', {
          event_type: 'SECURITY_EVENT',
          user_id_param: null,
          details: { 
            event: 'webhook_validation_failed', 
            errors: validation.errors,
            ip: clientIP
          }
        });
      } catch (error) {
        console.error('Failed to log validation failure:', error);
      }
      
      return new Response(
        JSON.stringify({ 
          error: 'Enhanced security validation failed', 
          details: validation.errors 
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Enhanced sanitization
    const sanitizedData = {
      name: requestData.name ? sanitizeInput(requestData.name) : undefined,
      phone: requestData.phone ? sanitizeInput(requestData.phone) : undefined,
      email: requestData.email ? sanitizeInput(requestData.email) : undefined,
      course: requestData.course ? sanitizeInput(requestData.course) : undefined,
      social: requestData.social ? sanitizeInput(requestData.social) : undefined,
      message: requestData.message ? sanitizeInput(requestData.message) : undefined,
      ip_address: clientIP
    };

    // Process the webhook data based on type
    let result;
    
    if (requestData.type === 'contact_form') {
      // Enhanced contact form processing with database validation
      // First encrypt the phone number for secure storage
      let encryptedPhone = sanitizedData.phone;
      
      if (sanitizedData.phone) {
        try {
          const { data: phoneData, error: encryptError } = await supabase
            .rpc('encrypt_phone', { phone_text: sanitizedData.phone });

          if (encryptError) {
            console.error('Phone encryption error:', encryptError);
            await supabase.rpc('log_security_event', {
              event_type: 'PHONE_ENCRYPTION',
              details: { error: 'phone_encryption_failed' }
            });
          } else {
            encryptedPhone = phoneData;
            // Log successful encryption
            await supabase.rpc('log_security_event', {
              event_type: 'PHONE_ENCRYPTION',
              details: { success: true, action: 'contact_form_encrypted' }
            });
          }
        } catch (error) {
          console.error('Phone encryption failed:', error);
        }
      }

      const { data, error } = await supabase
        .from('contact_submissions')
        .insert({
          name: sanitizedData.name,
          phone: encryptedPhone,
          course: sanitizedData.course || 'Не указан',
          social: sanitizedData.social,
          message: sanitizedData.message
        })
        .select()
        .single();

      if (error) {
        // Enhanced error logging
        try {
          await supabase.rpc('log_security_event', {
            event_type: 'SECURITY_EVENT',
            user_id_param: null,
            details: { 
              event: 'webhook_contact_form_error', 
              error: error.message,
              ip: clientIP
            }
          });
        } catch (logError) {
          console.error('Failed to log database error:', logError);
        }
        throw error;
      }
      
      result = data;
    } else {
      // Handle other webhook types
      result = { message: 'Webhook processed successfully', data: sanitizedData };
    }

    // Enhanced success logging
    try {
      await supabase.rpc('log_security_event', {
        event_type: 'SECURITY_EVENT',
        user_id_param: null,
        details: { 
          event: 'webhook_processed_successfully', 
          type: requestData.type,
          ip: clientIP
        }
      });
    } catch (error) {
      console.error('Failed to log success event:', error);
    }

    return new Response(
      JSON.stringify({ success: true, data: result }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Enhanced Security Webhook error:', error);
    
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});