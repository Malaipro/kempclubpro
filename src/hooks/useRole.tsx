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
        // Use security definer functions for secure role checking
        const { data: isAdminResult, error: adminError } = await supabase
          .rpc('is_admin', { _user_id: user.id });
        
        const { data: isSuperAdminResult, error: superAdminError } = await supabase
          .rpc('is_super_admin', { _user_id: user.id });

        if (adminError || superAdminError) {
          console.error('Error checking roles:', adminError || superAdminError);
          // Security: Do not grant admin access on RPC failure
          setIsAdmin(false);
          setIsSuperAdmin(false);
          setLoading(false);
          return;
        }

        setIsAdmin(isAdminResult || false);
        setIsSuperAdmin(isSuperAdminResult || false);
      } catch (error) {
        console.error('Error in checkRole:', error);
        // Security: Do not grant admin access on error
        setIsAdmin(false);
        setIsSuperAdmin(false);
      } finally {
        setLoading(false);
      }
    };

    checkRole();
  }, [user]);

  return { isAdmin, isSuperAdmin, loading };
};