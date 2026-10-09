import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import {
  LogOut, Loader2, MessageCircle, Salad, Activity, Flame, ClipboardList,
  Trophy, ShoppingBag, Target, ScrollText, NotebookPen, Pyramid,
  History, Briefcase, Users, Flag,
} from 'lucide-react';
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

export type Section = TgSection | 'chat' | 'history';

type Tile = { section: Section; label: string; icon: React.ReactNode };

const RESIDENT_TILES: Tile[] = [
  { section: 'rating', label: 'Рейтинг', icon: <Trophy className="h-5 w-5" /> },
  { section: 'challenges', label: 'Челленджи', icon: <Target className="h-5 w-5" /> },
  { section: 'shop', label: 'Магазин', icon: <ShoppingBag className="h-5 w-5" /> },
  { section: 'history', label: 'История', icon: <History className="h-5 w-5" /> },
  { section: 'mastermind_business', label: 'Мастермайнд: бизнес', icon: <Briefcase className="h-5 w-5" /> },
  { section: 'mastermind_personal', label: 'Мастермайнд: личное', icon: <Users className="h-5 w-5" /> },
  { section: 'nutrition', label: 'Нутрициолог', icon: <Salad className="h-5 w-5" /> },
  { section: 'chat', label: 'Чат', icon: <MessageCircle className="h-5 w-5" /> },
  { section: 'rules', label: 'Правила', icon: <ScrollText className="h-5 w-5" /> },
  { section: 'journal', label: 'Ежедневник', icon: <NotebookPen className="h-5 w-5" /> },
  { section: 'pyramid', label: 'Пирамида КЭМП', icon: <Pyramid className="h-5 w-5" /> },
];

const INTENSIVE_TILES: Tile[] = [
  { section: 'chat', label: 'Чат', icon: <MessageCircle className="h-5 w-5" /> },
  { section: 'nutrition', label: 'Нутрициолог', icon: <Salad className="h-5 w-5" /> },
  { section: 'activities', label: 'Отметки', icon: <Activity className="h-5 w-5" /> },
  { section: 'ascetics', label: 'Аскезы', icon: <Flame className="h-5 w-5" /> },
  { section: 'homework', label: 'ДЗ', icon: <ClipboardList className="h-5 w-5" /> },
  { section: 'rating', label: 'Рейтинг', icon: <Trophy className="h-5 w-5" /> },
  { section: 'shop', label: 'Магазин', icon: <ShoppingBag className="h-5 w-5" /> },
  { section: 'challenges', label: 'Челленджи', icon: <Target className="h-5 w-5" /> },
  { section: 'checkpoint', label: 'Точка А/Б', icon: <Flag className="h-5 w-5" /> },
  { section: 'rules', label: 'Правила', icon: <ScrollText className="h-5 w-5" /> },
  { section: 'journal', label: 'Ежедневник', icon: <NotebookPen className="h-5 w-5" /> },
  { section: 'pyramid', label: 'Пирамида КЭМП', icon: <Pyramid className="h-5 w-5" /> },
];

import type { ParticipantFullState } from '@/services/participantService';

type State =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ok'; data: ParticipantFullState };

const SOON_SECTIONS: Section[] = [
  'captain',
];

const TileButton: React.FC<{ icon: React.ReactNode; label: string; onClick: () => void }> = ({ icon, label, onClick }) => (
  <Button
    variant="ghost"
    onClick={onClick}
    className="tactical-tile flex h-[104px] min-w-0 flex-col items-center justify-center gap-3 rounded-none px-1.5 py-3 text-center"
  >
    <span className="tactical-tile-icon">{icon}</span>
    <span className="tactical-tile-label text-xs font-semibold leading-tight">{label}</span>
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
    <div className={`min-h-screen bg-background ${activeSection === 'home' ? 'web-home-theme text-foreground' : activeSection === 'chat' || activeSection === 'nutrition' ? 'web-chat-theme text-foreground' : ''}`}>
      <div className="mx-auto max-w-lg pb-20">
        <SectionErrorBoundary key={activeSection} onHome={() => setActiveSection('home')}>
          {activeSection === 'home' ? (
            <TelegramParticipantView
              data={state.data}
              activeSection={activeSection as TgSection}
              onNavigate={setActiveSection}
              hideSectionsGrid
              appearance="tactical"
              tilesSlot={
                <div className="px-4 pt-4">
                  <div className="tactical-tiles grid grid-cols-3 gap-2.5">
                    {(isResident ? RESIDENT_TILES : INTENSIVE_TILES).map((t) => (
                      <TileButton
                        key={t.section}
                        icon={t.icon}
                        label={t.label}
                        onClick={() => setActiveSection(t.section)}
                      />
                    ))}
                  </div>
                </div>
              }
            />
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
