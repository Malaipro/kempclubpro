import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { User, Activity, Users, Layers, Zap, Calendar, Settings, MessageSquare, Camera, FileText } from 'lucide-react';
import { ContentManager } from '@/components/cms/ContentManager';
import { ActivityManagement } from './ActivityManagement';
import { EnhancedCooperTest } from '@/components/cooper/EnhancedCooperTest';
import { EnhancedParticipantManagement } from '@/components/admin/EnhancedParticipantManagement';
import { EnhancedStreamManagement } from '@/components/admin/EnhancedStreamManagement';
import { DetailedScheduleManagement } from '@/components/schedule/DetailedScheduleManagement';
import { TestimonialManagement } from './TestimonialManagement';
import { MomentsManagement } from './MomentsManagement';
import { ContentBlocksManagement } from './ContentBlocksManagement';
import { KampSystem } from '@/components/kamp';

export const AdminDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState('kamp');

  return (
    <div className="w-full">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        {/* Navigation Tabs */}
        <div className="mb-6 overflow-x-auto">
          <TabsList className="flex w-max min-w-full h-auto p-1 gap-1 bg-muted/50">
            <TabsTrigger 
              value="kamp" 
              className="flex flex-col items-center gap-1 text-xs px-4 py-3 min-w-[70px] flex-shrink-0 text-gray-300 hover:text-white data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-colors"
            >
              <User className="w-4 h-4" />
              <span className="whitespace-nowrap">КЭМП</span>
            </TabsTrigger>
            
            <TabsTrigger 
              value="activities" 
              className="flex flex-col items-center gap-1 text-xs px-4 py-3 min-w-[70px] flex-shrink-0 text-gray-300 hover:text-white data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-colors"
            >
              <Activity className="w-4 h-4" />
              <span className="whitespace-nowrap">Актив.</span>
            </TabsTrigger>
            
            <TabsTrigger 
              value="participants" 
              className="flex flex-col items-center gap-1 text-xs px-4 py-3 min-w-[70px] flex-shrink-0 text-gray-300 hover:text-white data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-colors"
            >
              <Users className="w-4 h-4" />
              <span className="whitespace-nowrap">Участн.</span>
            </TabsTrigger>
            
            <TabsTrigger 
              value="streams" 
              className="flex flex-col items-center gap-1 text-xs px-4 py-3 min-w-[70px] flex-shrink-0 text-gray-300 hover:text-white data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-colors"
            >
              <Layers className="w-4 h-4" />
              <span className="whitespace-nowrap">Потоки</span>
            </TabsTrigger>
            
            <TabsTrigger 
              value="cooper" 
              className="flex flex-col items-center gap-1 text-xs px-4 py-3 min-w-[70px] flex-shrink-0 text-gray-300 hover:text-white data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-colors"
            >
              <Zap className="w-4 h-4" />
              <span className="whitespace-nowrap">Купер</span>
            </TabsTrigger>
            
            <TabsTrigger 
              value="schedule" 
              className="flex flex-col items-center gap-1 text-xs px-4 py-3 min-w-[70px] flex-shrink-0 text-gray-300 hover:text-white data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-colors"
            >
              <Calendar className="w-4 h-4" />
              <span className="whitespace-nowrap">Расписан.</span>
            </TabsTrigger>
            
            <TabsTrigger 
              value="testimonials" 
              className="flex flex-col items-center gap-1 text-xs px-4 py-3 min-w-[70px] flex-shrink-0 text-gray-300 hover:text-white data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-colors"
            >
              <MessageSquare className="w-4 h-4" />
              <span className="whitespace-nowrap">Отзывы</span>
            </TabsTrigger>
            
            <TabsTrigger 
              value="moments" 
              className="flex flex-col items-center gap-1 text-xs px-4 py-3 min-w-[70px] flex-shrink-0 text-gray-300 hover:text-white data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-colors"
            >
              <Camera className="w-4 h-4" />
              <span className="whitespace-nowrap">Моменты</span>
            </TabsTrigger>
            
            <TabsTrigger 
              value="content" 
              className="flex flex-col items-center gap-1 text-xs px-4 py-3 min-w-[70px] flex-shrink-0 text-gray-300 hover:text-white data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-colors"
            >
              <FileText className="w-4 h-4" />
              <span className="whitespace-nowrap">Контент</span>
            </TabsTrigger>
            
            <TabsTrigger 
              value="cms" 
              className="flex flex-col items-center gap-1 text-xs px-4 py-3 min-w-[70px] flex-shrink-0 text-gray-300 hover:text-white data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-colors"
            >
              <Settings className="w-4 h-4" />
              <span className="whitespace-nowrap">Старая CMS</span>
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Tab Content */}
        <TabsContent value="kamp" className="mt-0">
          <KampSystem />
        </TabsContent>
        
        <TabsContent value="activities" className="mt-0">
          <ActivityManagement />
        </TabsContent>
        
        <TabsContent value="participants" className="mt-0">
          <EnhancedParticipantManagement />
        </TabsContent>
        
        <TabsContent value="streams" className="mt-0">
          <EnhancedStreamManagement />
        </TabsContent>
        
        <TabsContent value="cooper" className="mt-0">
          <EnhancedCooperTest />
        </TabsContent>
        
        <TabsContent value="schedule" className="mt-0">
          <DetailedScheduleManagement />
        </TabsContent>
        
        <TabsContent value="testimonials" className="mt-0">
          <TestimonialManagement />
        </TabsContent>
        
        <TabsContent value="moments" className="mt-0">
          <MomentsManagement />
        </TabsContent>
        
        <TabsContent value="content" className="mt-0">
          <ContentBlocksManagement />
        </TabsContent>
        
        <TabsContent value="cms" className="mt-0">
          <ContentManager />
        </TabsContent>
      </Tabs>
    </div>
  );
};