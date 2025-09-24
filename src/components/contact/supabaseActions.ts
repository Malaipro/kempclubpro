import { toast } from 'sonner';

export interface FormData {
  name: string;
  phone: string;
  course: string;
  social: string;
}

export const saveContactSubmission = async (formData: FormData) => {
  console.log('Saving contact submission:', formData);
  
  try {
    // Placeholder implementation - just log for now
    toast.success('Заявка принята! Мы свяжемся с вами в ближайшее время.');
    return { data: null, error: null };
  } catch (error) {
    console.error('Error saving contact submission:', error);
    toast.error('Ошибка при отправке заявки');
    throw error;
  }
};
