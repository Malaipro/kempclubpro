import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

/** Redirects signed-in users with profiles.must_change_password = true to /change-password. */
export const PasswordChangeGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();
  const location = useLocation();
  const [mustChange, setMustChange] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!user) { setMustChange(false); return; }
    setMustChange(null);
    supabase
      .from('profiles')
      .select('must_change_password')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled) setMustChange((data as any)?.must_change_password === true);
      });
    return () => { cancelled = true; };
  }, [user?.id, location.pathname]);

  if (loading || (user && mustChange === null)) {
    return <div className="min-h-screen bg-black flex items-center justify-center text-gray-400">Загрузка...</div>;
  }
  if (user && mustChange) return <Navigate to="/change-password" replace />;
  return <>{children}</>;
};
