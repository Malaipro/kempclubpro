import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Trophy } from 'lucide-react';

export const KampProgress: React.FC = () => {
  return (
    <Card className="bg-white border-gray-300">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-gray-900">
          <Trophy className="w-5 h-5 text-kamp-accent" />
          Прогресс КЭМП
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-center text-gray-400 py-8">
          <Trophy className="w-16 h-16 mx-auto mb-4 text-kamp-accent/50" />
          <h3 className="text-lg font-semibold mb-2">Система прогресса в разработке</h3>
          <p className="text-sm">
            Здесь будет отображаться ваш прогресс по системе КЭМП
          </p>
        </div>
      </CardContent>
    </Card>
  );
};