import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';
import { WebAppShell } from '@/components/web-app/WebAppShell';

const WebApp: React.FC = () => {
  const [authed, setAuthed] = useState<boolean | null>(null);

  useEffect(() => {
    let mounted = true;

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (mounted) setAuthed(!!session);
    });

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      // Вход без «Запомнить меня»: сессия живёт только до закрытия вкладки.
      // При новом визите (флаг sessionStorage пуст) завершаем её.
      if (data.session && localStorage.getItem('kamp_session_temporary') === '1') {
        if (!sessionStorage.getItem('kamp_tab_active')) {
          localStorage.removeItem('kamp_session_temporary');
          supabase.auth.signOut().then(() => {
            if (mounted) setAuthed(false);
          });
          return;
        }
      }
      if (data.session) sessionStorage.setItem('kamp_tab_active', '1');
      setAuthed(!!data.session);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  if (authed === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-6 h-6 animate-spin text-kamp-primary" />
      </div>
    );
  }

  if (!authed) return <Navigate to="/app/login" replace />;

  return <WebAppShell />;
};

export default WebApp;
