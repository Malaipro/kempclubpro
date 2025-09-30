import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { KampInstructions } from './KampInstructions';
import { RealKampProgress } from './RealKampProgress';
import { KampManual } from '@/components/instructions/KampManual';
import { EnhancedPersonalProfile } from '@/components/profile/EnhancedPersonalProfile';
import { AccountSettings } from '@/components/profile';
import { ScheduleViewer } from '@/components/schedule/ScheduleViewer';
import { Book, Trophy, FileText, User, Settings, Calendar } from 'lucide-react';
import { useRole } from '@/hooks/useRole';

export const KampSystemUser: React.FC = () => {
  const { isAdmin, isSuperAdmin } = useRole();
  
  return (
    <section id="kamp-system" className="kamp-section bg-black">
      <div className="kamp-container">
        <div className="section-heading mb-8">
          <h2 className="text-gradient">Система КЭМП</h2>
          <p>Ваш личный прогресс и инструкции</p>
        </div>

        <Tabs defaultValue="progress" className="w-full">
          <div className="mb-8 overflow-x-auto">
            <TabsList className="flex w-max min-w-full h-auto gap-1 p-1">
              <TabsTrigger value="progress" className="flex flex-col items-center gap-1 text-xs px-3 py-2 min-w-[72px] flex-shrink-0">
                <Trophy className="w-4 h-4" />
                <span className="whitespace-nowrap">Прогресс</span>
              </TabsTrigger>
              <TabsTrigger value="profile" className="flex flex-col items-center gap-1 text-xs px-3 py-2 min-w-[72px] flex-shrink-0">
                <User className="w-4 h-4" />
                <span className="whitespace-nowrap">Профиль</span>
              </TabsTrigger>
              <TabsTrigger value="settings" className="flex flex-col items-center gap-1 text-xs px-3 py-2 min-w-[72px] flex-shrink-0">
                <Settings className="w-4 h-4" />
                <span className="whitespace-nowrap">Настройки</span>
              </TabsTrigger>
              <TabsTrigger value="instructions" className="flex flex-col items-center gap-1 text-xs px-3 py-2 min-w-[72px] flex-shrink-0">
                <Book className="w-4 h-4" />
                <span className="whitespace-nowrap">Инструкция</span>
              </TabsTrigger>
              <TabsTrigger value="schedule" className="flex flex-col items-center gap-1 text-xs px-3 py-2 min-w-[72px] flex-shrink-0">
                <Calendar className="w-4 h-4" />
                <span className="whitespace-nowrap">Расписание</span>
              </TabsTrigger>
              <TabsTrigger value="manual" className="flex flex-col items-center gap-1 text-xs px-3 py-2 min-w-[72px] flex-shrink-0">
                <FileText className="w-4 h-4" />
                <span className="whitespace-nowrap">Руководство</span>
              </TabsTrigger>
            </TabsList>
          </div>
          
          <TabsContent value="progress">
            <RealKampProgress />
          </TabsContent>
          
          <TabsContent value="profile">
            <EnhancedPersonalProfile />
          </TabsContent>
          
          <TabsContent value="settings">
            <AccountSettings />
          </TabsContent>
          
          <TabsContent value="instructions">
            <KampInstructions />
          </TabsContent>
          
          <TabsContent value="schedule">
            <ScheduleViewer />
          </TabsContent>
          
          <TabsContent value="manual">
            <KampManual />
          </TabsContent>
        </Tabs>
      </div>
    </section>
  );
};