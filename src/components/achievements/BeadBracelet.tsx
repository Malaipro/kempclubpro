import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Award } from 'lucide-react';

export const BeadBracelet: React.FC = () => {
  return (
    <Card className="kamp-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-kamp-accent">
          <Award className="w-5 h-5" />
          Браслет достижений
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-center text-gray-400 py-8">
          <Award className="w-16 h-16 mx-auto mb-4 text-kamp-accent/50" />
          <h3 className="text-lg font-semibold mb-2">Браслет в разработке</h3>
          <p className="text-sm">
            Здесь будет отображаться ваш браслет достижений КЭМП
          </p>
        </div>
      </CardContent>
    </Card>
  );
};