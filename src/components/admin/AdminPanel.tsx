import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield } from 'lucide-react';
import { useRole } from '@/hooks/useRole';

export const AdminPanel: React.FC = () => {
  const { isAdmin, loading } = useRole();

  if (loading) {
    return (
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-kamp-accent mx-auto"></div>
        <p className="text-gray-400 mt-4">Проверка прав доступа...</p>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <Card className="kamp-card">
        <CardContent className="text-center py-8">
          <Shield className="w-16 h-16 mx-auto mb-4 text-red-400" />
          <h3 className="text-lg font-semibold mb-2">Доступ запрещен</h3>
          <p className="text-gray-400">У вас нет прав для просмотра панели администратора</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="kamp-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-kamp-accent">
          <Shield className="w-5 h-5" />
          Панель администратора
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-center text-gray-400 py-8">
          <Shield className="w-16 h-16 mx-auto mb-4 text-kamp-accent/50" />
          <h3 className="text-lg font-semibold mb-2">Панель в разработке</h3>
          <p className="text-sm">
            Здесь будут инструменты для управления участниками и программой КЭМП
          </p>
        </div>
      </CardContent>
    </Card>
  );
};