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

// Rate limiting store (in production, use Redis or similar)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

const checkRateLimit = async (supabase: any, identifier: string, clientIP: string, maxRequests = 3, windowMs = 15 * 60 * 1000): Promise<boolean> => {
  const now = Date.now();
  const userLimit = rateLimitStore.get(identifier);
  
  // Clean old entries
  for (const [key, value] of rateLimitStore.entries()) {
    if (now > value.resetTime) {
      rateLimitStore.delete(key);
    }
  }
  
  if (!userLimit || now > userLimit.resetTime) {
    rateLimitStore.set(identifier, { count: 1, resetTime: now + windowMs });
  } else {
    if (userLimit.count >= maxRequests) {
      // Use enhanced database rate limiting
      try {
        const { data: allowed } = await supabase.rpc('enhanced_rate_limit_check', {
          p_ip_address: clientIP,
          p_identifier: identifier,
          p_max_requests: maxRequests,
          p_window_minutes: Math.floor(windowMs / (1000 * 60))
        });
        
        if (!allowed) {
          return false;
        }
      } catch (error) {
        console.warn('Database rate limit check failed:', error);
        return false; // Fail secure
      }
      
      return false;
    }
    userLimit.count++;
  }
  
  return true;
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
    if (!(await checkRateLimit(supabase, clientIP, clientIP, 3, 15 * 60 * 1000))) {
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
      const { data, error } = await supabase
        .from('contact_submissions')
        .insert({
          name: sanitizedData.name,
          phone: sanitizedData.phone,
          course: sanitizedData.course || 'Не указан',
          social: sanitizedData.social,
          ip_address: sanitizedData.ip_address
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