import React, { useEffect, useState, lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useRole } from '@/hooks/useRole';
import { useIsMobile } from '@/hooks/use-mobile';
import { Layout } from '@/components/Layout';
import { ProfileCompletionWizard } from '@/components/profile/ProfileCompletionWizard';
import { WelcomeBanner } from '@/components/dashboard/WelcomeBanner';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LogOut, User, Shield, Activity, Calendar, Trophy, Loader2, BookOpen } from 'lucide-react';
import { HomeworkUserView } from '@/components/dashboard/HomeworkUserView';
import { supabase } from '@/integrations/supabase/client';

// Ленивая загрузка компонентов для улучшения производительности
const KampSystemUser = lazy(() => import('@/components/kamp/KampSystemUser').then(m => ({ default: m.KampSystemUser })));
const AdminDashboard = lazy(() => import('@/components/admin/AdminDashboard').then(m => ({ default: m.AdminDashboard })));
const CooperTestManagement = lazy(() => import('@/components/cooper/CooperTestManagement').then(m => ({ default: m.CooperTestManagement })));
const ScheduleViewer = lazy(() => import('@/components/schedule/ScheduleViewer').then(m => ({ default: m.ScheduleViewer })));
const EnhancedPersonalProfile = lazy(() => import('@/components/profile/EnhancedPersonalProfile').then(m => ({ default: m.EnhancedPersonalProfile })));
const DetailedLeaderboard = lazy(() => import('@/components/leaderboard/DetailedLeaderboard').then(m => ({ default: m.DetailedLeaderboard })));
const ResidentDashboard = lazy(() => import('@/components/dashboard/ResidentDashboard').then(m => ({ default: m.ResidentDashboard })));

// Компонент загрузки для Suspense
const LoadingFallback = () => (
  <div className="flex items-center justify-center py-12">
    <Loader2 className="w-8 h-8 animate-spin text-kamp-accent" />
  </div>
);

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
        // Параллельная загрузка профиля и контрактных данных
        const [profileResult, contractResult] = await Promise.all([
          supabase.from('profiles').select('*').eq('user_id', user.id).maybeSingle(),
          supabase.from('contract_data').select('*').eq('user_id', user.id).maybeSingle()
        ]);

        if (profileResult.error) {
          console.error('Error loading profile data:', profileResult.error);
          return;
        }

        const data = profileResult.data;
        const contract = contractResult.data;

        setParticipantData(data);
        setContractData(contract);

        // Club residents and alumni don't need to fill wizard - they already completed intensive
        const isExistingMember = data?.participant_status === 'club_resident' || 
          data?.participant_status === 'alumni' ||
          data?.participant_status === 'intensive_completed';
        
        if (isExistingMember) {
          // Existing members skip the wizard
          setProfileComplete(true);
          setCheckingProfile(false);
          return;
        }

        // For new intensive participants, check if required fields are filled
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
        // On error, don't block existing users
        setProfileComplete(true);
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

  // Reload profile data after wizard completion
  const reloadProfileData = async () => {
    if (!user) return;
    try {
      const [profileResult, contractResult] = await Promise.all([
        supabase.from('profiles').select('*').eq('user_id', user.id).maybeSingle(),
        supabase.from('contract_data').select('*').eq('user_id', user.id).maybeSingle()
      ]);
      
      if (profileResult.data) {
        setParticipantData(profileResult.data);
      }
      if (contractResult.data) {
        setContractData(contractResult.data);
      }
      setProfileComplete(true);
    } catch (error) {
      console.error('Error reloading profile:', error);
      setProfileComplete(true);
    }
  };

  // Show profile completion wizard for non-admins with incomplete profiles
  if (!isSuperAdmin && profileComplete === false) {
    return (
      <Layout>
        <ProfileCompletionWizard 
          onComplete={reloadProfileData} 
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
            <Suspense fallback={<LoadingFallback />}>
              {isSuperAdmin ? <AdminDashboard /> : <>
                {participantData?.participant_status === 'intensive_active' && (
                  <WelcomeBanner 
                    firstName={participantData?.first_name}
                    profileData={participantData}
                  />
                )}
                <ResidentDashboard profile={participantData} />
              </>}
            </Suspense>
          </div>
        </section>
      </div>
    </Layout>;
};
