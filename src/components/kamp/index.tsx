import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { KampInstructions } from './KampInstructions';
import { KampProgress } from './KampProgress';
import { ActivityFormAdmin } from './ActivityFormAdmin';
import { AsceticManagement } from './AsceticManagement';
import { ParticipantsList } from '@/components/admin/ParticipantsList';
import { KampManual } from '@/components/instructions/KampManual';
import { Book, Trophy, Plus, Target, Users, FileText } from 'lucide-react';

export const KampSystem: React.FC = () => {
  return (
    <section id="kamp-system" className="kamp-section bg-black">
      <div className="kamp-container">
        <div className="section-heading mb-8">
          <h2 className="text-gradient">Система КЭМП</h2>
          <p>Полная система геймификации: инструкции, прогресс, активности и аскезы</p>
        </div>

        <Tabs defaultValue="instructions" className="w-full">
          <TabsList className="grid w-full grid-cols-6 mb-8">
            <TabsTrigger value="instructions" className="flex items-center gap-2">
              <Book className="w-4 h-4" />
              Инструкция
            </TabsTrigger>
            <TabsTrigger value="progress" className="flex items-center gap-2">
              <Trophy className="w-4 h-4" />
              Прогресс
            </TabsTrigger>
            <TabsTrigger value="activities" className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Активности
            </TabsTrigger>
            <TabsTrigger value="ascetics" className="flex items-center gap-2">
              <Target className="w-4 h-4" />
              Аскезы
            </TabsTrigger>
            <TabsTrigger value="participants" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Участники
            </TabsTrigger>
            <TabsTrigger value="manual" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Руководство
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="instructions">
            <KampInstructions />
          </TabsContent>
          
          <TabsContent value="progress">
            <KampProgress />
          </TabsContent>
          
          <TabsContent value="activities">
            <ActivityFormAdmin />
          </TabsContent>
          
          <TabsContent value="ascetics">
            <AsceticManagement />
          </TabsContent>
          
          <TabsContent value="participants">
            <ParticipantsList />
          </TabsContent>
          
          <TabsContent value="manual">
            <KampManual />
          </TabsContent>
        </Tabs>
      </div>
    </section>
  );
};

export * from './KampInstructions';
export * from './KampProgress';
export * from './ActivityFormAdmin';
export * from './AsceticManagement';
export * from './AsceticTracker';