import React, { useState, lazy, Suspense } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Home, User, BookOpen, FileText, Calendar, Activity, Gift, Share2 } from 'lucide-react';
import { ResidentOverview } from './ResidentOverview';
import { HomeworkUserView } from './HomeworkUserView';
import { MaterialsViewer } from '@/components/materials/MaterialsViewer';

const EnhancedPersonalProfile = lazy(() => import('@/components/profile/EnhancedPersonalProfile').then(m => ({ default: m.EnhancedPersonalProfile })));
const ScheduleViewer = lazy(() => import('@/components/schedule/ScheduleViewer').then(m => ({ default: m.ScheduleViewer })));
const KampSystemUser = lazy(() => import('@/components/kamp/KampSystemUser').then(m => ({ default: m.KampSystemUser })));
const RewardsShop = lazy(() => import('@/components/club/RewardsShop').then(m => ({ default: m.RewardsShop })));
const ResidentReferrals = lazy(() => import('@/components/referrals/ResidentReferrals').then(m => ({ default: m.ResidentReferrals })));

const LoadingFallback = () => (
  <div className="flex items-center justify-center py-12">
    <Loader2 className="w-8 h-8 animate-spin text-kamp-accent" />
  </div>
);

interface ResidentDashboardProps {
  profile: any;
}

const TAB_TRIGGER_CLASS = 'flex flex-col items-center gap-1 text-xs px-4 py-3 min-w-[70px] flex-shrink-0 text-gray-300 hover:text-white data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-colors';

export const ResidentDashboard: React.FC<ResidentDashboardProps> = ({ profile }) => {
  const [activeTab, setActiveTab] = useState('overview');
  const isClubResident = profile?.participant_status === 'club_resident';

  const tabs = [
    { value: 'overview', label: 'Главная', icon: Home },
    { value: 'profile', label: 'Профиль', icon: User },
    { value: 'homework', label: 'ДЗ', icon: BookOpen },
    { value: 'materials', label: 'Материалы', icon: FileText },
    { value: 'schedule', label: 'Расписание', icon: Calendar },
    { value: 'progress', label: 'Прогресс', icon: Activity },
    { value: 'rewards', label: 'Награды', icon: Gift },
    { value: 'referrals', label: 'Рефералы', icon: Share2 },
  ];

  return (
    <div className="w-full">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="mb-6 overflow-x-auto">
          <TabsList className="flex w-max min-w-full h-auto p-1 gap-1 bg-muted/50">
            {tabs.map(({ value, label, icon: Icon }) => (
              <TabsTrigger key={value} value={value} className={TAB_TRIGGER_CLASS}>
                <Icon className="w-4 h-4" />
                <span className="whitespace-nowrap">{label}</span>
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        <TabsContent value="overview" className="mt-0">
          <ResidentOverview profile={profile} onNavigate={setActiveTab} />
        </TabsContent>

        <TabsContent value="profile" className="mt-0">
          <Suspense fallback={<LoadingFallback />}>
            <EnhancedPersonalProfile />
          </Suspense>
        </TabsContent>

        <TabsContent value="homework" className="mt-0">
          <HomeworkUserView />
        </TabsContent>

        <TabsContent value="materials" className="mt-0">
          <MaterialsViewer />
        </TabsContent>

        <TabsContent value="schedule" className="mt-0">
          <Suspense fallback={<LoadingFallback />}>
            <ScheduleViewer isClubResident={isClubResident} />
          </Suspense>
        </TabsContent>

        <TabsContent value="progress" className="mt-0">
          <Suspense fallback={<LoadingFallback />}>
            <KampSystemUser />
          </Suspense>
        </TabsContent>

        <TabsContent value="rewards" className="mt-0">
          <Suspense fallback={<LoadingFallback />}>
            <RewardsShop />
          </Suspense>
        </TabsContent>

        <TabsContent value="referrals" className="mt-0">
          <Suspense fallback={<LoadingFallback />}>
            <ResidentReferrals />
          </Suspense>
        </TabsContent>
      </Tabs>
    </div>
  );
};
