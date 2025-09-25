import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useRole } from '@/hooks/useRole';
import { Layout } from '@/components/Layout';
import { AdminDashboard } from '@/components/admin/AdminDashboard';
import { KampInstructions } from '@/components/kamp/KampInstructions';
import { KampProgress } from '@/components/kamp/KampProgress';
import { ActivityForm } from '@/components/kamp/ActivityForm';
import { AsceticManagement } from '@/components/kamp/AsceticManagement';
import { ParticipantsList } from '@/components/admin/ParticipantsList';
import { KampManual } from '@/components/instructions/KampManual';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LogOut, User, Shield, Book, Trophy, Plus, Target, Users, FileText } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user, signOut, loading } = useAuth();
  const { isSuperAdmin, loading: roleLoading } = useRole();
  const [participantData, setParticipantData] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('kamp');

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    const loadParticipantData = async () => {
      if (!user) return;
      
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();

        if (error) {
          console.error('Error loading profile data:', error);
          return;
        }

        setParticipantData(data);
      } catch (error) {
        console.error('Error in loadParticipantData:', error);
      }
    };

    if (user) {
      loadParticipantData();
    }
  }, [user]);

  if (loading || roleLoading) {
    return (
      <Layout>
        <div className="kamp-section bg-black min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-kamp-accent"></div>
        </div>
      </Layout>
    );
  }

  if (!user) {
    return null;
  }

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <Layout>
      <div className="bg-black">
        {/* Dashboard Header */}
        <section className="kamp-section bg-gradient-to-b from-black to-gray-900">
          <div className="kamp-container">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center space-x-4 min-w-0 flex-1">
                <div className="w-12 h-12 bg-kamp-accent/20 rounded-full flex items-center justify-center flex-shrink-0">
                  <User className="w-6 h-6 text-kamp-accent" />
                </div>
                <div className="min-w-0 flex-1">
                  <h1 className="text-xl sm:text-2xl font-bold text-white truncate">
                    Личный кабинет
                  </h1>
                  <p className="text-gray-400 text-sm sm:text-base truncate">
                    {user.user_metadata?.name || user.email}
                    {isSuperAdmin && <span className="ml-2 text-kamp-accent font-semibold">(Супер админ)</span>}
                  </p>
                </div>
              </div>

              <Button
                onClick={handleSignOut}
                variant="outline"
                size="sm"
                className="border-kamp-accent text-kamp-accent hover:bg-kamp-accent hover:text-black flex-shrink-0"
              >
                <LogOut className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">Выйти</span>
              </Button>
            </div>
          </div>
        </section>

        {/* Dashboard Content */}
        <section className="kamp-section">
          <div className="kamp-container">
            {isSuperAdmin ? (
              <AdminDashboard />
            ) : (
              <div>
                <div className="section-heading mb-8 text-center">
                  <h2 className="text-gradient">Система КЭМП</h2>
                  <p>Полная система геймификации: инструкции, прогресс, активности и аскезы</p>
                </div>

                <Tabs defaultValue="instructions" className="w-full">
                  <div className="mb-8 overflow-x-auto">
                    <TabsList className="flex w-max min-w-full h-auto gap-1 p-1 bg-gray-800 rounded-lg">
                      <TabsTrigger value="instructions" className="flex flex-col items-center gap-1 text-xs px-3 py-3 min-w-[80px] flex-shrink-0 data-[state=active]:bg-white data-[state=active]:text-black text-white">
                        <Book className="w-4 h-4" />
                        <span className="whitespace-nowrap">Инструкция</span>
                      </TabsTrigger>
                      <TabsTrigger value="progress" className="flex flex-col items-center gap-1 text-xs px-3 py-3 min-w-[80px] flex-shrink-0 data-[state=active]:bg-white data-[state=active]:text-black text-white">
                        <Trophy className="w-4 h-4" />
                        <span className="whitespace-nowrap">Прогресс</span>
                      </TabsTrigger>
                      <TabsTrigger value="activities" className="flex flex-col items-center gap-1 text-xs px-3 py-3 min-w-[80px] flex-shrink-0 data-[state=active]:bg-white data-[state=active]:text-black text-white">
                        <Plus className="w-4 h-4" />
                        <span className="whitespace-nowrap">Активности</span>
                      </TabsTrigger>
                      <TabsTrigger value="ascetics" className="flex flex-col items-center gap-1 text-xs px-3 py-3 min-w-[80px] flex-shrink-0 data-[state=active]:bg-white data-[state=active]:text-black text-white">
                        <Target className="w-4 h-4" />
                        <span className="whitespace-nowrap">Аскезы</span>
                      </TabsTrigger>
                      <TabsTrigger value="participants" className="flex flex-col items-center gap-1 text-xs px-3 py-3 min-w-[80px] flex-shrink-0 data-[state=active]:bg-white data-[state=active]:text-black text-white">
                        <Users className="w-4 h-4" />
                        <span className="whitespace-nowrap">Участники</span>
                      </TabsTrigger>
                      <TabsTrigger value="manual" className="flex flex-col items-center gap-1 text-xs px-3 py-3 min-w-[80px] flex-shrink-0 data-[state=active]:bg-white data-[state=active]:text-black text-white">
                        <FileText className="w-4 h-4" />
                        <span className="whitespace-nowrap">Руководство</span>
                      </TabsTrigger>
                    </TabsList>
                  </div>
                  
                  <TabsContent value="instructions">
                    <KampInstructions />
                  </TabsContent>
                  
                  <TabsContent value="progress">
                    <KampProgress />
                  </TabsContent>
                  
                  <TabsContent value="activities">
                    <ActivityForm />
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
            )}
          </div>
        </section>
      </div>
    </Layout>
  );
};