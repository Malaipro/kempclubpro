import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Shield, 
  Users, 
  Settings, 
  FileText, 
  Activity,
  AlertTriangle,
  UserCheck,
  Database,
  Target
} from 'lucide-react';
import { useRole } from '@/hooks/useRole';

// Import admin components
import { EnhancedParticipantManagement } from '@/components/admin/EnhancedParticipantManagement';
import { SecurityEnhancements } from '@/components/security/SecurityEnhancements';
import { SecurityAuditLog } from '@/components/admin/SecurityAuditLog';
import { TestimonialConsentManager } from '@/components/admin/TestimonialConsentManager';
import { TestimonialManagement } from '@/components/admin/TestimonialManagement';
import { StreamManagement } from '@/components/admin/StreamManagement';
import { HabitsManagement } from '@/components/admin/HabitsManagement';
import { AsceticTypesManagement } from '@/components/admin/AsceticTypesManagement';
import { TotemAssignment } from '@/components/admin/TotemAssignment';
import { CrashTestManagement } from '@/components/admin/CrashTestManagement';
import { TrainingSessionManagement } from '@/components/admin/TrainingSessionManagement';

interface TabConfig {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  requiresSuperAdmin?: boolean;
}

const adminTabs: TabConfig[] = [
  { 
    id: 'participants', 
    label: 'Участники', 
    icon: Users,
    description: 'Управление участниками программы'
  },
  { 
    id: 'testimonials', 
    label: 'Отзывы', 
    icon: FileText,
    description: 'Управление отзывами участников'
  },
  { 
    id: 'streams', 
    label: 'Потоки', 
    icon: Activity,
    description: 'Управление потоками обучения'
  },
  { 
    id: 'habits', 
    label: 'Привычки', 
    icon: Target,
    description: 'Управление привычками участников'
  },
  { 
    id: 'activities', 
    label: 'Активности', 
    icon: Activity,
    description: 'Добавление тренировок и краштестов'
  },
  { 
    id: 'ascetic-types', 
    label: 'Типы аскез', 
    icon: Settings,
    description: 'Управление типами аскез',
    requiresSuperAdmin: true
  },
  { 
    id: 'security', 
    label: 'Безопасность', 
    icon: Shield,
    description: 'Мониторинг безопасности системы',
    requiresSuperAdmin: true
  },
  { 
    id: 'security-audit', 
    label: 'Аудит безопасности', 
    icon: Database,
    description: 'Журнал событий безопасности',
    requiresSuperAdmin: true
  },
  { 
    id: 'testimonial-consent', 
    label: 'GDPR Согласия', 
    icon: UserCheck,
    description: 'Управление согласиями на обработку данных',
    requiresSuperAdmin: true
  }
];

export const EnhancedAdminPanel: React.FC = () => {
  const { isAdmin, isSuperAdmin, loading } = useRole();
  const [activeTab, setActiveTab] = useState('participants');

  if (loading) {
    return (
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
        <p className="text-muted-foreground mt-4">Проверка прав доступа...</p>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <Card className="bg-card">
        <CardContent className="text-center py-8">
          <Shield className="w-16 h-16 mx-auto mb-4 text-destructive" />
          <h3 className="text-lg font-semibold mb-2">Доступ запрещен</h3>
          <p className="text-muted-foreground">У вас нет прав для просмотра панели администратора</p>
        </CardContent>
      </Card>
    );
  }

  // Filter tabs based on user permissions
  const availableTabs = adminTabs.filter(tab => 
    !tab.requiresSuperAdmin || isSuperAdmin
  );

  // Ensure active tab is available to current user
  const currentTab = availableTabs.find(tab => tab.id === activeTab);
  if (!currentTab) {
    setActiveTab(availableTabs[0]?.id || 'participants');
  }

  const renderTabContent = () => {
    switch (activeTab) {
      case 'participants':
        return <EnhancedParticipantManagement />;
      case 'testimonials':
        return <TestimonialManagement />;
      case 'streams':
        return <StreamManagement />;
      case 'habits':
        return <HabitsManagement />;
      case 'activities':
        return (
          <div className="grid gap-6 md:grid-cols-2">
            <TrainingSessionManagement />
            <CrashTestManagement />
            <div className="md:col-span-2">
              <TotemAssignment />
            </div>
          </div>
        );
      case 'ascetic-types':
        return <AsceticTypesManagement />;
      case 'security':
        return <SecurityEnhancements />;
      case 'security-audit':
        return <SecurityAuditLog />;
      case 'testimonial-consent':
        return <TestimonialConsentManager />;
      default:
        return (
          <div className="text-center py-8">
            <AlertTriangle className="w-16 h-16 mx-auto mb-4 text-warning" />
            <h3 className="text-lg font-semibold mb-2">Раздел в разработке</h3>
            <p className="text-muted-foreground">Этот раздел будет доступен в ближайшее время</p>
          </div>
        );
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Панель администратора</h1>
          <p className="text-muted-foreground mt-1">
            Управление системой КЭМП
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant="secondary">
            {isAdmin && 'Администратор'}
          </Badge>
          {isSuperAdmin && (
            <Badge variant="default">
              Суперадминистратор
            </Badge>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Navigation Sidebar */}
        <div className="lg:col-span-1">
          <Card className="bg-card">
            <CardHeader>
              <CardTitle className="text-sm font-medium">Разделы</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <nav className="space-y-1">
                {availableTabs.map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;
                  
                  return (
                    <Button
                      key={tab.id}
                      variant={isActive ? 'secondary' : 'ghost'}
                      className={`w-full justify-start text-left h-auto p-4 ${
                        isActive 
                          ? 'bg-secondary text-secondary-foreground' 
                          : 'hover:bg-secondary/50'
                      }`}
                      onClick={() => setActiveTab(tab.id)}
                    >
                      <div className="flex items-start space-x-3">
                        <Icon className={`w-5 h-5 mt-0.5 flex-shrink-0 ${
                          isActive ? 'text-secondary-foreground' : 'text-muted-foreground'
                        }`} />
                        <div className="flex-1 min-w-0">
                          <div className={`font-medium ${
                            isActive ? 'text-secondary-foreground' : 'text-foreground'
                          }`}>
                            {tab.label}
                            {tab.requiresSuperAdmin && (
                              <Badge variant="outline" className="ml-2 text-xs">
                                Super Admin
                              </Badge>
                            )}
                          </div>
                          <p className={`text-xs mt-1 ${
                            isActive ? 'text-secondary-foreground/70' : 'text-muted-foreground'
                          }`}>
                            {tab.description}
                          </p>
                        </div>
                      </div>
                    </Button>
                  );
                })}
              </nav>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <div className="lg:col-span-3">
          <Card className="bg-card min-h-[600px]">
            <CardContent className="p-6">
              {renderTabContent()}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};