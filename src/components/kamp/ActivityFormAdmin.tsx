import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus } from 'lucide-react';

export const ActivityFormAdmin: React.FC = () => {
  return (
    <Card className="bg-white border-gray-300">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-gray-900">
          <Plus className="w-5 h-5 text-kamp-accent" />
          Управление активностью участников
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-center text-gray-400 py-8">
          <Plus className="w-16 h-16 mx-auto mb-4 text-kamp-accent/50" />
          <h3 className="text-lg font-semibold mb-2">Админ-панель в разработке</h3>
          <p className="text-sm">
            Здесь будут инструменты для управления активностью участников
          </p>
        </div>
      </CardContent>
    </Card>
  );
};