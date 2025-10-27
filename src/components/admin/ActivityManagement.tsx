import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Activity, Zap, Award, History } from 'lucide-react';
import { TrainingSessionManagement } from './TrainingSessionManagement';
import { CrashTestManagement } from './CrashTestManagement';
import { TotemAssignment } from './TotemAssignment';
import { TrainingSessionsList } from './TrainingSessionsList';

export const ActivityManagement: React.FC = () => {
  const [activeTab, setActiveTab] = useState('training');

  return (
    <div className="w-full space-y-6">
      <div className="flex items-center gap-2 mb-6">
        <Activity className="w-5 h-5 text-kamp-accent" />
        <h2 className="text-xl font-semibold text-white">Управление активностями</h2>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 bg-muted/50">
          <TabsTrigger value="training" className="flex items-center gap-2 text-white data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Activity className="w-4 h-4" />
            Тренировки
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2 text-white data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <History className="w-4 h-4" />
            История
          </TabsTrigger>
          <TabsTrigger value="crash" className="flex items-center gap-2 text-white data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Zap className="w-4 h-4" />
            Краштесты
          </TabsTrigger>
          <TabsTrigger value="totems" className="flex items-center gap-2 text-white data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Award className="w-4 h-4" />
            Тотемы
          </TabsTrigger>
        </TabsList>

        <TabsContent value="training" className="mt-6">
          <TrainingSessionManagement />
        </TabsContent>

        <TabsContent value="history" className="mt-6">
          <TrainingSessionsList />
        </TabsContent>

        <TabsContent value="crash" className="mt-6">
          <CrashTestManagement />
        </TabsContent>

        <TabsContent value="totems" className="mt-6">
          <TotemAssignment />
        </TabsContent>
      </Tabs>
    </div>
  );
};
