import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users } from 'lucide-react';

export const ParticipantManagement: React.FC = () => {
  return (
    <Card className="kamp-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-kamp-accent">
          <Users className="w-5 h-5" />
          Управление участниками
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-center text-gray-400 py-8">
          <Users className="w-16 h-16 mx-auto mb-4 text-kamp-accent/50" />
          <h3 className="text-lg font-semibold mb-2">Модуль в разработке</h3>
          <p className="text-sm">
            Здесь будут инструменты для управления участниками программы
          </p>
        </div>
      </CardContent>
    </Card>
  );
};