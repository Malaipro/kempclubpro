import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useRole } from '@/hooks/useRole';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, User, Calendar, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface AuditLogEntry {
  id: string;
  user_id: string;
  role_assigned: string;
  assigned_by: string;
  assigned_at: string;
  action: string;
  notes?: string;
  assigner_profile?: {
    display_name: string;
  };
  recipient_profile?: {
    display_name: string;
  };
}

export const SecurityAuditLog: React.FC = () => {
  const { isSuperAdmin, loading: roleLoading } = useRole();
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!roleLoading && isSuperAdmin) {
      fetchAuditLogs();
    }
  }, [isSuperAdmin, roleLoading]);

  const fetchAuditLogs = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('role_audit_log')
        .select('*')
        .order('assigned_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('Error fetching audit logs:', error);
        toast.error('Ошибка загрузки журнала аудита');
        return;
      }

      // Fetch user profiles separately
      const userIds = [...new Set([
        ...data.map(log => log.user_id),
        ...data.map(log => log.assigned_by)
      ])];

      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, display_name')
        .in('user_id', userIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p.display_name]) || []);

      const enrichedLogs = data.map(log => ({
        ...log,
        assigner_profile: { display_name: profileMap.get(log.assigned_by) || 'Неизвестный' },
        recipient_profile: { display_name: profileMap.get(log.user_id) || 'Неизвестный' }
      }));

      setAuditLogs(enrichedLogs);
    } catch (error) {
      console.error('Error in fetchAuditLogs:', error);
      toast.error('Ошибка загрузки журнала аудита');
    } finally {
      setLoading(false);
    }
  };

  if (roleLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">
            <div className="animate-spin w-8 h-8 border-2 border-kamp-accent border-t-transparent rounded-full mx-auto mb-4"></div>
            <p>Проверка прав доступа...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!isSuperAdmin) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-red-600">
            <AlertTriangle className="w-12 h-12 mx-auto mb-4" />
            <p className="font-semibold">Доступ запрещен</p>
            <p className="text-sm">Только супер-администраторы могут просматривать журнал аудита</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getActionIcon = (action: string) => {
    return action === 'GRANTED' ? (
      <Shield className="w-4 h-4 text-green-600" />
    ) : (
      <AlertTriangle className="w-4 h-4 text-red-600" />
    );
  };

  const getActionColor = (action: string) => {
    return action === 'GRANTED' 
      ? 'border-green-200 bg-green-50' 
      : 'border-red-200 bg-red-50';
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-kamp-accent" />
            Журнал аудита ролей
          </CardTitle>
          <Button onClick={fetchAuditLogs} variant="outline" size="sm">
            Обновить
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin w-8 h-8 border-2 border-kamp-accent border-t-transparent rounded-full mx-auto mb-4"></div>
            <p>Загрузка журнала аудита...</p>
          </div>
        ) : auditLogs.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Shield className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <p>Записи аудита отсутствуют</p>
          </div>
        ) : (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {auditLogs.map((log) => (
              <div
                key={log.id}
                className={`p-4 rounded-lg border ${getActionColor(log.action)}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    {getActionIcon(log.action)}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <User className="w-4 h-4 text-gray-600" />
                        <span className="font-semibold">
                          {log.recipient_profile?.display_name || 'Неизвестный пользователь'}
                        </span>
                        <span className="text-sm text-gray-600">
                          {log.action === 'GRANTED' ? 'получил' : 'лишился'} роль
                        </span>
                        <span className="font-semibold text-kamp-accent">
                          {log.role_assigned}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Calendar className="w-4 h-4" />
                        <span>
                          {new Date(log.assigned_at).toLocaleString('ru-RU')}
                        </span>
                        <span>•</span>
                        <span>
                          Выполнил: {log.assigner_profile?.display_name || 'Система'}
                        </span>
                      </div>
                      {log.notes && (
                        <p className="text-sm text-gray-600 mt-2 italic">
                          {log.notes}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};