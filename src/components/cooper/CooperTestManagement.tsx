import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Activity } from 'lucide-react';

export const CooperTestManagement: React.FC = () => {
  return (
    <Card className="bg-white border-gray-300">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-gray-900">
          <Activity className="w-5 h-5 text-kamp-accent" />
          Тест Купера
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-center text-gray-400 py-8">
          <Activity className="w-16 h-16 mx-auto mb-4 text-kamp-accent/50" />
          <h3 className="text-lg font-semibold mb-2">Тест Купера в разработке</h3>
          <p className="text-sm">
            Здесь будет система управления результатами теста Купера
          </p>
        </div>
      </CardContent>
    </Card>
  );
};