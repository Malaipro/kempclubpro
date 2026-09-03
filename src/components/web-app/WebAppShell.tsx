import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { LogOut, Loader2 } from 'lucide-react';
import { AppApiProvider, useAppApi } from '@/components/app-shared/apiAdapter';
import { TelegramParticipantView } from '@/components/telegram-app/TelegramParticipantView';
import { WebBottomNav } from './WebBottomNav';
import type { Section } from '@/components/telegram-app/TelegramAppShell';
import type { ParticipantFullState } from '@/services/participantService';

type State =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ok'; data: ParticipantFullState };

const SOON_SECTIONS: Section[] = [
  'schedule', 'nutrition', 'activities', 'ascetics', 'homework', 'rating',
  'profile', 'pyramid', 'journal', 'shop', 'challenges',
  'mastermind_personal', 'mastermind_business', 'rules', 'captain', 'checkpoint',
];

const WebAppInner: React.FC = () => {
  const navigate = useNavigate();
  const { callApi } = useAppApi();
  const [state, setState] = useState<State>({ status: 'loading' });
  const [activeSection, setActiveSection] = useState<Section>('home');

  const load = useCallback(() => {
    setState({ status: 'loading' });
    callApi<ParticipantFullState>('get_state')
      .then((data) => {
        if (!data || data.found === false) {
          setState({ status: 'error', message: 'Профиль участника не найден' });
          return;
        }
        setState({ status: 'ok', data });
      })
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : 'Ошибка загрузки';
        setState({ status: 'error', message: msg });
      });
  }, [callApi]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/app/login', { replace: true });
  };

  if (state.status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-6 h-6 animate-spin text-kamp-primary" />
      </div>
    );
  }

  if (state.status === 'error') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-background px-6 text-center">
        <p className="text-muted-foreground">{state.message}</p>
        <div className="flex gap-3">
          <Button variant="outline" onClick={load}>Повторить</Button>
          <Button variant="ghost" onClick={handleSignOut}>Выйти</Button>
        </div>
      </div>
    );
  }

  const status = state.data.status ?? null;

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-lg pb-20">
        {activeSection === 'home' ? (
          <TelegramParticipantView
            data={state.data}
            activeSection={activeSection}
            onNavigate={setActiveSection}
          />
        ) : (
          <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-6 text-center">
            <p className="text-muted-foreground text-sm">
              Раздел появится в веб-версии на следующем этапе.
            </p>
            <Button variant="outline" onClick={() => setActiveSection('home')}>
              На главную
            </Button>
          </div>
        )}

        <div className="px-4 pb-6 pt-2">
          <Button variant="ghost" className="w-full gap-2 text-muted-foreground" onClick={handleSignOut}>
            <LogOut className="w-4 h-4" />
            Выйти
          </Button>
        </div>
      </div>

      <WebBottomNav
        active={activeSection}
        onNavigate={(s) => setActiveSection(SOON_SECTIONS.includes(s) || s === 'home' ? s : 'home')}
        status={status}
      />
    </div>
  );
};

export const WebAppShell: React.FC = () => (
  <AppApiProvider environment="web">
    <WebAppInner />
  </AppApiProvider>
);
