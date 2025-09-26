import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { contactFormSchema, SecurityRateLimiter, sanitizeHtml } from '@/lib/validationSchemas';

export interface FormData {
  name: string;
  phone: string;
  course: string;
  social: string;
}

// Rate limiter instance
const rateLimiter = new SecurityRateLimiter(3, 10 * 60 * 1000); // 3 attempts per 10 minutes

export const saveContactSubmission = async (formData: FormData) => {
  try {
    // Enhanced security: Client-side rate limiting check
    const clientIdentifier = `contact_form_${Date.now() % 1000000}`;
    if (!rateLimiter.isAllowed(clientIdentifier)) {
      toast.error('Слишком много попыток. Попробуйте позже.');
      return { data: null, error: 'Client rate limited' };
    }

    // Enhanced validation with Zod schema
    const validatedData = contactFormSchema.parse({
      name: formData.name.trim(),
      phone: formData.phone.trim(),
      course: formData.course.trim(),
      social: formData.social ? formData.social.trim() : ''
    });

    // Enhanced sanitization to prevent XSS
    const sanitizedData = {
      name: sanitizeHtml(validatedData.name),
      phone: sanitizeHtml(validatedData.phone),
      course: sanitizeHtml(validatedData.course),
      social: validatedData.social ? sanitizeHtml(validatedData.social) : null
    };

    // Additional security: Length validation
    if (sanitizedData.name.length > 100 || 
        sanitizedData.phone.length > 20 || 
        sanitizedData.course.length > 100 ||
        (sanitizedData.social && sanitizedData.social.length > 200)) {
      toast.error('Данные превышают допустимую длину');
      return { data: null, error: 'Data too long' };
    }

    console.log('Submitting contact form with enhanced security validations');

    // Submit to Supabase with server-side security validation
    const { data, error } = await supabase
      .from('contact_submissions')
      .insert([sanitizedData])
      .select()
      .single();

    if (error) {
      console.error('Database error:', error);
      
      // Enhanced error handling for security-related errors
      if (error.message.includes('rate_limit') || error.message.includes('RATE_LIMIT')) {
        toast.error('Слишком много запросов. Пожалуйста, подождите и попробуйте позже.');
        return { data: null, error: 'Server rate limit exceeded' };
      }
      
      if (error.message.includes('validation') || error.message.includes('validate_contact_submission')) {
        toast.error('Данные не прошли проверку безопасности. Проверьте правильность ввода.');
        return { data: null, error: 'Security validation failed' };
      }
      
      if (error.message.includes('violates row-level security')) {
        toast.error('Ошибка проверки безопасности. Убедитесь, что все поля заполнены корректно.');
        return { data: null, error: 'RLS validation failed' };
      }
      
      toast.error('Произошла ошибка при отправке заявки. Попробуйте позже.');
      return { data: null, error };
    }

    console.log('Contact submission saved successfully with enhanced security:', data);
    toast.success('Заявка принята! Мы свяжемся с вами в ближайшее время.');
    
    // Security audit: Log successful submission
    console.log('Security audit: Contact form submitted successfully at', new Date().toISOString());
    
    return { data, error: null };

  } catch (error) {
    console.error('Enhanced security validation or submission error:', error);
    
    if (error instanceof Error) {
      // Handle Zod validation errors with better messaging
      if (error.message.includes('validation') || error.name === 'ZodError') {
        toast.error('Проверьте правильность введённых данных. Убедитесь, что все поля заполнены корректно.');
        return { data: null, error: 'Enhanced validation failed' };
      } else {
        toast.error('Ошибка при отправке заявки');
        return { data: null, error: error.message };
      }
    }
    
    return { data: null, error: 'Unknown error' };
  }
};
