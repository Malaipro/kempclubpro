import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const usePhoneDecryption = (encryptedPhone: string, shouldMask: boolean = false) => {
  const [decryptedPhone, setDecryptedPhone] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const decryptPhone = async () => {
      if (!encryptedPhone) {
        setDecryptedPhone('Не указан');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const { data: decrypted, error: decryptError } = await supabase
          .rpc('decrypt_phone', { encrypted_phone: encryptedPhone });

        if (decryptError) {
          console.error('Phone decryption error:', decryptError);
          setError('Ошибка расшифровки');
          setDecryptedPhone(encryptedPhone); // Fallback to original
        } else {
          let phone = decrypted || encryptedPhone;
          
          // Apply masking if requested
          if (shouldMask && phone) {
            phone = phone.replace(/(\d{2})\d*(\d{2})/, '$1****$2');
          }
          
          setDecryptedPhone(phone);
        }
      } catch (err) {
        console.error('Phone decryption failed:', err);
        setError('Ошибка системы');
        setDecryptedPhone(shouldMask ? 
          encryptedPhone.replace(/(\d{2})\d*(\d{2})/, '$1****$2') : 
          encryptedPhone
        );
      } finally {
        setLoading(false);
      }
    };

    decryptPhone();
  }, [encryptedPhone, shouldMask]);

  return {
    phone: decryptedPhone,
    loading,
    error,
    isEncrypted: encryptedPhone !== decryptedPhone
  };
};