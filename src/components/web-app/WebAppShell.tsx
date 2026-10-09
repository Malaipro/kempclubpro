import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { LogOut, Loader2, MessageCircle } from 'lucide-react';
import { AppApiProvider, useAppApi } from '@/components/app-shared/apiAdapter';
import { TelegramParticipantView } from '@/components/telegram-app/TelegramParticipantView';
import { WebBottomNav } from './WebBottomNav';
import { SectionErrorBoundary } from './SectionErrorBoundary';
import { WebScheduleView } from './WebScheduleView';
import { WebActivitiesView } from './WebActivitiesView';
import { WebAsceticsView } from './WebAsceticsView';
import { WebHomeworkView } from './WebHomeworkView';
import { WebNutritionView } from './WebNutritionView';
import { WebProfileView, WebPyramidView, WebRatingView, WebRulesView } from './WebProgressViews';
import { WebChallengesView, WebJournalView, WebShopView } from './WebEngagementViews';
import { WebCheckpointView, WebMastermindView } from './WebGrowthViews';
import type { Section as TgSection } from '@/components/telegram-app/TelegramAppShell';
import { WebChatView } from './WebChatView';
import { WebHistoryView, WebResidentRatingView } from './WebResidentViews';
import { Card, CardContent } from '@/components/ui/card';

export type Section = TgSection | 'chat' | 'history';

const RESIDENT_TILES: { section: Section; label: string }[] = [
  { section: 'rating', label: 'Рейтинг' },
  { section: 'challenges', label: 'Челленджи' },
  { section: 'shop', label: 'Магазин' },
  { section: 'history', label: 'История' },
  { section: 'mastermind_business', label: 'Мастермайнд: бизнес' },
  { section: 'mastermind_personal', label: 'Мастермайнд: личное' },
  { section: 'nutrition', label: 'Нутрициолог' },
  { section: 'chat', label: 'Чат' },
  { section: 'rules', label: 'Правила' },
  { section: 'journal', label: 'Ежедневник' },
  { section: 'pyramid', label: 'Пирамида КЭМП' },
];
import type { ParticipantFullState } from '@/services/participantService';

type State =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ok'; data: ParticipantFullState };

const SOON_SECTIONS: Section[] = [
  'captain',
];

const ChatHomeTile: React.FC<{ onClick: () => void }> = ({ onClick }) => (
  <Button
    variant="outline"
    onClick={onClick}
    className="col-span-2 h-20 gap-3 rounded-lg border-chat-send/60 bg-chat-outgoing text-chat-outgoing-foreground hover:bg-chat-outgoing/90 hover:text-chat-outgoing-foreground"
  >
    <MessageCircle className="h-7 w-7 shrink-0" />
    <span className="text-base font-semibold">Чат</span>
  </Button>
);

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
  const isResident = status === 'club_resident';

  return (
    <div className={`min-h-screen bg-background ${activeSection === 'chat' || activeSection === 'nutrition' ? 'web-chat-theme text-foreground' : ''}`}>
      <div className="mx-auto max-w-lg pb-20">
        <SectionErrorBoundary key={activeSection} onHome={() => setActiveSection('home')}>
          {activeSection === 'home' ? (
            <>
              {isResident ? (
                <div className="grid grid-cols-3 gap-2 px-4 pt-4">
                  {RESIDENT_TILES.map((t) => t.section === 'chat' ? (
                    <ChatHomeTile key={t.section} onClick={() => setActiveSection('chat')} />
                  ) : (
                    <Card key={t.section} className="cursor-pointer" onClick={() => setActiveSection(t.section)}>
                      <CardContent className="p-3 text-center text-xs font-medium">{t.label}</CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-2 px-4 pt-4">
                  <ChatHomeTile onClick={() => setActiveSection('chat')} />
                  {([
                    { section: 'nutrition', label: 'Нутрициолог' },
                    { section: 'activities', label: 'Отметки' },
                    { section: 'ascetics', label: 'Аскезы' },
                    { section: 'homework', label: 'ДЗ' },
                    { section: 'rating', label: 'Рейтинг' },
                    { section: 'shop', label: 'Магазин' },
                    { section: 'challenges', label: 'Челленджи' },
                    { section: 'checkpoint', label: 'Точка А/Б' },
                    { section: 'rules', label: 'Правила' },
                    { section: 'journal', label: 'Ежедневник' },
                    { section: 'pyramid', label: 'Пирамида КЭМП' },
                  ] as { section: Section; label: string }[]).map((t) => (
                    <Card key={t.section} className="cursor-pointer" onClick={() => setActiveSection(t.section)}>
                      <CardContent className="p-3 text-center text-xs font-medium">{t.label}</CardContent>
                    </Card>
                  ))}
                </div>
              )}
              <TelegramParticipantView
                data={state.data}
                activeSection={activeSection as TgSection}
                onNavigate={setActiveSection}
                hideSectionsGrid
              />
            </>
          ) : activeSection === 'chat' ? (
            <WebChatView status={status} />
          ) : activeSection === 'history' ? (
            <WebHistoryView />
          ) : activeSection === 'nutrition' ? (
            <WebNutritionView />
          ) : activeSection === 'rating' && isResident ? (
            <WebResidentRatingView />
          ) : activeSection === 'schedule' ? (
            <WebScheduleView />
          ) : activeSection === 'activities' ? (
            <WebActivitiesView />
          ) : activeSection === 'ascetics' ? (
            <WebAsceticsView />
          ) : activeSection === 'homework' ? (
            <WebHomeworkView />
          ) : activeSection === 'rating' ? (
            <WebRatingView />
          ) : activeSection === 'profile' ? (
            <WebProfileView />
          ) : activeSection === 'journal' ? (
            <WebJournalView />
          ) : activeSection === 'shop' ? (
            <WebShopView />
          ) : activeSection === 'challenges' ? (
            <WebChallengesView />
          ) : activeSection === 'mastermind_personal' ? (
            <WebMastermindView groupId="c7f38e3a-796b-40be-9062-7e65e574988f" groupName="Личная эффективность" />
          ) : activeSection === 'mastermind_business' ? (
            <WebMastermindView groupId="d387a138-c3d0-4711-b41c-6ccb76efd901" groupName="Система в бизнесе" />
          ) : activeSection === 'pyramid' ? (
            <WebPyramidView />
          ) : activeSection === 'rules' ? (
            <WebRulesView />
          ) : activeSection === 'checkpoint' ? (
            <WebCheckpointView />
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
        </SectionErrorBoundary>

        <div className="px-4 pb-6 pt-2">
          <Button variant="ghost" className="w-full gap-2 text-muted-foreground" onClick={handleSignOut}>
            <LogOut className="w-4 h-4" />
            Выйти
          </Button>
        </div>
      </div>

      <WebBottomNav
        active={activeSection}
        onNavigate={(s) => setActiveSection(s)}
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
