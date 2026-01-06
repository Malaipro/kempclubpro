import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useRole } from '@/hooks/useRole';
import { useIsMobile } from '@/hooks/use-mobile';
import { Layout } from '@/components/Layout';
import { KampSystemUser } from '@/components/kamp/KampSystemUser';
import { AdminDashboard } from '@/components/admin/AdminDashboard';
import { CooperTestManagement } from '@/components/cooper/CooperTestManagement';
import { ScheduleViewer } from '@/components/schedule/ScheduleViewer';
import { EnhancedPersonalProfile } from '@/components/profile/EnhancedPersonalProfile';
import { DetailedLeaderboard } from '@/components/leaderboard/DetailedLeaderboard';
import { UserActivities } from '@/components/leaderboard/UserActivities';
import { ClubResidentDashboard } from '@/components/club/ClubResidentDashboard';
import { ProfileCompletionWizard } from '@/components/profile/ProfileCompletionWizard';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LogOut, User, Shield, Activity, Calendar, Trophy } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const {
    user,
    signOut,
    loading
  } = useAuth();
  const {
    isSuperAdmin,
    loading: roleLoading
  } = useRole();
  const isMobile = useIsMobile();
  const [participantData, setParticipantData] = useState<any>(null);
  const [contractData, setContractData] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('kamp');
  const [profileComplete, setProfileComplete] = useState<boolean | null>(null);
  const [checkingProfile, setCheckingProfile] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    const loadParticipantData = async () => {
      if (!user) return;
      try {
        const {
          data,
          error
        } = await supabase.from('profiles').select('*').eq('user_id', user.id).maybeSingle();
        if (error) {
          console.error('Error loading profile data:', error);
          return;
        }
        setParticipantData(data);

        // Check if profile is complete (for non-admins)
        const { data: contract } = await supabase
          .from('contract_data')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();
        
        setContractData(contract);

        // Check if required fields are filled
        const hasRequiredProfileFields = data?.first_name && 
          data?.last_name && 
          data?.phone && 
          data?.date_of_birth &&
          data?.personal_data_consent;

        const hasRequiredContractFields = contract?.passport_series &&
          contract?.passport_number &&
          contract?.passport_issued_by &&
          contract?.passport_issued_date &&
          contract?.passport_department_code &&
          contract?.registration_address;

        setProfileComplete(!!(hasRequiredProfileFields && hasRequiredContractFields));
        setCheckingProfile(false);
      } catch (error) {
        console.error('Error in loadParticipantData:', error);
        setCheckingProfile(false);
      }
    };
    if (user) {
      loadParticipantData();
    }
  }, [user]);
  if (loading || roleLoading || checkingProfile) {
    return <Layout>
        <div className="kamp-section bg-black min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-kamp-accent"></div>
        </div>
      </Layout>;
  }
  if (!user) {
    return null;
  }

  // Show profile completion wizard for non-admins with incomplete profiles
  if (!isSuperAdmin && profileComplete === false) {
    return (
      <Layout>
        <ProfileCompletionWizard 
          onComplete={() => {
            setProfileComplete(true);
            // Reload data
            window.location.reload();
          }} 
        />
      </Layout>
    );
  }

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };
  const displayName = participantData?.display_name || [participantData?.first_name, participantData?.last_name].filter(Boolean).join(' ') || user.user_metadata?.display_name as string | undefined || [user.user_metadata?.first_name, user.user_metadata?.last_name].filter(Boolean).join(' ') || user.email || 'Пользователь';
  
  // Check if user is a club resident
  const isClubResident = participantData?.participant_status === 'club_resident';
  
  return <Layout>
      <div className="bg-black">
        {/* Dashboard Header */}
        <section className="kamp-section bg-gradient-to-b from-black to-gray-900">
          <div className="kamp-container">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center space-x-3 min-w-0 flex-1">
                <div className={`${isMobile ? 'w-10 h-10' : 'w-12 h-12'} bg-kamp-accent/20 rounded-full flex items-center justify-center flex-shrink-0`}>
                  <User className={`${isMobile ? 'w-5 h-5' : 'w-6 h-6'} text-kamp-accent`} />
                </div>
                <div className="min-w-0 flex-1">
                  <h1 className={`${isMobile ? 'text-lg' : 'text-xl sm:text-2xl'} font-bold text-white truncate`}>
                    {isClubResident ? 'Мужской клуб' : 'Личный кабинет'}
                  </h1>
                  <p className={`text-gray-400 ${isMobile ? 'text-xs' : 'text-sm sm:text-base'}`}>
                    <span className="truncate inline-block max-w-full">
                      {displayName} • <span className="truncate">{participantData?.email || user.email}</span>
                    </span>
                    {isSuperAdmin && <span className="ml-2 text-kamp-accent font-semibold whitespace-nowrap">(Супер админ)</span>}
                    {isClubResident && <span className="ml-2 text-purple-400 font-semibold whitespace-nowrap">(Резидент клуба)</span>}
                  </p>
                </div>
              </div>

              <Button onClick={handleSignOut} variant="outline" size={isMobile ? "sm" : "default"} className="border-kamp-accent text-kamp-accent hover:bg-kamp-accent hover:text-black flex-shrink-0">
                <LogOut className="w-4 h-4 mr-1" />
                <span className={isMobile ? "text-xs" : ""}>{isMobile ? "Выход" : "Выйти"}</span>
              </Button>
            </div>
          </div>
        </section>

        {/* Dashboard Content */}
        <section className="kamp-section">
          <div className="kamp-container">
            {isSuperAdmin ? <AdminDashboard /> : isClubResident ? <ClubResidentDashboard /> : <Tabs defaultValue="profile" className="w-full">
                <div className="mb-6">
                  <TabsList className={`grid w-full ${isMobile ? 'grid-cols-3' : 'grid-cols-5'} h-auto p-1 gap-1`}>
                    <TabsTrigger value="profile" className={`flex ${isMobile ? 'flex-col' : 'flex-col'} items-center gap-1 ${isMobile ? 'text-xs px-2 py-2' : 'text-xs px-2 py-3'}`}>
                      <User className="w-4 h-4" />
                      <span className="text-center">Профиль</span>
                    </TabsTrigger>
                    <TabsTrigger value="kamp" className={`flex ${isMobile ? 'flex-col' : 'flex-col'} items-center gap-1 ${isMobile ? 'text-xs px-2 py-2' : 'text-xs px-2 py-3'}`}>
                      <Activity className="w-4 h-4" />
                      <span className="text-center">{isMobile ? 'КЭМП' : 'КЭМП'}</span>
                    </TabsTrigger>
                    <TabsTrigger value="leaderboard" className={`flex ${isMobile ? 'flex-col' : 'flex-col'} items-center gap-1 ${isMobile ? 'text-xs px-2 py-2' : 'text-xs px-2 py-3'}`}>
                      <Trophy className="w-4 h-4" />
                      <span className="text-center">Рейтинг</span>
                    </TabsTrigger>
                    {!isMobile && <>
                        
                        <TabsTrigger value="schedule" className="flex flex-col items-center gap-1 text-xs px-2 py-3">
                          <Calendar className="w-4 h-4" />
                          <span className="text-center">Расписание</span>
                        </TabsTrigger>
                      </>}
                  </TabsList>
                  
                  {isMobile && <TabsList className="grid w-full grid-cols-2 h-auto p-1 gap-1 mt-2">
                      <TabsTrigger value="cooper" className="flex flex-row items-center gap-1 text-xs px-3 py-2">
                        <Shield className="w-4 h-4" />
                        <span className="text-center">Купер</span>
                      </TabsTrigger>
                      <TabsTrigger value="schedule" className="flex flex-row items-center gap-1 text-xs px-3 py-2">
                        <Calendar className="w-4 h-4" />
                        <span className="text-center">Расписание</span>
                      </TabsTrigger>
                    </TabsList>}
                </div>
                
                <TabsContent value="profile">
                  <div className="space-y-6">
                    <EnhancedPersonalProfile />
                  </div>
                </TabsContent>
                
                <TabsContent value="kamp">
                  <KampSystemUser />
                </TabsContent>
                
                <TabsContent value="leaderboard">
                  <DetailedLeaderboard />
                </TabsContent>
                
                <TabsContent value="cooper">
                  <CooperTestManagement />
                </TabsContent>
                
                <TabsContent value="schedule">
                  <ScheduleViewer isClubResident={isClubResident} />
                </TabsContent>
              </Tabs>}
          </div>
        </section>
      </div>
    </Layout>;
};