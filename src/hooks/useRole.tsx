import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export const useRole = () => {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkRole = async () => {
      if (!user) {
        setIsAdmin(false);
        setIsSuperAdmin(false);
        setLoading(false);
        return;
      }

      try {
        // Check user roles from database
        const { data: roles, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id);

        if (error) {
          console.error('Error checking roles:', error);
          // Fallback to email check if database query fails
          const isSuperAdminUser = user.email === 'dishka.da@yandex.ru';
          setIsAdmin(isSuperAdminUser);
          setIsSuperAdmin(isSuperAdminUser);
          setLoading(false);
          return;
        }

        const userRoles = roles?.map(r => r.role) || [];
        const hasAdminRole = userRoles.includes('admin') || userRoles.includes('super_admin');
        const hasSuperAdminRole = userRoles.includes('super_admin');

        setIsAdmin(hasAdminRole);
        setIsSuperAdmin(hasSuperAdminRole);
      } catch (error) {
        console.error('Error in checkRole:', error);
        // Fallback to email check
        const isSuperAdminUser = user.email === 'dishka.da@yandex.ru';
        setIsAdmin(isSuperAdminUser);
        setIsSuperAdmin(isSuperAdminUser);
      } finally {
        setLoading(false);
      }
    };

    checkRole();
  }, [user]);

  return { isAdmin, isSuperAdmin, loading };
};