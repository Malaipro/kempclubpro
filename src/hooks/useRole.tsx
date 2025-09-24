import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export const useRole = () => {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkRole = () => {
      if (!user) {
        setIsAdmin(false);
        setIsSuperAdmin(false);
        setLoading(false);
        return;
      }

      // Simple hardcoded admin check since user_roles table doesn't exist
      const isSuperAdminUser = user.email === 'dishka.da@yandex.ru';
      
      setIsAdmin(isSuperAdminUser);
      setIsSuperAdmin(isSuperAdminUser);
      setLoading(false);
    };

    checkRole();
  }, [user]);

  return { isAdmin, isSuperAdmin, loading };
};