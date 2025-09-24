import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Target } from 'lucide-react';

export const DirectionProgress: React.FC = () => {
  return (
    <Card className="kamp-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-kamp-accent">
          <Target className="w-5 h-5" />
          Прогресс по направлениям
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-center text-gray-400 py-8">
          <Target className="w-16 h-16 mx-auto mb-4 text-kamp-accent/50" />
          <h3 className="text-lg font-semibold mb-2">Прогресс в разработке</h3>
          <p className="text-sm">
            Здесь будет отображаться ваш прогресс по всем направлениям КЭМП
          </p>
        </div>
      </CardContent>
    </Card>
  );
};