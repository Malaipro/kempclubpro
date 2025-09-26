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
    // Client-side rate limiting check
    const clientIdentifier = `contact_form_${Date.now() % 1000000}`; // Simple client identifier
    if (!rateLimiter.isAllowed(clientIdentifier)) {
      toast.error('Слишком много попыток. Попробуйте позже.');
      return { data: null, error: 'Rate limited' };
    }

    // Validate data with Zod schema
    const validatedData = contactFormSchema.parse({
      name: formData.name,
      phone: formData.phone,
      course: formData.course,
      social: formData.social || ''
    });

    // Sanitize data to prevent XSS
    const sanitizedData = {
      name: sanitizeHtml(validatedData.name),
      phone: sanitizeHtml(validatedData.phone),
      course: sanitizeHtml(validatedData.course),
      social: validatedData.social ? sanitizeHtml(validatedData.social) : null
    };

    // Submit to Supabase
    const { data, error } = await supabase
      .from('contact_submissions')
      .insert([sanitizedData])
      .select()
      .single();

    if (error) {
      console.error('Database error:', error);
      
      // Check if it's a validation error from our database function
      if (error.message.includes('violates row-level security')) {
        toast.error('Некорректные данные формы. Проверьте введённую информацию.');
      } else {
        toast.error('Произошла ошибка при отправке заявки. Попробуйте позже.');
      }
      
      return { data: null, error };
    }

    toast.success('Заявка принята! Мы свяжемся с вами в ближайшее время.');
    return { data, error: null };

  } catch (error) {
    console.error('Validation or submission error:', error);
    
    if (error instanceof Error) {
      // Handle Zod validation errors
      if (error.message.includes('validation')) {
        toast.error('Проверьте правильность введённых данных');
      } else {
        toast.error('Ошибка при отправке заявки');
      }
    }
    
    return { data: null, error };
  }
};
