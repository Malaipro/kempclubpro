import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, Shield, Archive, User, Share2, Gift } from 'lucide-react';
import { ClubScheduleViewer } from '@/components/schedule/ClubScheduleViewer';
import { ClubRules } from './ClubRules';
import { IntensiveArchive } from './IntensiveArchive';
import { AccountSettings } from '@/components/profile/AccountSettings';
import { ResidentReferrals } from '@/components/referrals/ResidentReferrals';
import { RewardsShop } from './RewardsShop';

export const ClubResidentDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState('schedule');

  return (
    <div className="w-full">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        {/* Navigation Tabs */}
        <div className="mb-6 overflow-x-auto">
          <TabsList className="flex w-max min-w-full h-auto p-1 gap-1 bg-muted/50">
            <TabsTrigger 
              value="schedule" 
              className="flex flex-col items-center gap-1 text-xs px-4 py-3 min-w-[70px] flex-shrink-0 text-gray-300 hover:text-white data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-colors"
            >
              <Calendar className="w-4 h-4" />
              <span className="whitespace-nowrap">Расписание</span>
            </TabsTrigger>
            
            <TabsTrigger 
              value="rules" 
              className="flex flex-col items-center gap-1 text-xs px-4 py-3 min-w-[70px] flex-shrink-0 text-gray-300 hover:text-white data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-colors"
            >
              <Shield className="w-4 h-4" />
              <span className="whitespace-nowrap">Правила</span>
            </TabsTrigger>
            
            <TabsTrigger 
              value="archive" 
              className="flex flex-col items-center gap-1 text-xs px-4 py-3 min-w-[70px] flex-shrink-0 text-gray-300 hover:text-white data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-colors"
            >
              <Archive className="w-4 h-4" />
              <span className="whitespace-nowrap">Архив</span>
            </TabsTrigger>

            <TabsTrigger 
              value="rewards" 
              className="flex flex-col items-center gap-1 text-xs px-4 py-3 min-w-[70px] flex-shrink-0 text-gray-300 hover:text-white data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-colors"
            >
              <Gift className="w-4 h-4" />
              <span className="whitespace-nowrap">Награды</span>
            </TabsTrigger>

            <TabsTrigger 
              value="referrals" 
              className="flex flex-col items-center gap-1 text-xs px-4 py-3 min-w-[70px] flex-shrink-0 text-gray-300 hover:text-white data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-colors"
            >
              <Share2 className="w-4 h-4" />
              <span className="whitespace-nowrap">Рефералы</span>
            </TabsTrigger>
            
            <TabsTrigger 
              value="settings" 
              className="flex flex-col items-center gap-1 text-xs px-4 py-3 min-w-[70px] flex-shrink-0 text-gray-300 hover:text-white data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-colors"
            >
              <User className="w-4 h-4" />
              <span className="whitespace-nowrap">Профиль</span>
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Tab Content */}
        <TabsContent value="schedule" className="mt-0">
          <ClubScheduleViewer />
        </TabsContent>
        
        <TabsContent value="rules" className="mt-0">
          <ClubRules />
        </TabsContent>
        
        <TabsContent value="archive" className="mt-0">
          <IntensiveArchive />
        </TabsContent>

        <TabsContent value="rewards" className="mt-0">
          <RewardsShop />
        </TabsContent>

        <TabsContent value="referrals" className="mt-0">
          <ResidentReferrals />
        </TabsContent>
        
        <TabsContent value="settings" className="mt-0">
          <AccountSettings />
        </TabsContent>
      </Tabs>
    </div>
  );
};
