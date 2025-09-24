import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Target } from 'lucide-react';

export const AsceticManagement: React.FC = () => {
  return (
    <Card className="bg-white border-gray-300">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-gray-900">
          <Target className="w-5 h-5 text-kamp-accent" />
          Управление аскезами
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-center text-gray-400 py-8">
          <Target className="w-16 h-16 mx-auto mb-4 text-kamp-accent/50" />
          <h3 className="text-lg font-semibold mb-2">Система аскез в разработке</h3>
          <p className="text-sm">
            Здесь будет система управления аскезами для участников
          </p>
        </div>
      </CardContent>
    </Card>
  );
};